import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { tools } from '@/data/tools'
import type { ToolFilterCategory } from '@/type/tool'

export const useToolsStore = defineStore('tools', () => {
  const query = ref('')
  const selectedCategory = ref<ToolFilterCategory>('Semua')

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

  function resetFilters() {
    query.value = ''
    selectedCategory.value = 'Semua'
  }

  return { query, selectedCategory, filteredTools, resetFilters }
})
