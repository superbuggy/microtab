<script setup lang="ts">
const props = defineProps<{
  title: string;
}>();

const open = defineModel<boolean>("open", { default: false });

function handleToggle(event: Event) {
  open.value = (event.target as HTMLDetailsElement).open;
}
</script>

<template>
  <details
    class="collapsible"
    :open="open"
    @toggle="handleToggle"
  >
    <summary>{{ props.title }}</summary>
    <div class="collapsible-content">
      <slot />
    </div>
  </details>
</template>

<style scoped>
.collapsible {
  margin: 1.5rem 0;
  border: 1px solid #ddd;
  border-radius: 6px;
  padding: 0.75rem 1rem;
}

summary {
  cursor: pointer;
  font-weight: 600;
  user-select: none;
}

.collapsible-content {
  padding-top: 0.75rem;
}
</style>
