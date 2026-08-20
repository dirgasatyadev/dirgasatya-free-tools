import { storeToRefs } from 'pinia'
import { useToolsStore } from '@/stores/tools'

export function useTools() {
  const store = useToolsStore()
  const { query, selectedCategory, filteredTools } = storeToRefs(store)

  return { query, selectedCategory, filteredTools, resetFilters: store.resetFilters }
}
