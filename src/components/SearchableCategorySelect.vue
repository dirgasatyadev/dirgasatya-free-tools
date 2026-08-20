<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, useId, watch } from 'vue'
import { Icon } from '@iconify/vue'
import type { ToolFilterCategory } from '@/type/tool'

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

const componentId = useId()
const listboxId = `${componentId}-category-listbox`
const rootElement = ref<HTMLDivElement | null>(null)
const triggerButton = ref<HTMLButtonElement | null>(null)
const searchInput = ref<HTMLInputElement | null>(null)
const isOpen = ref(false)
const searchQuery = ref('')
const activeIndex = ref(0)

const selectedOption = computed(
  () => props.options.find((option) => option.value === props.modelValue) ?? props.options[0],
)

const filteredOptions = computed(() => {
  const keyword = searchQuery.value.trim().toLocaleLowerCase('id')
  if (!keyword) return props.options
  return props.options.filter((option) =>
    `${option.value} ${option.label}`.toLocaleLowerCase('id').includes(keyword),
  )
})

async function openDropdown() {
  if (isOpen.value) return
  searchQuery.value = ''
  const selectedIndex = props.options.findIndex((option) => option.value === props.modelValue)
  activeIndex.value = Math.max(0, selectedIndex)
  isOpen.value = true
  await nextTick()
  searchInput.value?.focus()
}

function closeDropdown(returnFocus = false) {
  if (!isOpen.value) return
  isOpen.value = false
  searchQuery.value = ''
  if (returnFocus) void nextTick(() => triggerButton.value?.focus())
}

function selectOption(option: CategoryOption) {
  emit('update:modelValue', option.value)
  closeDropdown(true)
}

function moveActiveOption(offset: number) {
  if (filteredOptions.value.length === 0) return
  activeIndex.value =
    (activeIndex.value + offset + filteredOptions.value.length) % filteredOptions.value.length
}

function handleSearchKeydown(event: KeyboardEvent) {
  if (event.key === 'ArrowDown') {
    event.preventDefault()
    moveActiveOption(1)
    return
  }
  if (event.key === 'ArrowUp') {
    event.preventDefault()
    moveActiveOption(-1)
    return
  }
  if (event.key === 'Enter') {
    event.preventDefault()
    const option = filteredOptions.value[activeIndex.value]
    if (option) selectOption(option)
    return
  }
  if (event.key === 'Escape') {
    event.preventDefault()
    closeDropdown(true)
  }
}

function handleDocumentPointerDown(event: PointerEvent) {
  if (event.target instanceof Node && !rootElement.value?.contains(event.target)) closeDropdown()
}

watch(filteredOptions, () => {
  activeIndex.value = 0
})

onMounted(() => document.addEventListener('pointerdown', handleDocumentPointerDown))
onBeforeUnmount(() => document.removeEventListener('pointerdown', handleDocumentPointerDown))
</script>

<template>
  <div ref="rootElement" class="relative min-w-0">
    <button
      ref="triggerButton"
      type="button"
      role="combobox"
      class="flex min-h-13 w-full items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-left font-semibold text-slate-800 transition hover:border-indigo-300 hover:bg-white focus:border-indigo-400 focus:bg-white focus:outline-none focus:ring-4 focus:ring-indigo-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:hover:border-indigo-500 dark:hover:bg-slate-800 dark:focus:border-indigo-500 dark:focus:ring-indigo-500/15"
      :aria-expanded="isOpen"
      aria-haspopup="listbox"
      :aria-controls="listboxId"
      @click="isOpen ? closeDropdown() : openDropdown()"
      @keydown.down.prevent="openDropdown"
      @keydown.up.prevent="openDropdown"
    >
      <span class="min-w-0 truncate">{{ selectedOption?.label ?? 'Pilih kategori' }}</span>
      <Icon icon="mdi:chevron-down" class="size-5 shrink-0 text-slate-400 transition-transform" :class="{ 'rotate-180': isOpen }" aria-hidden="true" />
    </button>

    <div v-if="isOpen" class="absolute left-0 right-0 top-[calc(100%+0.5rem)] z-50 overflow-hidden rounded-2xl border border-slate-200 bg-white p-2 shadow-xl shadow-slate-900/10 dark:border-slate-700 dark:bg-slate-900 dark:shadow-black/30">
      <label class="flex min-h-11 items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 focus-within:border-indigo-400 focus-within:ring-2 focus-within:ring-indigo-100 dark:border-slate-700 dark:bg-slate-800 dark:focus-within:border-indigo-500 dark:focus-within:ring-indigo-500/15">
        <Icon icon="mdi:magnify" class="size-5 shrink-0 text-slate-400" aria-hidden="true" />
        <span class="sr-only">Cari kategori</span>
        <input ref="searchInput" v-model="searchQuery" type="search" role="searchbox" autocomplete="off" placeholder="Cari kategori..." class="min-w-0 flex-1 bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400 dark:text-white dark:placeholder:text-slate-500" @keydown="handleSearchKeydown" />
        <button v-if="searchQuery" type="button" class="grid size-7 shrink-0 place-items-center rounded-lg text-slate-400 transition hover:bg-slate-200 hover:text-slate-700 dark:hover:bg-slate-700 dark:hover:text-white" aria-label="Hapus pencarian kategori" @click="searchQuery = ''"><Icon icon="mdi:close" class="size-4" aria-hidden="true" /></button>
      </label>

      <div :id="listboxId" role="listbox" aria-label="Kategori tool" class="mt-2 max-h-72 space-y-1 overflow-y-auto overscroll-contain">
        <button
          v-for="(option, index) in filteredOptions"
          :key="option.value"
          type="button"
          role="option"
          class="flex min-h-10 w-full items-center justify-between gap-3 rounded-xl px-3 text-left text-sm font-semibold transition"
          :class="[
            option.value === modelValue ? 'bg-indigo-600 text-white' : 'text-slate-700 dark:text-slate-200',
            option.value !== modelValue && index === activeIndex ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300' : '',
          ]"
          :aria-selected="option.value === modelValue"
          @mouseenter="activeIndex = index"
          @click="selectOption(option)"
        >
          <span class="truncate">{{ option.label }}</span>
          <Icon v-if="option.value === modelValue" icon="mdi:check" class="size-5 shrink-0" aria-hidden="true" />
        </button>
        <p v-if="filteredOptions.length === 0" class="px-3 py-6 text-center text-sm font-semibold text-slate-500 dark:text-slate-400">Kategori tidak ditemukan</p>
      </div>
    </div>
  </div>
</template>
