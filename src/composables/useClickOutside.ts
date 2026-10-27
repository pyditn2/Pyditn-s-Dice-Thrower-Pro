import { onBeforeUnmount, onMounted, type Ref } from 'vue'

/** Calls `handler` on pointer presses outside of `element` (removed again on unmount). */
export function useClickOutside(element: Ref<HTMLElement | null>, handler: () => void): void {
  const listener = (event: PointerEvent) => {
    if (element.value && !element.value.contains(event.target as Node)) handler()
  }
  onMounted(() => document.addEventListener('pointerdown', listener))
  onBeforeUnmount(() => document.removeEventListener('pointerdown', listener))
}
