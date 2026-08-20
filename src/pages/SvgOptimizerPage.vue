<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from "vue";
import { Icon } from "@iconify/vue";
import ToolPageShell from "@/components/ToolPageShell.vue";
import { formatFileSize } from "@/composables/usePngToAvif";
import {
  getSvgDimensions,
  optimizeSvg,
  rasterizeSvg,
  svgDataUrl,
  svgOutputBaseName,
  svgSavings,
  validateAndSanitizeSvg,
  type SvgOptimizeOptions,
} from "@/composables/useSvgOptimizer";

const sample = `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="360" viewBox="0 0 640 360">
  <!-- Exported from design software -->
  <metadata>Example metadata</metadata>
  <g fill="none">
    <g>
      <rect width="640" height="360" rx="32" fill="#4f46e5"/>
      <circle cx="180" cy="180" r="88" fill="#ffffff"/>
      <path fill="#4f46e5" d="M145 180h70M180 145v70" stroke="#4f46e5" stroke-width="18" stroke-linecap="round"/>
      <text x="300" y="195" fill="white" font-family="sans-serif" font-size="48" font-weight="700">Dearga SVG</text>
    </g>
  </g>
</svg>`;
const input = ref(sample);
const output = ref("");
const fileName = ref("graphic.svg");
const validationMessage = ref("");
const errorMessage = ref("");
const copied = ref("");
const isOptimizing = ref(false);
const isExporting = ref(false);
const exportWidth = ref(640);
const exportHeight = ref(360);
const lockRatio = ref(true);
const rasterQuality = ref(90);
const options = ref<SvgOptimizeOptions>({
  removeMetadata: true,
  removeComments: true,
  removeGroups: true,
  simplifyAttributes: true,
  outputStyle: "minify",
});
let exportController: AbortController | null = null;

const comparison = computed(() => svgSavings(input.value, output.value || input.value));
const previewUrl = computed(() => {
  try {
    return svgDataUrl(output.value || validateAndSanitizeSvg(input.value));
  } catch {
    return "";
  }
});

watch(input, () => {
  output.value = "";
  validationMessage.value = "";
  errorMessage.value = "";
});

function syncDimensions(source: string) {
  const dimensions = getSvgDimensions(source);
  exportWidth.value = dimensions.width;
  exportHeight.value = dimensions.height;
}
function validate() {
  errorMessage.value = "";
  try {
    const sanitized = validateAndSanitizeSvg(input.value);
    const dimensions = getSvgDimensions(sanitized);
    syncDimensions(sanitized);
    validationMessage.value = `SVG valid · ${dimensions.width} × ${dimensions.height}`;
  } catch (error) {
    validationMessage.value = "";
    errorMessage.value = error instanceof Error ? error.message : "SVG tidak valid.";
  }
}
async function runOptimize() {
  if (isOptimizing.value) return;
  isOptimizing.value = true;
  errorMessage.value = "";
  try {
    await new Promise<void>((resolve) => window.setTimeout(resolve, 0));
    const result = optimizeSvg(input.value, options.value);
    output.value = result.data;
    exportWidth.value = result.dimensions.width;
    exportHeight.value = result.dimensions.height;
    validationMessage.value = `SVG valid dan berhasil dioptimasi · ${result.dimensions.width} × ${result.dimensions.height}`;
  } catch (error) {
    output.value = "";
    errorMessage.value = error instanceof Error ? error.message : "SVG gagal dioptimasi.";
  } finally {
    isOptimizing.value = false;
  }
}
function updateWidth() {
  if (!lockRatio.value) return;
  const ratio = getSvgDimensions(output.value || input.value).ratio;
  exportHeight.value = Math.max(1, Math.round(exportWidth.value / ratio));
}
function updateHeight() {
  if (!lockRatio.value) return;
  const ratio = getSvgDimensions(output.value || input.value).ratio;
  exportWidth.value = Math.max(1, Math.round(exportHeight.value * ratio));
}
function cancelExport() {
  exportController?.abort();
}
function triggerDownload(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1_000);
}
function downloadSvg() {
  if (!output.value) return;
  triggerDownload(
    new Blob([output.value], { type: "image/svg+xml" }),
    `${svgOutputBaseName(fileName.value)}-optimized.svg`,
  );
}
async function exportRaster(format: "png" | "webp") {
  if (!output.value || isExporting.value) return;
  isExporting.value = true;
  errorMessage.value = "";
  const controller = new AbortController();
  exportController = controller;
  try {
    const blob = await rasterizeSvg(
      output.value,
      format,
      exportWidth.value,
      exportHeight.value,
      rasterQuality.value,
      controller.signal,
    );
    triggerDownload(blob, `${svgOutputBaseName(fileName.value)}.${format}`);
  } catch (error) {
    if (!(error instanceof DOMException && error.name === "AbortError"))
      errorMessage.value = error instanceof Error ? error.message : "Raster export gagal.";
  } finally {
    exportController = null;
    isExporting.value = false;
  }
}
async function copyDataUrl() {
  if (!output.value) return;
  await navigator.clipboard.writeText(svgDataUrl(output.value));
  copied.value = "Data URL tersalin";
  window.setTimeout(() => (copied.value = ""), 1_200);
}
async function copySvg() {
  if (!output.value) return;
  await navigator.clipboard.writeText(output.value);
  copied.value = "SVG tersalin";
  window.setTimeout(() => (copied.value = ""), 1_200);
}
async function handleFile(event: Event) {
  const element = event.target as HTMLInputElement;
  const file = element.files?.[0];
  element.value = "";
  if (!file) return;
  if (!file.name.toLowerCase().endsWith(".svg") && file.type !== "image/svg+xml") {
    errorMessage.value = "Pilih file SVG.";
    return;
  }
  input.value = await file.text();
  fileName.value = file.name;
  validate();
}
onBeforeUnmount(() => exportController?.abort());
validate();
</script>

