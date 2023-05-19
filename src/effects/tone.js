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
  function changeTempo(event) {
    // Tone.getTransport().bpm.rampTo(Number(tempo.value), 0.35);
    tempo.value = Number(event.target.value);
    Tone.getTransport().bpm.value = Number(tempo.value);
  }
  function playNoteSequence(notesToPlay) {
    Tone.Transport.stop();
    Tone.Transport.cancel(-1);
    Tone.Transport.start();
    // Tone.start();

    const synth = new Tone.PolySynth().toDestination();
    const part = new Tone.Part((time, { note }) => {
      synth.triggerAttackRelease(note, 0.25, time);
    }, notesToPlay);

    part.start(0);
    part.loopEnd = part.length/bps.value;
    part.loop = isLooped.value;
    console.log(part, isLooped.value);
  }
  return { tempo, Tone, changeTempo, playNoteSequence, isLooped, bps };
}
