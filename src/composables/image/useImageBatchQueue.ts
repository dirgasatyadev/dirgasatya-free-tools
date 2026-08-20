import { computed, type Ref } from 'vue'

export interface ImageQueueItem { status: 'queued' | 'processing' | 'completed' | 'error' }
export function useImageBatchQueue<T extends ImageQueueItem>(items: Ref<T[]>) {
  const completedCount = computed(() => items.value.filter((item) => item.status === 'completed').length)
  const failedCount = computed(() => items.value.filter((item) => item.status === 'error').length)
  const processedCount = computed(() => completedCount.value + failedCount.value)
  const progressPercentage = computed(() => items.value.length ? Math.round((processedCount.value / items.value.length) * 100) : 0)
  const hasProcessableItems = computed(() => items.value.some((item) => item.status === 'queued' || item.status === 'error'))
  return { completedCount, failedCount, processedCount, progressPercentage, hasProcessableItems }
}
