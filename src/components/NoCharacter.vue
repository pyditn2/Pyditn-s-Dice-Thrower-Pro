<script setup lang="ts">
defineProps<{ action: string }>()
</script>

<template>
  <p class="no-character">
    Bitte wählen Sie einen Charakter aus oder legen Sie einen neuen an, um {{ action }}.
  </p>
</template>

<style scoped>
.no-character {
  max-width: 32rem;
  margin: 2rem auto;
  padding: 2rem;
  border-radius: var(--radius);
  background: var(--surface-strong);
  color: var(--muted);
}
</style>
