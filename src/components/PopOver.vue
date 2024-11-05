<template v-if="x !== NaN && y !== NaN">
  <svg>
    <foreignObject
      :x="x"
      :y="y"
      :height="height"
      :width="150"
    >
      <slot />
    </foreignObject>
  </svg>
</template>
<script setup lang="ts">
import { toRefs } from "vue";
const props = withDefaults(defineProps<{
  x?: number;
  y?: number;
  height?: number | string;
}>(), {
  x: 0,
  y: 0,
  height: "3rem"
});
const { x, y } = toRefs(props);
</script>
