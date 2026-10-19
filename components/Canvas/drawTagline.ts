import {
  BADGE_CENTRE,
  BADGE_VIEWBOX,
  TAGLINE_BASELINE_RADIUS,
  TAGLINE_CAP_TOP_RADIUS,
  TAGLINE_MAX_SWEEP,
  TAGLINE_START_ANGLE,
} from '../../lib/badge';

const START_ANGLE = (TAGLINE_START_ANGLE * Math.PI) / 180;
const MAX_SWEEP = (TAGLINE_MAX_SWEEP * Math.PI) / 180; // beyond this the font shrinks to fit
const TRACKING = 0.135; // em, matches the original #FREELANCE artwork

export const TAGLINE_FONT = 'Libre Franklin';
export const TAGLINE_FONT_WEIGHT = 600;

export interface TaglineLayout {
  chars: string[];
  offsets: number[];
  capHeight: number;
  midRadius: number;
  sweep: number;
}

/**
 * Lays `text` out along the arc for a badge of `size` pixels. The font fits the height of
 * the band and only shrinks when the text would sweep more than TAGLINE_MAX_SWEEP degrees.
 */
export function layoutTagline(ctx: CanvasRenderingContext2D, text: string, size: number): TaglineLayout {
  const scale = size / BADGE_VIEWBOX;
  const bandHeight = (TAGLINE_BASELINE_RADIUS - TAGLINE_CAP_TOP_RADIUS) * scale;
  const midRadius = ((TAGLINE_BASELINE_RADIUS + TAGLINE_CAP_TOP_RADIUS) / 2) * scale;

  const referenceSize = 100;
  ctx.font = `${TAGLINE_FONT_WEIGHT} ${referenceSize}px "${TAGLINE_FONT}"`;
  const capRatio = ctx.measureText('H').actualBoundingBoxAscent / referenceSize || 0.7;
  let fontSize = bandHeight / capRatio;

  const measure = (fs: number) => {
    ctx.font = `${TAGLINE_FONT_WEIGHT} ${fs}px "${TAGLINE_FONT}"`;
    const tracking = TRACKING * fs;
    const chars = Array.from(text);
    const offsets = chars.map((_, i) => ctx.measureText(chars.slice(0, i).join('')).width + i * tracking);
    const total = ctx.measureText(text).width + (chars.length - 1) * tracking;
    return { chars, offsets, total };
  };

  let layout = measure(fontSize);
  const maxLength = MAX_SWEEP * midRadius;

  if (layout.total > maxLength) {
    fontSize *= maxLength / layout.total;
    layout = measure(fontSize);
  }

  return {
    chars: layout.chars,
    offsets: layout.offsets,
    capHeight: fontSize * capRatio,
    midRadius,
    sweep: layout.total / midRadius,
  };
}

/** Angle (in radians) the text spans on the arc, so the banner can scale to fit it. */
export function taglineSweep(ctx: CanvasRenderingContext2D, text: string, size: number) {
  if (!text) return 0;

  return layoutTagline(ctx, text, size).sweep;
}

/**
 * Draws `text` along the arc of the badge with glyph tops facing the centre. Glyphs are
 * placed one by one; positions come from measuring each prefix so the font's kerning is
 * preserved.
 *
 * `angle` shifts the band around the centre in degrees: positive values move it to the
 * right, negative values to the left. When the text is in the upper half the glyphs are
 * flipped and read in the opposite direction so they stay upright.
 */
export function drawTagline(
  ctx: CanvasRenderingContext2D,
  text: string,
  colour: string,
  size: number,
  angle = 0
) {
  if (!text) return;

  const scale = size / BADGE_VIEWBOX;
  const center = BADGE_CENTRE * scale;
  const { chars, offsets, capHeight, midRadius, sweep } = layoutTagline(ctx, text, size);
  const startAngle = START_ANGLE - (angle * Math.PI) / 180;

  ctx.save();
  ctx.fillStyle = colour;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';

  // Flip the glyphs when the band is in the upper half, where they would otherwise be upside down.
  // Flipped text also reads in the opposite direction so it stays left-to-right.
  const flipped = Math.sin(startAngle - sweep / 2) < 0;
  const baselineRadius = flipped ? midRadius - capHeight / 2 : midRadius + capHeight / 2;

  chars.forEach((char, i) => {
    const glyphWidth = ctx.measureText(char).width;
    const distance = offsets[i] + glyphWidth / 2;
    // Arc length measured at mid-band radius keeps spacing even between glyph tops and bottoms
    const glyphAngle = flipped
      ? startAngle - sweep + distance / midRadius
      : startAngle - distance / midRadius;

    ctx.save();
    ctx.translate(
      center + baselineRadius * Math.cos(glyphAngle),
      center + baselineRadius * Math.sin(glyphAngle)
    );
    ctx.rotate(glyphAngle - Math.PI / 2 + (flipped ? Math.PI : 0));
    ctx.fillText(char, -glyphWidth / 2, 0);
    ctx.restore();
  });

  ctx.restore();
}
