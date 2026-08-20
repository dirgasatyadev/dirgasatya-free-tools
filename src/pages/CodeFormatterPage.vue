<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from "vue";
import { Icon } from "@iconify/vue";
import ToolPageShell from "@/components/ToolPageShell.vue";
import { formatFileSize } from "@/composables/usePngToAvif";
import {
  codeByteSize,
  codeFileExtension,
  codeLanguageOptions,
  codeSamples,
  codeSavings,
  runCodeFormatterWorker,
  type CodeFormatAction,
  type CodeIndent,
  type CodeLanguage,
} from "@/composables/useCodeFormatter";
import { codeFormatterAliases } from "@/data/toolAliases";

const props = defineProps<{ initialLanguage?: CodeLanguage }>();
const language = ref<CodeLanguage>(props.initialLanguage ?? "javascript");
const input = ref(codeSamples[language.value]);
const output = ref("");
const indent = ref<CodeIndent>("2");
const lastAction = ref<CodeFormatAction>("beautify");
const isProcessing = ref(false);
const errorMessage = ref("");
const copied = ref(false);
let controller: AbortController | null = null;

const selectedLanguage = computed(() =>
  codeLanguageOptions.find((option) => option.value === language.value)!,
);
const metrics = computed(() => codeSavings(input.value, output.value));
const aliasPath = (value: CodeLanguage) =>
  codeFormatterAliases.find((route) => route.language === value)?.path ??
  "/tools/code-formatter-minifier";
const outputLabel = computed(() =>
  lastAction.value === "beautify"
    ? "Formatted output"
    : language.value === "typescript"
      ? "Minified JavaScript output"
      : "Minified output",
);

watch(
  () => props.initialLanguage,
  (value) => {
    if (value) switchLanguage(value);
  },
);
watch(input, () => {
  output.value = "";
  errorMessage.value = "";
});

function switchLanguage(value: CodeLanguage) {
  controller?.abort();
  language.value = value;
  input.value = codeSamples[value];
  output.value = "";
  errorMessage.value = "";
  lastAction.value = "beautify";
}
function cancelProcessing() {
  controller?.abort();
}
async function process(action: CodeFormatAction) {
  if (isProcessing.value) return;
  isProcessing.value = true;
  errorMessage.value = "";
  output.value = "";
  lastAction.value = action;
  const activeController = new AbortController();
  controller = activeController;
  try {
    output.value = await runCodeFormatterWorker(
      { source: input.value, language: language.value, action, indent: indent.value },
      activeController.signal,
    );
  } catch (error) {
    if (!(error instanceof DOMException && error.name === "AbortError"))
      errorMessage.value = error instanceof Error ? error.message : "Code tidak dapat diproses.";
  } finally {
    controller = null;
    isProcessing.value = false;
  }
}
async function copyOutput() {
  if (!output.value) return;
  await navigator.clipboard.writeText(output.value);
  copied.value = true;
  window.setTimeout(() => (copied.value = false), 1_200);
}
function downloadOutput() {
  if (!output.value) return;
  const extension = codeFileExtension(language.value, lastAction.value);
  const blob = new Blob([output.value], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `code.${lastAction.value === "minify" ? "min." : ""}${extension}`;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1_000);
}
async function handleFile(event: Event) {
  const element = event.target as HTMLInputElement;
  const file = element.files?.[0];
  element.value = "";
  if (!file) return;
  if (file.size > 2 * 1024 * 1024) {
    errorMessage.value = "File maksimal 2 MB.";
    return;
  }
  input.value = await file.text();
}
onBeforeUnmount(() => controller?.abort());
</script>

