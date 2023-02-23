<script setup>
import TabChord from "../components/TabChord.vue";
import ArrowIcon from "../components/icons/ArrowIcon.vue";
import PencilIcon from "../components/icons/PencilIcon.vue";
import PlusIcon from "../components/icons/PlusIcon.vue";
import TrashIcon from "../components/icons/TrashIcon.vue";
import { useChords } from "../state/chord";

const { chords, playChords } = useChords();
</script>

<template>
  <main>
    <tab-chord v-for="chord in chords" :key="chord.id" :chord="chord" />
  </main>
  <div class="icons">
    <ArrowIcon @click="playChords" />
    <PencilIcon />
    <TrashIcon />
    <PlusIcon />
  </div>
</template>

<style scoped lang="scss">
svg {
  width: 200px;
}

main {
  border: 1px solid black;
  padding: 1.5rem;
  margin: 1.5rem;
}

.icons {
  padding: 1.5rem;
  margin: 1.5rem;
  svg {
    width: 2rem;
  }
  display: inline-block;
  margin: 0 auto;
}
</style>
