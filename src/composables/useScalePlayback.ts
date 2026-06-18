import { ref, type Ref, type ComputedRef } from "vue";
import { useTone } from "@/effects/tone";
import type { PlaybackEvent } from "@/definitions/types";

type ScaleNotesOnStrings = Record<string, Array<{ note: { frequency: number } }>>;

export function useScalePlayback(
  generatedPlaybackSequence: ComputedRef<PlaybackEvent[] | null>,
  scaleNotesOnStrings: ComputedRef<ScaleNotesOnStrings>,
  bps: ComputedRef<number>
) {
  const { playNoteSequence, stopPlayback } = useTone();
  const isPlayingSequence: Ref<boolean> = ref(false);

  function playScale() {
    isPlayingSequence.value = true;
    const ascending =
      generatedPlaybackSequence.value ??
      Object.entries(scaleNotesOnStrings.value).flatMap(([string, notes]) =>
        notes.map(({ note }) => ({
          note: [note.frequency],
          id: `note-${string}-${note.frequency}-hz`,
        }))
      );
    const sequence = [...ascending, ...ascending.slice().reverse()];
    const notesToPlay = sequence.map((event, index) => ({
      ...event,
      time: index / bps.value,
    }));
    const onEnd = () => {
      isPlayingSequence.value = false;
    };
    playNoteSequence(notesToPlay, onEnd);
  }

  function stopPlayingScale() {
    isPlayingSequence.value = false;
    stopPlayback();
  }

  return { isPlayingSequence, playScale, stopPlayingScale };
}
