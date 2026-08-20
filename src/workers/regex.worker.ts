import { replaceRegex, testRegex } from '@/composables/useUtilityTools'

interface RegexWorkerRequest {
  pattern: string
  flags: string
  text: string
  replacement: string
}

self.onmessage = (event: MessageEvent<RegexWorkerRequest>) => {
  const { pattern, flags, text, replacement } = event.data
  try {
    self.postMessage({
      matches: testRegex(pattern, flags, text),
      replacedText: replacement ? replaceRegex(pattern, flags, text, replacement) : '',
      errorMessage: '',
    })
  } catch (error) {
    self.postMessage({
      matches: [],
      replacedText: '',
      errorMessage: error instanceof Error ? error.message : 'Regex tidak valid.',
    })
  }
}
