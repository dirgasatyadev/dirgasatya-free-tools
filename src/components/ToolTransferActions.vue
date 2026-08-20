<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { Icon } from '@iconify/vue'
import { getCompatibleTransferTargets } from '@/composables/useToolTransfer'
import { useToolTransferStore } from '@/stores/toolTransfer'
import type { TransferableToolFile } from '@/type/toolTransfer'

const props = defineProps<{
  sourceToolKey: string
  files: TransferableToolFile[]
  disabled?: boolean
}>()

const router = useRouter()
const transferStore = useToolTransferStore()
const activeTargetKey = ref('')
const compatibleTargets = computed(() =>
  getCompatibleTransferTargets(props.sourceToolKey, props.files),
)

async function sendToTool(target: (typeof compatibleTargets.value)[number]) {
  if (props.disabled || activeTargetKey.value) return
  activeTargetKey.value = target.toolKey

  if (!transferStore.queueTransfer(props.sourceToolKey, target.toolKey, props.files)) {
    activeTargetKey.value = ''
    return
  }

  try {
    await router.push(target.path)
  } catch (error) {
    transferStore.clearTransfer()
    activeTargetKey.value = ''
    throw error
  }
}
</script>

<template>
  <section v-if="compatibleTargets.length" class="mt-4 rounded-2xl border border-cyan-200 bg-cyan-50/70 p-4 dark:border-cyan-500/25 dark:bg-cyan-500/10" aria-labelledby="tool-transfer-title">
    <div class="flex items-start gap-3">
      <span class="grid size-10 shrink-0 place-items-center rounded-xl bg-cyan-600 text-white"><Icon icon="mdi:transit-connection-variant" class="size-5" aria-hidden="true" /></span>
      <div>
        <h3 id="tool-transfer-title" class="font-black text-slate-950 dark:text-white">Lanjutkan ke tool lain</h3>
        <p class="mt-1 text-xs font-semibold leading-5 text-slate-500 dark:text-slate-400">{{ files.length }} file akan dipindahkan langsung di browser dan diproses otomatis.</p>
      </div>
    </div>
    <div class="mt-3 grid gap-2 sm:grid-cols-2">
      <button v-for="target in compatibleTargets" :key="target.toolKey" type="button" class="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-cyan-700 px-4 text-sm font-bold text-white transition hover:bg-cyan-800 disabled:cursor-wait disabled:opacity-60" :disabled="disabled || Boolean(activeTargetKey)" @click="sendToTool(target)">
        <Icon :icon="activeTargetKey === target.toolKey ? 'mdi:loading' : target.icon" class="size-5" :class="{ 'animate-spin': activeTargetKey === target.toolKey }" aria-hidden="true" />
        {{ activeTargetKey === target.toolKey ? 'Memindahkan file...' : `Buka di ${target.name}` }}
        <Icon v-if="activeTargetKey !== target.toolKey" icon="mdi:arrow-right" class="size-4" aria-hidden="true" />
      </button>
    </div>
  </section>
</template>
