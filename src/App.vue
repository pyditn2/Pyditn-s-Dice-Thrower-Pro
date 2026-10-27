<script setup lang="ts">
import { ref } from 'vue'

import AnimatedBackground from '@/background/AnimatedBackground.vue'
import CharacterBar from '@/components/CharacterBar.vue'
import OptionsMenu from '@/components/OptionsMenu.vue'
import { startDiceEngine } from '@/composables/useDiceEngine'
import { TABS } from '@/router'
import { getInitialState } from '@/stores/persisted'

startDiceEngine()

const importReport = ref(getInitialState().importReport)

function importMessage(): string {
  const report = importReport.value!
  const parts: string[] = []
  if (report.characterCount > 0) {
    parts.push(report.characterCount === 1 ? '1 Charakter' : `${report.characterCount} Charaktere`)
  }
  if (report.settingsImported) parts.push('Ihre Einstellungen')
  let message = `Aus der alten Version übernommen: ${parts.join(' und ')}.`
  if (report.unknownTalents.length > 0) {
    message += ` Nicht übernommen (unbekannte Talente): ${report.unknownTalents.join(', ')}.`
  }
  return message
}
</script>

<template>
  <AnimatedBackground />
  <OptionsMenu />

  <div class="app">
    <nav class="tabs" aria-label="Bereiche">
      <RouterLink v-for="tab in TABS" :key="tab.path" :to="tab.path" class="tab">
        {{ tab.title }}
      </RouterLink>
    </nav>

    <div v-if="importReport" class="notice" role="status">
      <span>{{ importMessage() }}</span>
      <button aria-label="Hinweis schließen" @click="importReport = null">×</button>
    </div>

    <main class="content panel">
      <CharacterBar />
      <RouterView />
    </main>
  </div>
</template>

<style scoped>
.app {
  max-width: 1200px;
  margin: 0 auto;
  padding: 1rem 1rem 2rem;
  text-align: center;
}

.tabs {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 0.5rem 1rem;
  padding: 0 3.5rem 0.5rem;
  margin-bottom: 1rem;
  border-bottom: 1px solid #333;
}

.tab {
  padding: 0.5rem 1rem;
  border-radius: var(--radius);
  background: rgba(51, 51, 51, 0.8);
  color: var(--text);
  text-decoration: none;
  font-size: 1.05rem;
  border-bottom: 2px solid transparent;
}

.tab:hover {
  background: rgba(68, 68, 68, 0.8);
}

.tab.router-link-exact-active {
  background: #000;
  border-bottom-color: var(--accent);
  font-weight: bold;
}

.notice {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  max-width: 48rem;
  margin: 0 auto 1rem;
  padding: 0.6rem 0.9rem;
  border: 1px solid var(--accent);
  border-radius: var(--radius);
  background: rgba(66, 185, 131, 0.12);
  text-align: left;
}

.notice button {
  background: none;
  border: none;
  font-size: 1.3rem;
  line-height: 1;
}

.content {
  min-height: 60vh;
}

@media (max-width: 640px) {
  .app {
    padding: 0.5rem 0.5rem 1.5rem;
  }
  .tabs {
    padding: 0 3rem 0.5rem 0;
    justify-content: flex-start;
  }
  .tab {
    padding: 0.4rem 0.6rem;
    font-size: 0.95rem;
  }
}
</style>
