import { computed, ref, watch } from 'vue'
import { defineStore } from 'pinia'
import { tools } from '@/data/tools'
import type { ToolFilterCategory } from '@/type/tool'

export const useToolsStore = defineStore('tools', () => {
  const pageSize = 12
  const query = ref('')
  const selectedCategory = ref<ToolFilterCategory>('Semua')
  const visibleCount = ref(pageSize)

  const filteredTools = computed(() => {
    const keyword = query.value.trim().toLocaleLowerCase('id')

    return tools.filter((tool) => {
      const matchesCategory =
        selectedCategory.value === 'Semua' || tool.category === selectedCategory.value
      const matchesQuery =
        !keyword ||
        [tool.name, tool.description, tool.category].some((value) =>
          value.toLocaleLowerCase('id').includes(keyword),
        )

      return matchesCategory && matchesQuery
    })
  })

  const visibleTools = computed(() => filteredTools.value.slice(0, visibleCount.value))
  const hasMore = computed(() => visibleCount.value < filteredTools.value.length)
  const remainingCount = computed(() =>
    Math.min(pageSize, Math.max(0, filteredTools.value.length - visibleCount.value)),
  )

  function resetPagination() {
    visibleCount.value = pageSize
  }

  function loadMore() {
    if (!hasMore.value) return
    visibleCount.value = Math.min(visibleCount.value + pageSize, filteredTools.value.length)
  }

  watch([query, selectedCategory], resetPagination)

  function resetFilters() {
    query.value = ''
    selectedCategory.value = 'Semua'
    resetPagination()
  }

  return {
    query,
    selectedCategory,
    filteredTools,
    visibleTools,
    visibleCount,
    hasMore,
    remainingCount,
    pageSize,
    loadMore,
    resetFilters,
  }
})
