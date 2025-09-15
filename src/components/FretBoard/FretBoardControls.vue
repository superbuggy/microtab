<script setup lang="ts">
import { useTemperament } from "@/state/temperament";
const { chooseTemperament, chosenTemperamentName, temperamentNames } = useTemperament();

import { useGuitar } from "@/state/guitar";
import { useTone } from "@/effects/tone";
import { useFretBoardControls } from "@/state/fretboard-controls";
import { ref } from "vue";

const { shouldShow12TETFrets } = useFretBoardControls();

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



<template>
  <section>
    <select @change="chooseTemperament(($event.target as HTMLSelectElement).value)">
      <option
        v-for="temperamentName in temperamentNames"
        :key="temperamentName"
        :value="temperamentName"
        :selected="temperamentName === chosenTemperamentName"
      >
        {{ temperamentName }}
      </option>
    </select>
    <select @input="selectScale(($event.target as HTMLSelectElement).value)">
      <option
        v-for="scaleName in scaleNames"
        :key="scaleName"
        :value="scaleName"
        :selected="scaleName === selectedScaleName"
      >
        {{ scaleName }}
      </option>
    </select>
    <select @change="selectNotesPerString(($event.target as HTMLSelectElement).value)">
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
    <input
      id=""
      v-model="startingFromFret"
      type="number"
      name=""
    >
  </section>
  <section>
    <button
      v-if="!isPlayingSequence"
      @click="playScale"
    >
      Play Scale
    </button>
    <button
      v-else
      @click="stopPlayingScale"
    >
      Stop Playing
    </button>
    <label for="tempo">
      <span>{{ tempo }}</span> BPM
      <input
        type="range"
        min="30"
        max="180"
        :value="tempo"
        @input="changeTempo"
      >
    </label>
    <label for="loop">
      Loop?
      <input
        v-model="isLooped"
        type="checkbox"
      >
    </label>
  </section>
  <section>
    <label for="">
      12Tet guides
      <input
        v-model="shouldShow12TETFrets"
        type="checkbox"
      >
    </label>
  </section>
</template>