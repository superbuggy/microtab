import type { GuitarTuning, PitchName, StringNumber, Note, Dict } from '@/definitions/types';
import { watch, ref, computed } from "vue";
import { useScales } from "@/definitions/scales";
import { patternWalk } from "@/definitions/interval-pattern";
import { useTemperament } from "./temperament";
import { useTuning } from "./tuning";
import { PitchClass } from "@/definitions/types";
const { TUNING } = useTuning();

const { scaleNames, scalesFor, scaleFromPattern } = useScales();
const {
  distanceBetweenNotes,
  noteNames,
  divisionsPerOctave,
  notesInTemperament,
  notesInTemperamentByPitch,
  notesDictionaryFor12Tet,
  Note: NoteClass,
} = useTemperament();

const DEFAULT_STRING_QUANTITY = 6;
// const TUNING = ["B1", "E2", "A2", "D3", "F#3", "B3"];

const stringQuantity = ref(DEFAULT_STRING_QUANTITY);
const stringNumbers = Array.from({ length: stringQuantity.value }).map(
  (_, index, { length }) => length - index
);
// The tuning is spelled in 12-TET note names, but not every temperament
// defines the same enharmonic spellings (e.g. 17-TET has no D#, only Eb).
// Resolve each tuning pitch to whatever the active temperament calls the
// nearest pitch so any tuning works in any temperament.
const nearestPitchInTemperament = (targetFrequency: number): PitchName =>
  notesInTemperament.value.reduce((nearest, note) =>
    Math.abs(note.frequency - targetFrequency) <
    Math.abs(nearest.frequency - targetFrequency)
      ? note
      : nearest
  ).pitch;

const resolveTuningPitch = (pitchName: PitchName): PitchName => {
  if (notesInTemperamentByPitch.value[pitchName]) return pitchName;
  const target = notesDictionaryFor12Tet[pitchName]?.frequency;
  return target == null ? pitchName : nearestPitchInTemperament(target);
};

const tuningByStringNumber = computed<GuitarTuning>(() =>
  Object.fromEntries(
    stringNumbers.map((stringNumber, index) => [
      `string${stringNumber}`,
      resolveTuningPitch(TUNING.value[index]),
    ])
  )
);
// The raw, 12-TET-spelled tuning keyed by string. Used by the "12-TET guides"
// overlay, which references the 12-TET note dictionary and therefore needs the
// canonical 12-TET spelling rather than the active temperament's resolution.
const tuningByStringNumber12Tet = computed<GuitarTuning>(() =>
  Object.fromEntries(
    stringNumbers.map((stringNumber, index) => [
      `string${stringNumber}`,
      TUNING.value[index],
    ])
  )
);
const startingFromFret = ref(0);

// Reactive lowest note: re-evaluates whenever tuningByStringNumber changes.
const lowestNote = computed<PitchName>(
  () => tuningByStringNumber.value[`string${stringNumbers[0]}`]
);

const scales = ref<Record<string, any>>({});
const selectedScaleName = ref("Ionian");

// Scales generated from an interval pattern at runtime. Kept separate from the
// built-in scale set so they can be merged into the picker and cleared when the
// temperament changes (their notes are tied to the temperament active at build
// time).
const customScales = ref<Record<string, any>>({});
const patternError = ref("");

const selectedScale = computed(() => scales.value[selectedScaleName.value]);

// The number of steps spanned by the fretboard, from the lowest string's root
// up to the highest reachable note (highest string root plus the rendered fret
// span). A generated pattern's walk is extended to cover this so it repeats
// across the whole neck rather than stopping at the first octave.
const fretboardSpanSteps = (): number => {
  const rootIndex = noteNames.value.indexOf(lowestNote.value);
  const highestStringRoot =
    tuningByStringNumber.value[`string${stringNumbers.at(-1)}` as StringNumber];
  const highestIndex =
    noteNames.value.indexOf(highestStringRoot) + frettableFretSpan.value;
  return Math.max(highestIndex - rootIndex, divisionsPerOctave.value);
};

