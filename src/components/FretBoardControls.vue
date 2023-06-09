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
    <button @click="playScale">Play Scale</button>
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

const { shouldShow12TETFrets, areFretColorsInverted } = useFretBoardControls();

// import * as Tone from "tone";

// const tempo = ref(120);

const { changeTempo, tempo, isLooped, bps, playNoteSequence } = useTone();

const {
  scaleNames,
  selectScale,
  selectedScaleName,
  notesPerString,
  selectNotesPerString,
  startingFromFret,
  scaleNotesOnStrings,
} = useGuitar();

function playScale() {
  const ascendingScale = Object.values(scaleNotesOnStrings.value)
    .flat()
    .map(({ note }, index) => ({
      time: index / bps.value,
      note: [note.frequency * 2],
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

  playNoteSequence(notesToPlay);
}
</script>
