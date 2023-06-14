<template>
  <section>
    <select name="" id="" @input="selectScale($event.target.value)">
      <option
        v-for="scaleName in scaleNames"
        :key="scaleName"
        :value="scaleName"
        :selected="scaleName === selectedScaleName"
      >
        {{ scaleName }}
      </option>
    </select>
    <select @change="selectNotesPerString($event.target.value)">
      <option
        v-for="notesPerStringSelection in ['All', 3, 4, 5]"
        :key="notesPerStringSelection"
        :value="notesPerStringSelection"
        :selected="notesPerString === notesPerStringSelection"
      >
        {{
          `${
            notesPerStringSelection === -1 ? "All" : notesPerStringSelection
          } notes per string`
        }}
      </option>
    </select>
    <input type="number" name="" id="" v-model="startingFromFret" />
  </section>
  <section>
    <button v-if="!isPlayingSequence" @click="playScale">Play Scale</button>
    <button v-else @click="stopPlayingScale">Stop Playing</button>
    <label for="tempo">
      <span>{{ tempo }}</span> BPM
      <input type="range" min="30" max="180" :value="tempo" @input="changeTempo" />
    </label>
    <label for="loop">
      Loop?
      <input type="checkbox" v-model="isLooped" />
    </label>
  </section>
  <section>
    <label for="">
      12Tet guides
      <input type="checkbox" v-model="shouldShow12TETFrets" />
    </label>
    <label for="" v-if="shouldShow12TETFrets">
      Invert fret colors
      <input type="checkbox" v-model="areFretColorsInverted" />
    </label>
  </section>
</template>

<script setup>
import { useGuitar } from "../state/guitar";
import { useTone } from "../effects/tone";
import { useFretBoardControls } from "../state/fretboard-controls";
import { ref } from "vue";

const { shouldShow12TETFrets, areFretColorsInverted } = useFretBoardControls();

// import * as Tone from "tone";

// const tempo = ref(120);

const { changeTempo, tempo, isLooped, bps, playNoteSequence, stopPlayback } = useTone();

const {
  scaleNames,
  selectScale,
  selectedScaleName,
  notesPerString,
  selectNotesPerString,
  startingFromFret,
  scaleNotesOnStrings,
} = useGuitar();
const isPlayingSequence = ref(false);

function playScale() {
  isPlayingSequence.value = true;
  const ascendingScale = Object.values(scaleNotesOnStrings.value)
    .flat()
    .map(({ note }, index) => ({
      time: index / bps.value,
      note: [note.frequency],
    }));
  const notesToPlay = [
    ...ascendingScale,
    ...ascendingScale
      .slice()
      .reverse()
      .map(({ note }, index) => ({
        time: (ascendingScale.length + index) / bps.value,
        note,
      })),
  ];
  const onEnd = () => (isPlayingSequence.value = false);

  playNoteSequence(notesToPlay, onEnd);
}

function stopPlayingScale() {
  isPlayingSequence.value = false;
  stopPlayback();
}
</script>
