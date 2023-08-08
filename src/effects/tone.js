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
  function playNoteSequence(notesFrequenciesToPlay, onEnd) {
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
      (time, { note }) => {
        if (note !== "END") {
          const noteDotEl = document.getElementById(`note-${note}-hz`);
          noteDotEl.classList.add("is-playing");
          setTimeout(
            () => noteDotEl.classList.remove("is-playing"),
            noteDuration * 1000
          );
          synth.triggerAttackRelease(note, noteDuration, time);
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
  function playNote(noteToPlay) {
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
