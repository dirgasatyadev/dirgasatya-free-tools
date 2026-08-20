import { describe, expect, it } from 'vitest'
import { toolRegistry, tools } from '@/data/tools'
import router from '@/router'

describe('tool registry', () => {
  it('menjadi satu-satunya sumber data katalog', () => {
    expect(tools).toHaveLength(toolRegistry.length)

    tools.forEach((tool, index) => {
      const registryTool = toolRegistry[index]!

      expect(tool).toEqual({
        id: registryTool.id,
        toolKey: registryTool.toolKey,
        name: registryTool.name,
        description: registryTool.description,
        category: registryTool.category,
        icon: registryTool.icon,
        path: registryTool.path,
        inputMimeTypes: registryTool.inputMimeTypes,
        status: registryTool.status,
      })
      expect(registryTool.component).toBeTypeOf('function')
    })
  })

  it('tidak memiliki id, toolKey, atau path ganda', () => {
    const ids = toolRegistry.map((tool) => tool.id)
    const toolKeys = toolRegistry.map((tool) => tool.toolKey)
    const paths = toolRegistry.map((tool) => tool.path)

    expect(new Set(ids).size).toBe(ids.length)
    expect(new Set(toolKeys).size).toBe(toolKeys.length)
    expect(new Set(paths).size).toBe(paths.length)
  })

  it('menyimpan props route khusus bersama tool terkait', () => {
    expect(toolRegistry.find((tool) => tool.toolKey === 'bcrypt-encoder-decoder')?.routeProps).toEqual({
      algorithm: 'bcrypt',
    })
    expect(toolRegistry.find((tool) => tool.toolKey === 'base64-encoder-decoder')?.routeProps).toEqual({
      type: 'base64',
    })
  })

  it('mendaftarkan seluruh tool ke router dari registry yang sama', () => {
    const routes = router.getRoutes()

    toolRegistry.forEach((tool) => {
      expect(routes.some((route) => route.name === tool.toolKey && route.path === tool.path)).toBe(true)
    })
  })
})
