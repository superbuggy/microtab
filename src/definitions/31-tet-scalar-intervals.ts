// Scalar intervallic distances for 31-EDO (tricesimoprimal), in 31-EDO steps.
// Each pattern sums to 31 (one octave). Transcribed from the step patterns
// printed in Ron Sword, "Tricesimoprimal Scales for Guitar" (v1.20).
// In 31-EDO meantone: whole tone = 5 steps, diatonic semitone = 3,
// chromatic semitone = 2, neutral second = 4.

export const scalarIntervallicDistances31EDO = {
  // Diatonic modes (meantone)
  "Ionian [7]": [5, 5, 3, 5, 5, 5, 3],
  "Dorian [7]": [5, 3, 5, 5, 5, 3, 5],
  "Phrygian [7]": [3, 5, 5, 5, 3, 5, 5],
  "Lydian [7]": [5, 5, 5, 3, 5, 5, 3],
  "Mixolydian [7]": [5, 5, 3, 5, 5, 3, 5],
  "Aeolian [7]": [5, 3, 5, 5, 3, 5, 5],
  "Locrian [7]": [3, 5, 5, 3, 5, 5, 5],

  // Minor variants
  "Harmonic Minor": [5, 3, 5, 5, 3, 7, 3],
  "Melodic Minor": [5, 3, 5, 5, 5, 5, 3],

  // Neutral diatonic
  "Neutral Diatonic Mixolydian": [4, 4, 5, 4, 4, 5, 5],

  // Pentatonic
  "Quasi-Equal Pentatonic": [6, 6, 7, 6, 6],
  "Meantone Pentatonic [5]": [5, 8, 5, 8, 5],

  // Genus scales
  "Genus Octavum": [6, 6, 6, 1, 6, 6],
  "Genus Tertium": [8, 2, 8, 3, 7, 3],
  "Genus Diatonico-chromaticum": [3, 2, 3, 2, 3, 2, 3, 3, 2, 3, 2, 3],

  // Ratio 2:3 chromatic
  "Ratio 2:3 Chromatic Mixolydian": [2, 3, 8, 2, 3, 8, 5],

  // Paul Hahn scales
  "Hahn Pentachordal": [3, 4, 3, 3, 5, 3, 4, 3, 3],
  "Hahn Symmetric Pentachordal": [3, 3, 4, 3, 5, 3, 4, 3, 3],
  "Hahn Nonatonic": [4, 4, 2, 5, 3, 3, 4, 3, 3],

  // George Secor
  "Secor Sentinel": [2, 5, 2, 2, 5, 2, 2, 2, 5, 2, 2],

  // MOS scales (Paul Erlich)
  "Orson (Orwell) [5]": [7, 7, 3, 7, 7],
  "Orson (Orwell) [9]": [3, 4, 3, 4, 3, 4, 3, 4, 3],
  "Cynder [5]": [6, 6, 7, 6, 6],
  "Cynder [6]": [6, 6, 1, 6, 6, 6],
  "Cynder [11]": [1, 5, 1, 5, 1, 5, 1, 5, 1, 5, 1],
  "Cynder [21]": [1, 1, 3, 1, 1, 1, 3, 1, 1, 1, 3, 1, 1, 1, 3, 1, 1, 1, 3, 1, 1],
  "Meantone [12]": [3, 2, 3, 2, 3, 2, 3, 3, 2, 3, 2, 3],
  "Miracle [10]": [3, 3, 3, 3, 4, 3, 3, 3, 3, 3],
  "Miracle [11]": [3, 3, 3, 3, 3, 1, 3, 3, 3, 3, 3],
  "Miracle [21] (Blackjack)": [
    1, 2, 1, 2, 1, 2, 1, 2, 1, 2, 1, 2, 1, 2, 1, 2, 1, 2, 1, 2, 1,
  ],
};
