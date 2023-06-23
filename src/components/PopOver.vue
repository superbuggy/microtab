<template v-if="x !== null && y !== null">
  <svg>
    <foreignObject :x="x" :y="y" :height="height" :width="150">
      <slot></slot>
    </foreignObject>
  </svg>
</template>
<script setup>
import { toRefs } from "vue";
const props = defineProps({
  x: { type: Number, default: 0 },
  y: { type: Number, default: 0 },
  height: { type: [Number, String], default: "3rem" },
});
const { x, y } = toRefs(props);
</script>
