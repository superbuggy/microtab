<script setup lang="ts">
import { ref } from "vue";
import TabChord from "@/components/TabChord.vue";
import FretBoard from "@/components/FretBoard/FretBoard.vue";
import PitchDetector from "@/components/PitchDetector.vue";
import ArrowIcon from "@/components/icons/ArrowIcon.vue";
// import PencilIcon from "@/components/icons/PencilIcon.vue";
import PlusIcon from "@/components/icons/PlusIcon.vue";
import TrashIcon from "@/components/icons/TrashIcon.vue";
import UploadIcon from "@/components/icons/UploadIcon.vue";
import DownloadIcon from "@/components/icons/DownloadIcon.vue";
import { useChords } from "@/state/chord";
import { useTemperament } from "@/state/temperament";

const { chooseTemperament, chosenTemperamentName, temperamentNames } = useTemperament();
const { chords, playChords, addChord, removeChord } = useChords();
const isUploadInputShown = ref(false);
const uploader = ref<HTMLInputElement | null>(null);

function save() {
  const json = JSON.stringify(chords.value);
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const fileName = "microtab-chords.json";
  a.download = fileName;
  a.href = url;
  a.textContent = `Download ${fileName}`;
  a.click();
}

const filerReader = new FileReader();
filerReader.onload = receivedText;
function load() {
  const file = uploader.value?.files?.[0];
  filerReader.readAsText(file as Blob);
}
function receivedText(e: Event) {
  const target = e.target as FileReader;
  const lines = target.result;
  chords.value = JSON.parse(lines as string);
  uploader.value = null;
  isUploadInputShown.value = false;
}
// }
</script>

<template>
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
  <Suspense>
    <FretBoard />
  </Suspense>
  <Suspense>
    <PitchDetector />
  </Suspense>
  <main>
    <div
      v-for="chord in chords"
      :key="chord.id"
      class="chord-container"
    >
      <TabChord :chord="chord" />
      <div class="icons">
        <!-- <PencilIcon /> -->
        <TrashIcon @click="removeChord(chord.id)" />
      </div>
    </div>
  </main>
  <div class="icons">
    <ArrowIcon @click="playChords" />
    <PlusIcon @click="addChord" />
    <span @click="save">
      <DownloadIcon />
    </span>
    <span @click="isUploadInputShown = !isUploadInputShown">
      <UploadIcon />
    </span>
  </div>
  <input
    v-if="isUploadInputShown"
    ref="uploader"
    type="file"
    @change="load"
  >
</template>

<style scoped lang="scss">
main {
  border: 1px solid black;
  padding: 1.5rem;
  margin: 1.5rem;
}

.chord-container {
  display: inline-block;
  width: 200px;
}

.icons {
  svg {
    width: 2rem;
  }
  padding: 1.5rem;
  margin: 1.5rem;
  display: inline-block;
  margin: 0 auto;
}
</style>
