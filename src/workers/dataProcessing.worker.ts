import { evaluateJsonPath } from '@/composables/useJsonExplorer'
import { generateTypeScriptFromJson, parseJsonForTypeScript } from '@/composables/useJsonToTypeScript'
import type { DataProcessingWorkerRequest } from '@/composables/useDataProcessingWorker'

self.onmessage = (event: MessageEvent<DataProcessingWorkerRequest>) => {
  try {
    const request = event.data
    const result = request.action === 'jsonpath'
      ? evaluateJsonPath(request.json, request.expression)
      : generateTypeScriptFromJson(parseJsonForTypeScript(request.source), request.options)
    self.postMessage({ result })
  } catch (error) {
    self.postMessage({ error: error instanceof Error ? error.message : 'Pemrosesan data gagal.' })
  }
}
