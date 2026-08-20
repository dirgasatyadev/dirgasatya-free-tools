import { computed, ref } from 'vue'

export function useSvgHistory<T>(capture: () => T, restore: (snapshot: T) => void) {
  const past: T[] = []
  const future: T[] = []
  const revision = ref(0)
  function checkpoint() { past.push(structuredClone(capture())); if (past.length > 100) past.shift(); future.length = 0; revision.value += 1 }
  function undo() { const snapshot = past.pop(); if (!snapshot) return; future.push(structuredClone(capture())); restore(structuredClone(snapshot)); revision.value += 1 }
  function redo() { const snapshot = future.pop(); if (!snapshot) return; past.push(structuredClone(capture())); restore(structuredClone(snapshot)); revision.value += 1 }
  return { canUndo: computed(() => revision.value >= 0 && past.length > 0), canRedo: computed(() => revision.value >= 0 && future.length > 0), checkpoint, undo, redo }
}
