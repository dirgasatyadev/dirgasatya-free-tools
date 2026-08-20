import { computed, ref, type Ref } from 'vue'
import { getEditableShapeNodes, type SvgMakerElement } from '@/composables/useSvgMaker'

export function useSvgSelection(selectedElement: Ref<SvgMakerElement | null>) {
  const selectedNodeId = ref<string | null>(null)
  const editableNodes = computed(() => selectedElement.value ? getEditableShapeNodes(selectedElement.value) : [])
  const selectedNode = computed(() => editableNodes.value.find((node) => node.id === selectedNodeId.value) ?? null)
  return { selectedNodeId, editableNodes, selectedNode }
}
