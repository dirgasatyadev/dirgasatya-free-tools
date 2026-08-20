import type { Ref } from 'vue'

export function useSvgPointer(options: { canvas: Ref<SVGSVGElement | null>; width: Ref<number>; height: Ref<number>; snapToGrid: Ref<boolean>; gridSize: Ref<number> }) {
  function snapValue(value: number) {
    if (!options.snapToGrid.value) return Math.round(value)
    const safeGridSize = Math.max(1, options.gridSize.value)
    return Math.round(value / safeGridSize) * safeGridSize
  }
  function canvasCoordinates(event: PointerEvent) {
    const canvas = options.canvas.value
    if (!canvas) return null
    const bounds = canvas.getBoundingClientRect()
    if (bounds.width <= 0 || bounds.height <= 0) return null
    return { x: snapValue(((event.clientX - bounds.left) / bounds.width) * options.width.value), y: snapValue(((event.clientY - bounds.top) / bounds.height) * options.height.value) }
  }
  return { snapValue, canvasCoordinates }
}
