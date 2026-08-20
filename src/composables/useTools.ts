import { storeToRefs } from 'pinia'
import { useToolsStore } from '@/stores/tools'

export function useTools() {
  const store = useToolsStore()
  const { query, selectedCategory, filteredTools, visibleTools, hasMore, remainingCount } =
    storeToRefs(store)

  return {
    query,
    selectedCategory,
    filteredTools,
    visibleTools,
    hasMore,
    remainingCount,
    loadMore: store.loadMore,
    resetFilters: store.resetFilters,
  }
}