// Build the exact notes a generated pattern walks through, anchored at the
// lowest string's root so they land in the fretboard's range. The fretboard
// renders these directly, which means it only shows notes that are actually
// played (no octave-tiled positions the walk never reaches).
const patternNotesFromSequence = (sequence: number[]): Note[] => {
  const rootIndex = noteNames.value.indexOf(lowestNote.value);
  const uniqueOffsets = Array.from(new Set(sequence)).sort((a, b) => a - b);
  return uniqueOffsets
    .map((offset) => noteNames.value[rootIndex + offset])
    .filter((pitchName): pitchName is PitchName => Boolean(pitchName))
    .map((pitchName) => new NoteClass.value(pitchName));
};

const allScaleNames = computed(() => [
  ...scaleNames.value,
  ...Object.keys(customScales.value),
]);

const defaultScalesPerTet = {
  12: "Ionian [7]",
  16: "Rank 3 Minor [7] A",
  17: "Otonal 17",
  24: "Ionian",
  31: "Ionian [7]",
};

watch([divisionsPerOctave, lowestNote], ([perOctave, currentLowestNote]) => {
  selectedScaleName.value = defaultScalesPerTet[perOctave];
  // Pattern scales hold notes tied to the previous temperament, so drop them.
  customScales.value = {};
  patternError.value = "";
  scales.value = scalesFor(currentLowestNote.replace(/\d/, "") as PitchClass);
});

const notesPerString = ref<number | null>(3);

// The fretboard renders this many octaves (see `endingFret` in FretBoard.vue),
// so scan the same span when deciding which notes to highlight. Previously this
// was hardcoded to 48 (two octaves of 24-TET only), which silently produced the
// wrong range for every other temperament.
const FRETTED_OCTAVES = 2; // spans the two octaves the fretboard renders
const frettableFretSpan = computed(() => FRETTED_OCTAVES * divisionsPerOctave.value);

type FretNote = { note: Note; fretNumber: number };

