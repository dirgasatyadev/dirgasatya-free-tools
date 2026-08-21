import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import JsonExplorerTree from '@/components/JsonExplorerTree.vue'
import { flattenJsonTree } from '@/composables/useJsonExplorer'

describe('JsonExplorerTree', () => {
  it('merender hanya row yang berada di sekitar viewport', async () => {
    const json = Object.fromEntries(
      Array.from({ length: 2_000 }, (_, index) => [`item-${index}`, index]),
    )
    const nodes = flattenJsonTree(json)
    const wrapper = mount(JsonExplorerTree, {
      props: {
        nodes,
        expandedPaths: new Set(['$']),
        matchedPaths: new Set<string>(),
      },
    })

    expect(wrapper.findAll('[role="treeitem"]').length).toBeLessThanOrEqual(30)
    expect(wrapper.findAll('[role="treeitem"]').length).toBeGreaterThan(0)

    const viewport = wrapper.get('[role="tree"]')
    Object.defineProperty(viewport.element, 'scrollTop', { value: 18_000, configurable: true, writable: true })
    await viewport.trigger('scroll')
    expect(wrapper.text()).toContain('item-500')
    expect(wrapper.findAll('[role="treeitem"]').length).toBeLessThanOrEqual(30)

    await wrapper.setProps({ matchedPaths: new Set(['$["item-1500"]']) })
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).toContain('item-1500')
    expect(wrapper.findAll('[role="treeitem"]').length).toBeLessThanOrEqual(30)
  })
})
