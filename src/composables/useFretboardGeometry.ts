import { computed, toRefs } from "vue";
import type { ComputedRef, Ref } from "vue";
import { range, mapValueToRange, remPixels } from "@/helpers";
import type { SupportedEDOs, Note, PitchName } from "@/definitions/types";

type MaybeRefOrComputed<T> = Ref<T> | ComputedRef<T>;

// ── Constants ──────────────────────────────────────────────────────────

export const VIEWBOX_X_MAX = 600;
export const VIEWBOX_Y_MAX = 4000;
export const xBoardStart = VIEWBOX_X_MAX / 4;
export const yBoardStart = VIEWBOX_Y_MAX / 8;
export const width = VIEWBOX_X_MAX / 2;
export const fretboardLengthPx = VIEWBOX_Y_MAX / 2;
export const SCALE_LENGTH = 25.5;

// ── Pure geometry functions (no Vue dependencies) ──────────────────────

export function stringEnergy(stringRootFrequency: number): number {
  // Mersenne's Law: L = 1/2 * sqrt(T/m) * 1/f
  // T/m = (2Lf)^2
  return 2 * SCALE_LENGTH * stringRootFrequency;
}

export function distanceForFrequency(
  stringRootFrequency: number,
  noteFrequency: number
): number {
  // Frequency = 1 / 2L * stringEnergy //sqrt(T/m)
  return stringEnergy(stringRootFrequency) / (noteFrequency * 2);
}

export function noteYCoord(
  stringRootFrequency: number,
  noteFrequency: number
): number {
  return 1.775 * (fretboardLengthPx -
    mapValueToRange(
      distanceForFrequency(stringRootFrequency, noteFrequency),
      0,
      SCALE_LENGTH,
      yBoardStart,
      fretboardLengthPx
    )
  ) + yBoardStart;
}

// ── Composable for fretboard geometry state ────────────────────────────

export function useFretboardGeometry(
  divisionsPerOctave: MaybeRefOrComputed<SupportedEDOs>,
  stringQuantity: MaybeRefOrComputed<number>,
  shouldShow12TETFrets: Ref<boolean>,
  tuningByStringNumber: MaybeRefOrComputed<Record<string, PitchName>>,
  notesInTemperamentByPitch: MaybeRefOrComputed<Record<string, { frequency: number }>>,
  notesFor: (octavalDivisions: number) => Note[]
) {
  const lowestStringRootFrequency = computed(() =>
    notesInTemperamentByPitch.value[tuningByStringNumber.value.string6]?.frequency ?? 0
  );

  // Assumes an equal step temperament
  function fretDistancesFromNut(divisions: number = divisionsPerOctave.value): number[] {
    // TODO: Add True Temperament Mode
    const lowestStringRootIndex = notesFor(divisions).findIndex(
      (note: any) => note.pitch === tuningByStringNumber.value.string6
    );

    const twoOctaves = notesFor(divisions)
      .slice(lowestStringRootIndex, lowestStringRootIndex + 2 * divisions)
      .map((note: any) => noteYCoord(lowestStringRootFrequency.value, note.frequency));

    return twoOctaves;
  }

  const startingFret = 0;
  const endingFret = computed(() => 2 * divisionsPerOctave.value);
  const reachableFrets = computed(() =>
    shouldShow12TETFrets.value ? range(0, 24) : range(startingFret, endingFret.value)
  );
  const fretDistances = computed(() =>
    fretDistancesFromNut(shouldShow12TETFrets.value ? 12 : divisionsPerOctave.value)
  );
  const fretSpacingPx = computed(() => fretDistances.value.slice(1));
  const fretHeightsPx = computed(() =>
    fretSpacingPx.value.reduce((distances: number[], length: number, index: number) => {
      distances.push(length - fretDistances.value[index]);
      return distances;
    }, [])
  );

  const dottedFretsByEdo: Record<SupportedEDOs, number[]> = {
    12: [3, 5, 7, 9, 12, 15, 17, 19, 21, 24],
    16: [3, 5, 7, 9, 11, 13, 16, 19, 21, 23, 25, 27, 29, 32],
    17: [4, 7, 10, 13, 17, 21, 24, 27, 30, 34],
    24: [6, 10, 14, 18, 24, 30, 34, 38, 42, 48],
    31: [8, 13, 18, 23, 31, 39, 44, 49, 54, 62],
  };

  const dottedFrets = computed(() =>
    shouldShow12TETFrets.value
      ? [3, 5, 7, 9, 12, 15, 17, 19, 21, 24]
      : dottedFretsByEdo[divisionsPerOctave.value]
  );

  const stringSpacing = width / (stringQuantity.value - 1);
  const fontSize = remPixels() * 2.5;
  const textOffsetX = 0.5 * fontSize;
  const textOffsetY = fontSize;

  return toRefs({
    // Constants
    VIEWBOX_X_MAX,
    VIEWBOX_Y_MAX,
    xBoardStart,
    yBoardStart,
    width,
    fretboardLengthPx,
    SCALE_LENGTH,
    // Computed
    lowestStringRootFrequency,
    endingFret,
    reachableFrets,
    fretDistances,
    fretSpacingPx,
    fretHeightsPx,
    dottedFrets,
    stringSpacing,
    fontSize,
    textOffsetX,
    textOffsetY,
    startingFret,
  });
}