export function useGuitar() {
  const initializedGuitarNotes = (): Record<StringNumber, FretNote[]> =>
    Object.fromEntries(
      stringNumbers.map((stringNumber) => [`string${stringNumber}`, []])
    );

  const scaleForGuitar = (startingNoteNameIndex: number, endingNoteNameIndex: number) => {
    return ((selectedScale.value.notes) as Note[])
      .filter(
        (note) =>
          startingNoteNameIndex + noteNames.value.indexOf(lowestNote.value) <=
            note.absolutePitchNumber &&
          note.absolutePitchNumber <=
            endingNoteNameIndex + noteNames.value.indexOf(lowestNote.value)
      )
      .map((note) => ({
        note,
        fretNumber:
          note.absolutePitchNumber -
          noteNames.value.indexOf(lowestNote.value) -
          startingNoteNameIndex,
      }));
  };
  // const scaleForGuitar = (startingNoteNameIndex, endingNoteNameIndex) => {
  //   return selectedScale.value.notes
  //     .filter(
  //       (note) =>
  //         startingNoteNameIndex + noteNames.value.indexOf(lowestNote) <=
  //           note.absolutePitchNumber &&
  //         note.absolutePitchNumber <=
  //           endingNoteNameIndex + noteNames.value.indexOf(lowestNote)
  //     )
  //     .reduce((stringNotes, note) => {
  //       const fretNumber =
  //         note.absolutePitchNumber -
  //         noteNames.value.indexOf(lowestNote) -
  //         startingNoteNameIndex;
  //       stringNotes[fretNumber] = note;
  //       return stringNotes;
  //     }, {});
  // };

  const selectNotesPerString = (perString: string) => {
    notesPerString.value = perString === "All" ? null : Number(perString);
  };

  const selectScale = (scaleName: string) => {
    selectedScaleName.value = scaleName;
  };

  // Parse an interval pattern into a scale, add it to the pickable scale set,
  // and select it. Parse failures are surfaced via `patternError`.
  const addPatternScale = (input: string) => {
    patternError.value = "";
    const name = input.trim();
    if (!name) {
      patternError.value = "Pattern is empty.";
      return;
    }
    try {
      const rootNoteName = lowestNote.value.replace(/\d/, "") as PitchClass;
      const built = scaleFromPattern(name, rootNoteName) as Record<string, any>;
      // Repeat the walk beyond the octave across the whole fretboard, then use
      // that same sequence for both rendering and playback so the board shows
      // exactly the notes that get played (no unplayed octave-tiled positions).
      const walk = patternWalk(built.deltas, fretboardSpanSteps());
      built.sequence = walk;
      built.notes = patternNotesFromSequence(walk);
      customScales.value = { ...customScales.value, [name]: built };
      scales.value = { ...scales.value, [name]: built } as typeof scales.value;
      selectScale(name);
    } catch (error) {
      patternError.value = (error as Error).message;
    }
  };

  const fretboardScale = computed(() => {
    const guitar = initializedGuitarNotes();
    for (const stringNumber in guitar) {
      const startingNoteOnString = tuningByStringNumber.value[stringNumber as StringNumber];
      const offset = distanceBetweenNotes(lowestNote.value, startingNoteOnString);
      const previousStringNumber = stringNumber.replace(/\d/, (n) => `${+n + 1}`) as StringNumber;

      const distanceBetweenStrings = guitar[previousStringNumber]
        ? distanceBetweenNotes(
            tuningByStringNumber.value[previousStringNumber as StringNumber],
            startingNoteOnString
          )
        : 0;
      const stringScale = scaleForGuitar(offset, offset + frettableFretSpan.value).map(
        ({ note, fretNumber }) => ({
          note,
          fretNumber: fretNumber + startingFromFret.value,
        })
      );

      if (!notesPerString.value) {
        guitar[stringNumber as StringNumber] = stringScale;
        continue;
      }

      const priorString = guitar[previousStringNumber];
      const lastNoteOnPriorString = priorString?.at(-1);

      guitar[stringNumber as StringNumber] = stringScale
        .filter(({ fretNumber }) => {
          // The lowest string has no prior string to anchor against, so it
          // simply starts from the open position.
          if (!priorString) return true;
          if (!lastNoteOnPriorString) return false;
          // Keep notes pitched above the last note used on the prior string so
          // the pattern keeps climbing the neck. A note here sounds the same as
          // fret (fretNumber + distanceBetweenStrings) on the prior string, so
          // that's what we compare against.
          return lastNoteOnPriorString.fretNumber < fretNumber + distanceBetweenStrings;
        })
        .slice(0, notesPerString.value);
    }
    return guitar;
  });

  const scaleNotesOnStrings = computed((): Dict => fretboardScale.value);

  // Turn a generated pattern's walk into an ordered, playable note sequence so
  // playback follows the pattern instead of ascending pitch. Each entry carries
  // a frequency to sound and, when a matching fretboard dot is rendered, the
  // element id to highlight. Returns null for non-pattern scales, which keep
  // the default ascending/descending playback.
  type PlaybackEvent = { note: number[]; id?: string };
  const generatedPlaybackSequence = computed<PlaybackEvent[] | null>(() => {
    const current = selectedScale.value as
      | { sequence?: number[] }
      | undefined;
    const offsets = current?.sequence;
    if (!offsets) return null;

    // Map each rendered note's absolute pitch to its dot id so the sequence can
    // highlight a fretted note when one exists at that pitch.
    const idByPitchNumber: Record<number, string> = {};
    for (const [stringNumber, notes] of Object.entries(
      scaleNotesOnStrings.value
    )) {
      for (const { note } of notes as { note: Note }[]) {
        if (!(note.absolutePitchNumber in idByPitchNumber)) {
          idByPitchNumber[
            note.absolutePitchNumber
          ] = `note-${stringNumber}-${note.frequency}-hz`;
        }
      }
    }

    const rootIndex = noteNames.value.indexOf(lowestNote.value);

    return offsets
      .map((offset): PlaybackEvent | null => {
        const pitchIndex = rootIndex + offset;
        const pitchName = noteNames.value[pitchIndex];
        const frequency = pitchName
          ? notesInTemperamentByPitch.value[pitchName]?.frequency
          : undefined;
        if (frequency == null) return null;
        return { note: [frequency], id: idByPitchNumber[pitchIndex] };
      })
      .filter((event): event is PlaybackEvent => event !== null);
  });

  selectScale(selectedScaleName.value);

  return {
    stringQuantity,
    divisionsPerOctave,
    tuningByStringNumber,
    tuningByStringNumber12Tet,
    stringNumbers,
    scaleNotesOnStrings,
    scaleNames: allScaleNames,
    selectScale,
    addPatternScale,
    patternError,
    generatedPlaybackSequence,
    selectedScaleName,
    selectedScale,
    notesPerString,
    selectNotesPerString,
    startingFromFret,
  };
}
