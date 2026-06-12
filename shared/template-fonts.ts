export const TEMPLATE_FONT_FAMILIES = [
  'Impact',
  'Arial',
  'Helvetica',
  'Anton',
  'sans-serif',
] as const;

/** Web fonts bundled under public/fonts/ and embedded in exported thumbnails. */
export const EMBEDDED_TEMPLATE_FONTS: Record<string, string> = {
  Anton: 'Anton-Regular.ttf',
};
