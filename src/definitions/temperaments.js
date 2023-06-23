import { useTuning } from "../state/tuning";
const { TUNING } = useTuning();
import pitchMap from './12-tet-pitch-frequencies.json'

const referencePitch = pitchMap[TUNING.value[0]];
const referenceName = TUNING.value[0].replace(/\d/g, "");

// TODO: Support enharmonicity

export const tet12schema = {
  name: "12 TET",
  description: "Standard 12-tone equal temperament.",
  source: "https://en.wikipedia.org/wiki/12_equal_temperament",
  referenceName,
  referencePitch,
  referenceOctave: 0,
  octaveBaseName: "C",
  notes: {
    C: ["C", 0],
    "C#": ["C", 100],
    D: ["C#", 100],
    "D#": ["D", 100],
    E: ["D#", 100],
    F: ["E", 100],
    "F#": ["F", 100],
    G: ["F#", 100],
    "G#": ["G", 100],
    A: ["G#", 100],
    "A#": ["A", 100],
    B: ["A#", 100],
  },
};

export const tet24schema = {
  name: "24 TET",
  description: "Standard 24-tone equal temperament.",
  source: "https://en.wikipedia.org/wiki/Quarter_tone#Quarter-tone_scale",
  referenceName,
  referencePitch,
  referenceOctave: 0,
  octaveBaseName: "C",
  notes: {
    C: ["C", 0],
    "C+": ["C", 50],
    "C#": ["C+", 50],
    "C#+": ["C#", 50],
    D: ["C#+", 50],
    "D+": ["D", 50],
    "D#": ["D+", 50],
    "D#+": ["D#", 50],
    E: ["D#+", 50],
    "E+": ["E", 50],
    F: ["E+", 50],
    "F+": ["F", 50],
    "F#": ["F+", 50],
    "F#+": ["F#", 50],
    G: ["F#+", 50],
    "G+": ["G", 50],
    "G#": ["G+", 50],
    "G#+": ["G#", 50],
    A: ["G#+", 50],
    "A+": ["A", 50],
    "A#": ["A+", 50],
    "A#+": ["A#", 50],
    B: ["A#+", 50],
    "B+": ["B", 50],
  },
};

export const tet16schema = {
  name: "16 TET",
  description: "Standard 16-tone equal temperament.",
  source: "https://en.xen.wiki/w/16edo",
  referenceName,
  referencePitch,
  referenceOctave: 0,
  octaveBaseName: "C",
  notes: {
    C: ["C", 0],
    "C#": ["C", 75],
    D: ["C", 150],
    "D#": ["C", 225],
    Eb: ["C", 300],
    E: ["C", 375],
    "E#": ["C", 450],
    F: ["C", 525],
    "F#": ["C", 600],
    G: ["C", 675],
    "G#": ["C", 750],
    Ab: ["C", 825],
    A: ["C", 900],
    "A#": ["C", 975],
    Bb: ["C", 1050],
    B: ["C", 1125],
  },
};

// TODO: Support enharmonicity

export const tet17schema = {
  name: "17 TET",
  description: "Standard 17-tone equal temperament.",
  source: "https://en.xen.wiki/w/17edo",
  referenceName,
  referencePitch,
  referenceOctave: 0,
  octaveBaseName: "C",
  // temperament.js has a bug in the check to see if a note has been defined conflictually--Math.round workaround
  notes: {
    C: ["C", 0],
    "C+": ["C", Math.round(70.59)],
    "C#": ["C", Math.round(141.18)],
    D: ["C", Math.round(211.76)],
    Eb: ["C", Math.round(282.35)],
    "E-": ["C", Math.round(352.94)],
    E: ["C", Math.round(423.53)],
    F: ["C", Math.round(494.12)],
    "F+": ["C", Math.round(564.71)],
    "F#": ["C", Math.round(635.29)],
    G: ["C", Math.round(705.88)],
    "G#": ["C", Math.round(776.47)],
    Ab: ["C", Math.round(847.06)],
    A: ["C", Math.round(917.65)],
    "A#": ["C", Math.round(988.24)],
    "B-": ["C", Math.round(1058.82)],
    B: ["C", Math.round(1129.41)],
  },
};
