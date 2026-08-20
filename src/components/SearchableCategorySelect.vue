<script setup lang="ts">
import 'select2/dist/css/select2.css'

import $ from 'jquery'
import * as select2Module from 'select2'
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import type { ToolFilterCategory } from '@/type/tool'

type Select2Factory = (root: Window, jquery: JQueryStatic) => JQueryStatic

const select2Factory =
  (select2Module as unknown as { default?: Select2Factory }).default ??
  (select2Module as unknown as Select2Factory)

if (typeof $.fn.select2 !== 'function') select2Factory(window, $)

interface CategoryOption {
  value: ToolFilterCategory
  label: string
}

const props = defineProps<{
  modelValue: ToolFilterCategory
  options: CategoryOption[]
}>()

const emit = defineEmits<{
  'update:modelValue': [value: ToolFilterCategory]
}>()

const rootElement = ref<HTMLDivElement>()
const selectElement = ref<HTMLSelectElement>()
let selectInstance: JQuery<HTMLSelectElement> | undefined
let isInitialized = false

onMounted(async () => {
  await nextTick()
  if (!selectElement.value || !rootElement.value) return

  selectInstance = $(selectElement.value)
  const select2Options: Select2.Options & { selectionCssClass: string } = {
    width: '100%',
    minimumResultsForSearch: 0,
    dropdownParent: $(rootElement.value),
    selectionCssClass:
      '!min-h-13 flex items-center !rounded-2xl !border-slate-200 !bg-slate-50 px-3 dark:!border-slate-700 dark:!bg-slate-800 dark:!text-slate-200 [&_.select2-selection__arrow]:!h-full',
    dropdownCssClass:
      '!rounded-xl !border-slate-200 dark:!border-slate-700 dark:!bg-slate-900 dark:!text-slate-200 [&_.select2-search__field]:!rounded-lg [&_.select2-search__field]:!border-slate-300 dark:[&_.select2-search__field]:!border-slate-600 dark:[&_.select2-search__field]:!bg-slate-800 dark:[&_.select2-search__field]:!text-white dark:[&_.select2-results__option--selected]:!bg-slate-800',
    language: {
      noResults: () => 'Kategori tidak ditemukan',
      searching: () => 'Mencari...',
    },
  }

  selectInstance.select2(select2Options)
  isInitialized = true

  selectInstance.on('change.categorySelect', () => {
    const value = selectInstance?.val()
    if (typeof value === 'string') emit('update:modelValue', value as ToolFilterCategory)
  })
})

watch(
  () => props.modelValue,
  (value) => {
    if (selectInstance?.val() !== value) selectInstance?.val(value).trigger('change.select2')
  },
)

onBeforeUnmount(() => {
  selectInstance?.off('.categorySelect')
  if (isInitialized) selectInstance?.select2('destroy')
})
</script>

<template>
  <div ref="rootElement" class="relative min-w-0">
    <label class="sr-only" :for="`category-select-${$attrs.id ?? 'tools'}`">Cari kategori</label>
    <select
      :id="`category-select-${$attrs.id ?? 'tools'}`"
      ref="selectElement"
      :value="modelValue"
      class="w-full"
      aria-label="Cari dan pilih kategori"
    >
      <option v-for="option in options" :key="option.value" :value="option.value">
        {{ option.label }}
      </option>
    </select>
  </div>
</template>
