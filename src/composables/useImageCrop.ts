export type CropShape = 'rectangle' | 'circle'

export function getCropShapeAspectRatio(shape: CropShape) {
  return shape === 'circle' ? 1 : Number.NaN
}

export function applyCanvasCropShape(canvas: HTMLCanvasElement, shape: CropShape) {
  if (shape === 'rectangle') return canvas

  const shapedCanvas = document.createElement('canvas')
  shapedCanvas.width = canvas.width
  shapedCanvas.height = canvas.height

  const context = shapedCanvas.getContext('2d')
  if (!context) throw new Error('Browser tidak dapat membuat hasil crop lingkaran.')

  context.beginPath()
  context.ellipse(
    shapedCanvas.width / 2,
    shapedCanvas.height / 2,
    shapedCanvas.width / 2,
    shapedCanvas.height / 2,
    0,
    0,
    Math.PI * 2,
  )
  context.clip()
  context.drawImage(canvas, 0, 0)

  return shapedCanvas
}