<template>
  <ToolPageShell
    title="SVG Optimizer & Converter"
    description="Validasi, optimasi, minify atau prettify SVG lalu export sebagai SVG, PNG, WebP, atau Data URL."
    icon="mdi:svg"
    category="Design"
  >
    <div class="grid gap-6 xl:grid-cols-2">
      <section>
        <div class="flex flex-wrap items-center justify-between gap-2">
          <h2 class="font-black">Input SVG</h2>
          <label class="cursor-pointer text-sm font-bold text-indigo-600"
            ><input
              type="file"
              accept="image/svg+xml,.svg"
              class="sr-only"
              @change="handleFile"
            />Upload SVG</label
          >
        </div>
        <textarea
          v-model="input"
          rows="20"
          spellcheck="false"
          class="mt-3 w-full resize-y rounded-2xl border border-slate-200 bg-slate-50 p-4 font-mono text-sm leading-6 outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-950"
        ></textarea>
        <div class="mt-3 grid grid-cols-2 gap-3">
          <button
            type="button"
            class="min-h-11 rounded-xl border border-slate-200 font-bold dark:border-slate-700"
            @click="validate"
          >
            <Icon icon="mdi:check-decagram-outline" class="mr-2 inline size-5" />Validate</button
          ><button
            type="button"
            class="min-h-11 rounded-xl border border-slate-200 font-bold dark:border-slate-700"
            @click="
              input = sample;
              fileName = 'graphic.svg';
              validate();
            "
          >
            Reset contoh
          </button>
        </div>
        <p
          v-if="validationMessage"
          class="mt-3 rounded-xl bg-emerald-50 p-3 text-sm font-bold text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300"
        >
          {{ validationMessage }}
        </p>
      </section>
      <section>
        <h2 class="font-black">Preview aman</h2>
        <div
          class="mt-3 grid min-h-72 place-items-center overflow-hidden rounded-2xl bg-[linear-gradient(45deg,#e2e8f0_25%,transparent_25%),linear-gradient(-45deg,#e2e8f0_25%,transparent_25%),linear-gradient(45deg,transparent_75%,#e2e8f0_75%),linear-gradient(-45deg,transparent_75%,#e2e8f0_75%)] bg-[length:24px_24px] bg-[position:0_0,0_12px,12px_-12px,-12px_0px] p-6 dark:bg-slate-950"
        >
          <img v-if="previewUrl" :src="previewUrl" alt="Preview SVG" class="max-h-80 max-w-full" />
          <p v-else class="text-sm font-bold text-slate-400">SVG belum valid.</p>
        </div>
        <div class="mt-4 grid grid-cols-3 gap-3 text-center">
          <div class="rounded-xl bg-slate-50 p-3 dark:bg-slate-800">
            <span class="block text-xs font-bold text-slate-500">Original</span
            ><strong>{{ formatFileSize(comparison.originalBytes) }}</strong>
          </div>
          <div class="rounded-xl bg-slate-50 p-3 dark:bg-slate-800">
            <span class="block text-xs font-bold text-slate-500">Optimized</span
            ><strong>{{ formatFileSize(comparison.optimizedBytes) }}</strong>
          </div>
          <div
            class="rounded-xl bg-emerald-50 p-3 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300"
          >
            <span class="block text-xs font-bold">Saved</span
            ><strong>{{ comparison.savedPercentage.toFixed(1) }}%</strong>
          </div>
        </div>
      </section>
    </div>
    <section class="mt-7 rounded-2xl border border-slate-200 p-5 dark:border-slate-700">
      <h2 class="font-black">Optimize</h2>
      <div class="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <label
          v-for="option in [
            { key: 'removeMetadata', label: 'Remove metadata' },
            { key: 'removeComments', label: 'Remove comments' },
            { key: 'removeGroups', label: 'Remove unnecessary groups' },
            { key: 'simplifyAttributes', label: 'Simplify attributes' },
          ] as const"
          :key="option.key"
          class="flex items-center justify-between gap-3 rounded-xl bg-slate-50 p-3 text-sm font-bold dark:bg-slate-800"
          ><span>{{ option.label }}</span
          ><input v-model="options[option.key]" type="checkbox" class="size-5 accent-indigo-600"
        /></label>
      </div>
      <div class="mt-4 grid grid-cols-2 gap-2">
        <label
          v-for="style in ['minify', 'prettify'] as const"
          :key="style"
          class="cursor-pointer rounded-xl border p-3 text-center font-bold"
          :class="
            options.outputStyle === style
              ? 'border-indigo-500 bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300'
              : 'border-slate-200 dark:border-slate-700'
          "
          ><input v-model="options.outputStyle" type="radio" :value="style" class="sr-only" />{{
            style === "minify" ? "Minify" : "Prettify"
          }}</label
        >
      </div>
      <button
        type="button"
        class="mt-4 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 font-bold text-white disabled:opacity-50"
        :disabled="isOptimizing"
        @click="runOptimize"
      >
        <Icon
          :icon="isOptimizing ? 'mdi:loading' : 'mdi:auto-fix'"
          class="size-5"
          :class="{ 'animate-spin': isOptimizing }"
        />{{ isOptimizing ? "Mengoptimasi..." : "Optimize SVG" }}
      </button>
    </section>
    <section v-if="output" class="mt-7">
      <div class="flex items-center justify-between">
        <h2 class="font-black">Optimized SVG</h2>
        <button type="button" class="text-sm font-bold text-indigo-600" @click="copySvg">
          Salin SVG
        </button>
      </div>
      <textarea
        :value="output"
        readonly
        rows="12"
        class="mt-3 w-full resize-y rounded-2xl border border-emerald-200 bg-emerald-50/50 p-4 font-mono text-sm leading-6 dark:border-emerald-500/25 dark:bg-emerald-500/10"
      ></textarea>
      <div class="mt-5 grid gap-3 sm:grid-cols-[1fr_auto_1fr]">
        <label class="text-sm font-bold"
          >Raster width<input
            v-model.number="exportWidth"
            type="number"
            min="1"
            class="mt-2 min-h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 dark:border-slate-700 dark:bg-slate-950"
            @input="updateWidth" /></label
        ><button
          type="button"
          class="mt-7 grid size-11 place-items-center rounded-xl"
          :class="lockRatio ? 'bg-indigo-600 text-white' : 'bg-slate-100 dark:bg-slate-800'"
          aria-label="Lock aspect ratio"
          :aria-pressed="lockRatio"
          @click="lockRatio = !lockRatio"
        >
          <Icon
            :icon="lockRatio ? 'mdi:link-variant' : 'mdi:link-variant-off'"
            class="size-5"
          /></button
        ><label class="text-sm font-bold"
          >Raster height<input
            v-model.number="exportHeight"
            type="number"
            min="1"
            class="mt-2 min-h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 dark:border-slate-700 dark:bg-slate-950"
            @input="updateHeight"
        /></label>
      </div>
      <label class="mt-4 block text-sm font-bold"
        >WebP quality: {{ rasterQuality }}%<input
          v-model.number="rasterQuality"
          type="range"
          min="1"
          max="100"
          class="mt-2 w-full accent-indigo-600"
      /></label>
      <div class="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <button
          type="button"
          class="min-h-11 rounded-xl bg-emerald-600 px-3 font-bold text-white"
          @click="downloadSvg"
        >
          Optimized SVG</button
        ><button
          type="button"
          class="min-h-11 rounded-xl bg-blue-600 px-3 font-bold text-white"
          :disabled="isExporting"
          @click="exportRaster('png')"
        >
          Export PNG</button
        ><button
          type="button"
          class="min-h-11 rounded-xl bg-sky-600 px-3 font-bold text-white"
          :disabled="isExporting"
          @click="exportRaster('webp')"
        >
          Export WebP</button
        ><button
          type="button"
          class="min-h-11 rounded-xl bg-violet-600 px-3 font-bold text-white"
          @click="copyDataUrl"
        >
          Copy Data URL
        </button>
      </div>
      <button
        v-if="isExporting"
        type="button"
        class="mt-3 min-h-10 w-full rounded-xl bg-rose-50 font-bold text-rose-700 dark:bg-rose-500/10 dark:text-rose-300"
          @click="cancelExport"
      >
        Batalkan export
      </button>
      <p v-if="copied" class="mt-3 text-center text-sm font-bold text-emerald-600">{{ copied }}</p>
    </section>
    <p
      v-if="errorMessage"
      role="alert"
      class="mt-5 rounded-xl bg-rose-50 p-3 text-sm font-semibold text-rose-700 dark:bg-rose-500/10 dark:text-rose-300"
    >
      {{ errorMessage }}
    </p>
  </ToolPageShell>
</template>
