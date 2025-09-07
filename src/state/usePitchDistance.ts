import { objectTransform } from './../helpers';
import { computed } from "vue";
import { usePitchDetection } from "./usePitchDetection";
import { useTemperament } from "./temperament";

export function usePitchDistance() {
  const { notesDictionaryFor, divisionsPerOctave } = useTemperament();
  const { pitch } = usePitchDetection();

  const sortedPitches = computed(() => {
    return Object.keys(frequencyDict.value)
      .map(Number)
      .sort((a, b) => a - b);
  });

  const frequencyDict = computed(() => objectTransform(
    notesDictionaryFor(divisionsPerOctave.value),
    ([, note]) => [note.frequency, {name: note.pitch, hz: note.frequency}]));

    console.log('frequencyDict', frequencyDict.value);

  function findNearestNeighbor(targetPitch: number, dictionary: Record<string, any>): any {
    const pitches = sortedPitches.value;
    if (pitches.length === 0) return null;
    if (pitches.length === 1) return dictionary[pitches[0]];

    let left = 0;
    let right = pitches.length - 1;

    while (left < right) {
      const mid = Math.floor((left + right) / 2);
      if (pitches[mid] < targetPitch) {
        left = mid + 1;
      } else {
        right = mid;
      }
    }

    if (left === 0) {
      return dictionary[pitches[0]];
    }
    if (left === pitches.length) {
      return dictionary[pitches[pitches.length - 1]];
    }

    const lowerPitch = pitches[left - 1];
    const upperPitch = pitches[left];
    
    const lowerDistance = Math.abs(targetPitch - lowerPitch);
    const upperDistance = Math.abs(targetPitch - upperPitch);

    return dictionary[lowerDistance <= upperDistance ? lowerPitch : upperPitch];
  }

  const nearestNote = computed(() => {
    if (!pitch.value) return null;
    return findNearestNeighbor(pitch.value, frequencyDict.value);
  });

  // const distanceToNearest = computed(() => {
  //   if (!pitch.value || !nearestNote.value) return null;
  //   return pitch.value - nearestNote.value.hz;
  // });

  const centsToNearest = computed(() => {
    if (!pitch.value || !nearestNote.value) return null;
    const frequencyRatio = pitch.value / nearestNote.value.hz;
    return Math.round(1200 * Math.log2(frequencyRatio));
  });

  return {
    nearestNote,
    centsToNearest,
    findNearestNeighbor
  };
}