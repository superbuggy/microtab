import pitchClassNumbers12TET from "./definitions/12-tet-pitch-class-numbers.json";

export const addKey = (object, key, value = null) => {
  object[key] = value;
  return object;
};

export const objectMap = (object, fn) =>
  Object.entries(object).reduce((a, [k, v]) => addKey(a, k, fn(k, v)), {});

export const objectFilter = (object, fn) => Object.entries(object).filter(fn);

export const mapValueToRange = (
  valueInFromRange,
  fromMin,
  fromMax,
  toMin,
  toMax
) =>
  toMin +
  ((valueInFromRange - fromMin) * (toMax - toMin)) / (fromMax - fromMin);

export const sum = (numbers) => numbers.reduce((sum, number) => sum + number);

export const remPixels = () =>
  parseFloat(getComputedStyle(document.documentElement).fontSize);

export const mod = (n, m) => ((n % m) + m) % m;

export const isEven = (i) => i % 2 === 0;
export const isOdd = (i) => i % 2 !== 0;

// Bjorklund algorithm from https://gist.github.com/withakay/1286731

/*
An implementation of the Bjorklund algorithm in JavaScript
Inspired by the paper 'The Euclidean Algorithm Generates Traditional Musical Rhythms'
by Godfried Toussaint

This is a port of the original algorithm by E. Bjorklund which I
found in the paper 'The Theory of Rep-Rate Pattern Generation in the SNS Timing Systems' by
E. Bjorklund.
Jack Rutherford
*/

export const euclideanPattern = (pulses, steps) => {
  // renamed from the original
  steps = Math.round(steps);
  pulses = Math.round(pulses);

  if (pulses > steps || pulses === 0 || steps === 0) {
    return [];
  }

  let pattern = [];
  let counts = [];
  let remainders = [];
  let divisor = steps - pulses;
  remainders.push(pulses);
  let level = 0;

  while (true) {
    // eslint-disable-line
    counts.push(Math.floor(divisor / remainders[level]));
    remainders.push(divisor % remainders[level]);
    divisor = remainders[level];
    level += 1;
    if (remainders[level] <= 1) {
      break;
    }
  }

  counts.push(divisor);

  function builder() {
    let repetition = 0; // eslint-disable-line
    return function build(level) {
      repetition += 1;
      if (level > -1) {
        for (var i = 0; i < counts[level]; i++) {
          build(level - 1);
        }
        if (remainders[level] !== 0) {
          build(level - 2);
        }
      } else if (level === -1) {
        pattern.push(0);
      } else if (level === -2) {
        pattern.push(1);
      }
    };
  }

  builder()(level);
  return pattern.reverse();
};

export const rotate = (array, times = 0) => {
  if (!array.length) return [];
  let rotatedArray = array.slice();
  let count = 0;
  while (count < times) {
    rotatedArray.push(rotatedArray.shift()); //rotate left
    count += 1;
  }
  return rotatedArray;
};

export const range = (beginning, end) => {
  const directionMultipler = beginning > end ? -1 : 1;
  const length = Math.abs(end - beginning + directionMultipler);
  return Array.from(
    { length },
    (_, index) => index * directionMultipler + beginning
  );
};

// 120	C9
// 60	C4 (middle C)
// 12	C0
// 0	C-1
export const midiNoteNumberToPitchName = (
  midiNoteNumber,
  shouldPreferSharps = true
) => {
  const includedAccidental = shouldPreferSharps ? "#" : "b";
  const octave = Math.floor(midiNoteNumber / 12);
  const pitchClassNumber = midiNoteNumber % 12;
  const isNatural = (pitchClassName) => !pitchClassName.match(/[b#]/);
  return (
    Object.fromEntries(
      Object.entries(pitchClassNumbers12TET)
        .filter(
          ([pitchClassName]) =>
            pitchClassName.includes(includedAccidental) ||
            isNatural(pitchClassName)
        )
        // Exclude unintuitive pitch class names, like B# for C
        .filter(
          ([pitchClassName, pitchClassNumber], _, pitches) =>
            !pitches.find(
              ([comparisonPitchClassName, comparisonPitchClassNumber]) =>
                comparisonPitchClassNumber === pitchClassNumber &&
                comparisonPitchClassName !== pitchClassName &&
                comparisonPitchClassName.length < pitchClassName.length
            )
        )
        .map((entry) => entry.reverse())
    )[pitchClassNumber] + `${octave}`
  );
};

export const A_440_MIDI_NOTE_NUMBER = 69;
export const A_440 = 440;

export const frequencyToMidiNoteNumber = (frequency) => {
  // m = 12*log2(fm/440 Hz) + 69
  return Math.round(12 * Math.log2(frequency / A_440) + A_440_MIDI_NOTE_NUMBER);
};
export const midiNoteNumberToFrequency = (midiNoteNumber) => {
  // fm = 2(m−69)/12(440 Hz)
  return 2 ** ((midiNoteNumber - A_440_MIDI_NOTE_NUMBER) / 12) * A_440;
};
