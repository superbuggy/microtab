import type { GuitarTuning, PitchName, StringNumber, Note } from '@/definitions/types';
import { watch, ref, computed } from "vue";
import { useScales } from "@/definitions/scales";
import { useTemperament } from "./temperament";
import { useTuning } from "./tuning";
import { SupportedEDOs, PitchClass } from "@/definitions/types";
const { TUNING } = useTuning();

const { scaleNames, scalesFor } = useScales();
const { distanceBetweenNotes, noteNames, divisionsPerOctave } =
  useTemperament();

const DEFAULT_STRING_QUANTITY = 6;
// const TUNING = ["B1", "E2", "A2", "D3", "F#3", "B3"];

const stringQuantity = ref(DEFAULT_STRING_QUANTITY);
const stringNumbers = Array.from({ length: stringQuantity.value }).map(
  (_, index, { length }) => length - index
);
const tuning = ref<GuitarTuning>(
  Object.fromEntries(
    stringNumbers.map((stringNumber, index) => [
      `string${stringNumber}`,
      TUNING.value[index],
    ])
  )
);
const startingFromFret = ref(0);
const lowestNote: PitchName = tuning.value[`string${stringNumbers[0]}`];
const scales = ref(scalesFor(lowestNote.replace(/\d/, "") as PitchClass));
const selectedScaleName = ref("Ionian");

const selectedScale = computed(() => scales.value[selectedScaleName.value]);

const defaultScalesPerTet = {
  16: "Rank 3 Minor [7] A",
  17: "Otonal 17",
  24: "Ionian",
};

watch(divisionsPerOctave, (perOctave: SupportedEDOs) => {
  selectedScaleName.value = defaultScalesPerTet[perOctave];
  scales.value = scalesFor(lowestNote.replace(/\d/, "") as PitchClass);
});

const notesPerString = ref<number | null>(3);

type FretNote = { note: Note; fretNumber: number };

export function useGuitar() {
  const initializedGuitarNotes = (): Record<StringNumber, FretNote[]> =>
    Object.fromEntries(
      stringNumbers.map((stringNumber) => [`string${stringNumber}`, []])
    );

  const scaleForGuitar = (startingNoteNameIndex: number, endingNoteNameIndex: number) => {
    return selectedScale.value.notes
      .filter(
        (note) =>
          startingNoteNameIndex + noteNames.value.indexOf(lowestNote) <=
            note.absolutePitchNumber &&
          note.absolutePitchNumber <=
            endingNoteNameIndex + noteNames.value.indexOf(lowestNote)
      )
      .map((note) => ({
        note,
        fretNumber:
          note.absolutePitchNumber -
          noteNames.value.indexOf(lowestNote) -
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

  const fretboardScale = computed(() => {
    const guitar = initializedGuitarNotes();
    for (const stringNumber in guitar) {
      const startingNoteOnString = tuning.value[stringNumber as StringNumber];
      const offset = distanceBetweenNotes(lowestNote, startingNoteOnString);
      const previousStringNumber = stringNumber.replace(/\d/, (n) => `${+n + 1}`) as StringNumber;

      const distanceBetweenStrings = guitar[previousStringNumber]
        ? distanceBetweenNotes(
            tuning.value[previousStringNumber as StringNumber],
            startingNoteOnString
          )
        : 0;
      const stringScale = scaleForGuitar(offset, offset + 48).map(
        ({ note, fretNumber }) => ({
          note,
          fretNumber: fretNumber + startingFromFret.value,
        })
      );

      guitar[stringNumber as StringNumber] = notesPerString.value
        ? stringScale
            .filter(({ fretNumber }) => {
              if (!guitar[previousStringNumber]) return true;
              // if (!guitar[previousStringNumber].at(-1)) return false;
              // if (!guitar[previousStringNumber].at(-1)?.fretNumber) return false;
              if (notesPerString.value) {
                const lastNoteOnPriorString = guitar[previousStringNumber].at(-1);
                if (!lastNoteOnPriorString) return false;
                return (
                  // UGH
                  lastNoteOnPriorString.fretNumber < (fretNumber + distanceBetweenStrings)
                );
              }
            })
            .slice(0, notesPerString.value)
        : stringScale;
    }
    return guitar;
  });

  const scaleNotesOnStrings = computed(() => fretboardScale.value);

  selectScale(selectedScaleName.value);

  return {
    stringQuantity,
    divisionsPerOctave,
    tuning,
    stringNumbers,
    scaleNotesOnStrings,
    scaleNames,
    selectScale,
    selectedScaleName,
    selectedScale,
    notesPerString,
    selectNotesPerString,
    startingFromFret,
  };
}
