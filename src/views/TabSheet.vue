<script setup>
import TabChord from "../components/TabChord.vue";
import { useChords } from "../state/chord";

const { chords } = useChords();
console.log(chords)
</script>

<template>
  <main>
    <tab-chord v-for="chord in chords" :key="chord.id" :chord="chord" />
  </main>
</template>

<style scoped>
svg {
  width: 200px;
}
</style>
