import { createRouter, createWebHashHistory } from 'vue-router'

import ChecksView from '@/views/ChecksView.vue'

export const TABS = [
  { path: '/', name: 'checks', title: 'Würfelproben' },
  { path: '/frei', name: 'free', title: 'Freies Würfeln' },
  { path: '/manuell', name: 'manual', title: 'Manuelle Eingabe' },
  { path: '/charakter', name: 'character', title: 'Charakterwerte' },
] as const

// Hash history works on any static host and inside the desktop app without server rewrites.
const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: '/', name: 'checks', component: ChecksView },
    { path: '/frei', name: 'free', component: () => import('@/views/FreeRollView.vue') },
    { path: '/manuell', name: 'manual', component: () => import('@/views/ManualCheckView.vue') },
    { path: '/charakter', name: 'character', component: () => import('@/views/CharacterView.vue') },
    { path: '/:pathMatch(.*)*', redirect: '/' },
  ],
})

export default router
