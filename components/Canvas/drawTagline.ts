// Geometry of the text band inside the arc, in the arc SVG's 1080 × 1080 viewBox units
const VIEWBOX = 1080;
const CENTER = VIEWBOX / 2;
const CAP_TOP_RADIUS = 423; // glyph tops face the centre
const BASELINE_RADIUS = 493;
const START_ANGLE = (179.4 * Math.PI) / 180; // left-hand side, just below the horizontal
const MAX_SWEEP = (110 * Math.PI) / 180; // beyond this the gradient fades out and the text loses contrast
const TRACKING = 0.135; // em, matches the original #FREELANCE artwork

export const TAGLINE_FONT = 'Libre Franklin';
export const TAGLINE_FONT_WEIGHT = 600;

/**
 * Draws `text` along the lower-left arc of the badge, reading clockwise (left → bottom),
 * with glyph tops facing the centre. Glyphs are placed one by one; positions come from
 * measuring each prefix so the font's kerning is preserved.
 */
export function drawTagline(ctx: CanvasRenderingContext2D, text: string, colour: string, size: number) {
  if (!text) return;

  const scale = size / VIEWBOX;
  const center = CENTER * scale;
  const bandHeight = (BASELINE_RADIUS - CAP_TOP_RADIUS) * scale;
  const midRadius = ((BASELINE_RADIUS + CAP_TOP_RADIUS) / 2) * scale;

  ctx.save();
  ctx.fillStyle = colour;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';

  // Fit the cap height to the band, then shrink if the text doesn't fit the available sweep
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

  // Keep the (possibly smaller) glyphs vertically centred in the band
  const capHeight = fontSize * capRatio;
  const baselineRadius = midRadius + capHeight / 2;

  layout.chars.forEach((char, i) => {
    const glyphWidth = ctx.measureText(char).width;
    // Arc length measured at mid-band radius keeps spacing even between glyph tops and bottoms
    const angle = START_ANGLE - (layout.offsets[i] + glyphWidth / 2) / midRadius;

    ctx.save();
    ctx.translate(center + baselineRadius * Math.cos(angle), center + baselineRadius * Math.sin(angle));
    ctx.rotate(angle - Math.PI / 2);
    ctx.fillText(char, -glyphWidth / 2, 0);
    ctx.restore();
  });

  ctx.restore();
}
