import * as Tone from "tone";
import { ref, computed } from "vue";
const tempo = ref(120);
const isLooped = ref(false);
const bps = computed(() => (2 * tempo.value) / 60);

Tone.Transport.on("start", () => {
  Tone.Transport.bpm.value = Number(tempo.value);
  console.log(Tone.Transport.bpm.value);
});
export function useTone() {
  function changeTempo(event: Event) {
    // Tone.getTransport().bpm.rampTo(Number(tempo.value), 0.35);
    const target = event.target as HTMLInputElement;
    tempo.value = Number(target?.value);
    Tone.getTransport().bpm.value = Number(tempo.value);
  }
  function playNoteSequence(notesFrequenciesToPlay: number[], onEnd: () => void) {
    stopPlayback();
    Tone.Transport.start();
    // Tone.start();

    const synth = new Tone.PolySynth().toDestination();
    const noteDuration = 0.25;
    const sequenceDuration = notesFrequenciesToPlay.length * noteDuration;
    const sequence = isLooped.value
      ? notesFrequenciesToPlay
      : [...notesFrequenciesToPlay, { time: sequenceDuration, note: "END" }];

    const part = new Tone.Part(
      (time, event) => {
        if (event && event.note !== "END") {
          const noteDotEl = document.getElementById(`note-${event.note}-hz`);
          noteDotEl?.classList.add("is-playing");
          setTimeout(
            () => noteDotEl?.classList.remove("is-playing"),
            noteDuration * 1000
          );
          synth.triggerAttackRelease(event.note, noteDuration, time);
        } else {
          onEnd();
        }
      },
      // [...notesToPlay, { time: sequenceDuration, note: "END" }]
      sequence
    );
    console.log(part, notesFrequenciesToPlay);
    part.start(0);
    part.loopEnd = part.length / bps.value;
    part.loop = isLooped.value;
  }
  function stopPlayback() {
    Tone.Transport.stop();
    Tone.Transport.cancel(-1);
  }
  function playNote(noteToPlay: string) {
    const synth = new Tone.PolySynth().toDestination();
    synth.triggerAttackRelease(noteToPlay, 1);
  }
  return {
    tempo,
    Tone,
    changeTempo,
    playNoteSequence,
    isLooped,
    bps,
    playNote,
    stopPlayback,
  };
}
