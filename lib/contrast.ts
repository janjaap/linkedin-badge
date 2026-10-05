// WCAG 2.x contrast ratio between two #rrggbb colours
// https://www.w3.org/TR/WCAG22/#dfn-contrast-ratio

const channel = (value: number) => {
  const c = value / 255;
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
};

const luminance = (hex: string) => {
  const [r, g, b] = [1, 3, 5].map((i) => channel(Number.parseInt(hex.slice(i, i + 2), 16)));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

export function contrastRatio(a: string, b: string) {
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (light + 0.05) / (dark + 0.05);
}

// At 400px the tagline would count as WCAG "large text" (3:1), but LinkedIn shows profile photos much smaller,
// where it becomes small text, so use the normal-text AA threshold
export const MIN_TAGLINE_CONTRAST = 4.5;
