export function useObjectUrlPool() {
  const urls = new Set<string>()
  function create(blob: Blob) { const url = URL.createObjectURL(blob); urls.add(url); return url }
  function revoke(url: string) { if (!url) return; URL.revokeObjectURL(url); urls.delete(url) }
  function clear() { for (const url of urls) URL.revokeObjectURL(url); urls.clear() }
  return { create, revoke, clear, size: () => urls.size }
}
