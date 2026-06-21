import { computed } from 'vue';
import type { ComputedRef, Ref } from 'vue';
import type { PitchClass, SupportedEDOs, ScaleDefinition } from '@/definitions/types';
import {
  scaleToStaffNotes,
  staffPositionToY,
  ledgerLinesNeeded,
  type StaffNote,
} from '@/definitions/staff-notation';

type MaybeRef<T> = Ref<T> | ComputedRef<T>;

const STAFF_LINE_SPACING = 16;
const STAFF_TOP_Y = 60;
const STAFF_WIDTH = 700;
const CLEF_WIDTH = 50;

export function useStaffNotation(
  selectedScale: MaybeRef<ScaleDefinition>,
  pitchClassNames: MaybeRef<PitchClass[]>,
  divisionsPerOctave: MaybeRef<SupportedEDOs>,
) {
  const staffNotes = computed(() =>
    scaleToStaffNotes(
      selectedScale.value,
      pitchClassNames.value,
      divisionsPerOctave.value,
    ),
  );

  const noteSpacing = computed(() => {
    const noteCount = staffNotes.value.length;
    if (noteCount === 0) return 0;
    return (STAFF_WIDTH - CLEF_WIDTH - 40) / (noteCount + 1);
  });

  function noteX(index: number): number {
    return CLEF_WIDTH + 40 + noteSpacing.value * (index + 1);
  }

  function noteY(note: StaffNote): number {
    return staffPositionToY(note.staffPosition, STAFF_LINE_SPACING, STAFF_TOP_Y);
  }

  function noteLedgerLines(note: StaffNote): number[] {
    return ledgerLinesNeeded(note.staffPosition);
  }

  function ledgerLineY(position: number): number {
    return staffPositionToY(position, STAFF_LINE_SPACING, STAFF_TOP_Y);
  }

  return {
    staffNotes,
    noteX,
    noteY,
    noteLedgerLines,
    ledgerLineY,
    STAFF_LINE_SPACING,
    STAFF_TOP_Y,
    STAFF_WIDTH,
    CLEF_WIDTH,
  };
}