<template>
  <ToolPageShell
    title="Code Formatter & Minifier"
    description="Beautify dan minify HTML, CSS, JavaScript, TypeScript, atau SQL dengan satu shared engine."
    icon="mdi:code-braces"
    category="Developer"
  >
    <nav class="grid grid-cols-2 gap-2 sm:grid-cols-5" aria-label="Bahasa code">
      <RouterLink
        v-for="option in codeLanguageOptions"
        :key="option.value"
        :to="aliasPath(option.value)"
        class="flex min-h-11 items-center justify-center rounded-xl border px-3 text-sm font-black transition"
        :class="
          language === option.value
            ? 'border-indigo-500 bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300'
            : 'border-slate-200 text-slate-500 dark:border-slate-700'
        "
        @click="switchLanguage(option.value)"
        >{{ option.label }}</RouterLink
      >
    </nav>
    <div class="mt-6 grid gap-6 xl:grid-cols-2">
      <section>
        <div class="flex items-center justify-between gap-3">
          <div>
            <h2 class="font-black">{{ selectedLanguage.label }} input</h2>
            <p class="mt-1 text-xs font-semibold text-slate-500">
              {{ input.length.toLocaleString("id-ID") }} karakter ·
              {{ formatFileSize(codeByteSize(input)) }}
            </p>
          </div>
          <label class="cursor-pointer text-sm font-bold text-indigo-600"
            ><input type="file" class="sr-only" @change="handleFile" />Upload file</label
          >
        </div>
        <textarea
          v-model="input"
          rows="22"
          spellcheck="false"
          class="mt-3 w-full resize-y rounded-2xl border border-slate-200 bg-slate-950 p-4 font-mono text-sm leading-6 text-slate-100 outline-none focus:border-indigo-500"
          :placeholder="`Tempel ${selectedLanguage.label} di sini...`"
        ></textarea>
        <div class="mt-4 flex flex-wrap items-center gap-2">
          <span class="text-sm font-bold">Indent</span
          ><label
            v-for="option in [
              { value: '2', label: '2 spaces' },
              { value: '4', label: '4 spaces' },
              { value: 'tabs', label: 'Tabs' },
            ] as const"
            :key="option.value"
            class="cursor-pointer rounded-lg border px-3 py-2 text-xs font-bold"
            :class="
              indent === option.value
                ? 'border-indigo-500 bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300'
                : 'border-slate-200 dark:border-slate-700'
            "
            ><input
              v-model="indent"
              type="radio"
              :value="option.value"
              class="sr-only"
              :disabled="isProcessing"
            />{{ option.label }}</label
          >
        </div>
        <div class="mt-4 grid grid-cols-2 gap-3">
          <button
            type="button"
            class="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 font-bold text-white disabled:opacity-50"
            :disabled="isProcessing"
            @click="process('beautify')"
          >
            <Icon
              :icon="
                isProcessing && lastAction === 'beautify' ? 'mdi:loading' : 'mdi:format-align-left'
              "
              class="size-5"
              :class="{ 'animate-spin': isProcessing && lastAction === 'beautify' }"
            />Beautify</button
          ><button
            type="button"
            class="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 font-bold text-white disabled:opacity-50"
            :disabled="isProcessing"
            @click="process('minify')"
          >
            <Icon
              :icon="
                isProcessing && lastAction === 'minify' ? 'mdi:loading' : 'mdi:code-tags-check'
              "
              class="size-5"
              :class="{ 'animate-spin': isProcessing && lastAction === 'minify' }"
            />Minify
          </button>
        </div>
        <button
          v-if="isProcessing"
          type="button"
          class="mt-3 min-h-10 w-full rounded-xl bg-rose-50 font-bold text-rose-700 dark:bg-rose-500/10 dark:text-rose-300"
          @click="cancelProcessing"
        >
          Batalkan proses
        </button>
        <p v-if="language === 'typescript'" class="mt-3 text-xs leading-5 text-slate-500">
          Beautify mempertahankan TypeScript. Minify mentranspilasi type annotation dan menghasilkan
          JavaScript ES2020 yang siap dijalankan.
        </p>
      </section>
      <section>
        <div class="flex items-center justify-between gap-3">
          <div>
            <h2 class="font-black">{{ outputLabel }}</h2>
            <p class="mt-1 text-xs font-semibold text-slate-500">
              {{ output.length.toLocaleString("id-ID") }} karakter ·
              {{ formatFileSize(metrics.outputBytes) }}
            </p>
          </div>
          <div class="flex gap-2">
            <button
              type="button"
              class="min-h-9 rounded-lg border border-slate-200 px-3 text-sm font-bold disabled:opacity-40 dark:border-slate-700"
              :disabled="!output"
              @click="copyOutput"
            >
              {{ copied ? "Tersalin" : "Copy" }}</button
            ><button
              type="button"
              class="min-h-9 rounded-lg bg-emerald-600 px-3 text-sm font-bold text-white disabled:opacity-40"
              :disabled="!output"
              @click="downloadOutput"
            >
              Download
            </button>
          </div>
        </div>
        <textarea
          :value="output"
          readonly
          rows="22"
          spellcheck="false"
          class="mt-3 w-full resize-y rounded-2xl border border-slate-200 bg-slate-950 p-4 font-mono text-sm leading-6 text-slate-100 outline-none"
          placeholder="Hasil akan muncul di sini."
        ></textarea>
        <div v-if="output" class="mt-4 grid grid-cols-3 gap-3 text-center">
          <div class="rounded-xl bg-slate-50 p-3 dark:bg-slate-800">
            <span class="block text-xs font-bold text-slate-500">Input</span
            ><strong>{{ formatFileSize(metrics.inputBytes) }}</strong>
          </div>
          <div class="rounded-xl bg-slate-50 p-3 dark:bg-slate-800">
            <span class="block text-xs font-bold text-slate-500">Output</span
            ><strong>{{ formatFileSize(metrics.outputBytes) }}</strong>
          </div>
          <div
            class="rounded-xl p-3"
            :class="
              metrics.savedPercentage >= 0
                ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300'
                : 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300'
            "
          >
            <span class="block text-xs font-bold">Savings</span
            ><strong>{{ metrics.savedPercentage.toFixed(1) }}%</strong>
          </div>
        </div>
      </section>
    </div>
    <p
      v-if="errorMessage"
      role="alert"
      class="mt-5 rounded-xl bg-rose-50 p-3 text-sm font-semibold text-rose-700 dark:bg-rose-500/10 dark:text-rose-300"
    >
      {{ errorMessage }}
    </p>
  </ToolPageShell>
</template>
