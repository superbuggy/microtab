export type GlyphDef = {
  path: string;
  width: number;
  height: number;
  baseline: number;
};

// Sharp: two vertical lines crossed by two slanted horizontals
export const GLYPH_SHARP: GlyphDef = {
  path: 'M3,0 L3,22 M9,0 L9,22 M0,6 L12,4 M0,16 L12,14',
  width: 12,
  height: 22,
  baseline: 11,
};

// Flat: vertical line with rounded bump at bottom-right
export const GLYPH_FLAT: GlyphDef = {
  path: 'M1,0 L1,20 Q1,14 8,14 Q12,14 8,20 L1,20',
  width: 12,
  height: 20,
  baseline: 16,
};

// Natural: vertical line with offset rectangles
export const GLYPH_NATURAL: GlyphDef = {
  path: 'M1,0 L1,18 M7,4 L7,22 M1,6 L7,4 M1,18 L7,16',
  width: 8,
  height: 22,
  baseline: 11,
};

// Double sharp: X-shaped cross
export const GLYPH_DOUBLE_SHARP: GlyphDef = {
  path: 'M0,0 L10,10 M10,0 L0,10 M2,0 L12,10 M12,0 L2,10',
  width: 12,
  height: 10,
  baseline: 5,
};

// Double flat: two flat symbols side by side
export const GLYPH_DOUBLE_FLAT: GlyphDef = {
  path: 'M1,0 L1,20 Q1,14 6,14 Q9,14 6,20 L1,20 M10,0 L10,20 Q10,14 15,14 Q18,14 15,20 L10,20',
  width: 19,
  height: 20,
  baseline: 16,
};

// Up arrow: filled chevron/triangle pointing up
export const GLYPH_UP_ARROW: GlyphDef = {
  path: 'M5,0 L10,8 L7,8 L7,12 L3,12 L3,8 L0,8 Z',
  width: 10,
  height: 12,
  baseline: 6,
};

// Down arrow: filled chevron/triangle pointing down
export const GLYPH_DOWN_ARROW: GlyphDef = {
  path: 'M5,12 L10,4 L7,4 L7,0 L3,0 L3,4 L0,4 Z',
  width: 10,
  height: 12,
  baseline: 6,
};

// Treble clef: simplified geometric version
export const GLYPH_TREBLE_CLEF: GlyphDef = {
  path: [
    'M14,60 Q4,52 6,42 Q8,32 14,28',
    'Q20,22 18,14 Q16,6 14,2',
    'Q12,0 10,4 Q8,10 10,18',
    'Q12,26 16,32 Q20,38 18,44',
    'Q16,50 10,52 Q4,52 4,46',
    'Q4,40 10,38 Q16,38 18,42',
    'Q20,46 16,50',
  ].join(' '),
  width: 24,
  height: 62,
  baseline: 42,
};

export const ACCIDENTAL_GLYPHS: Record<string, GlyphDef> = {
  sharp: GLYPH_SHARP,
  flat: GLYPH_FLAT,
  natural: GLYPH_NATURAL,
  doubleSharp: GLYPH_DOUBLE_SHARP,
  doubleFlat: GLYPH_DOUBLE_FLAT,
};
