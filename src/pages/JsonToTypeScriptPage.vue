<script setup lang="ts">
import { computed, ref } from "vue";
import { Icon } from "@iconify/vue";
import ToolPageShell from "@/components/ToolPageShell.vue";
import { formatFileSize } from "@/composables/usePngToAvif";
import {
  generateTypeScriptFromJson,
  parseJsonForTypeScript,
  type JsonToTypeScriptOptions,
} from "@/composables/useJsonToTypeScript";

const sample = `{
  "id": 1,
  "name": "Dirga",
  "active": true,
  "roles": ["admin"],
  "profile": {
    "email": "dirga@example.com",
    "bio": null
  }
}`;
const input = ref(sample);
const output = ref("");
const errorMessage = ref("");
const copied = ref(false);
const isDragging = ref(false);
const options = ref<JsonToTypeScriptOptions>({
  rootName: "Root",
  declarationStyle: "interface",
  optionalProperties: false,
  readonlyProperties: false,
  detectNullable: true,
});
const inputBytes = computed(() => new TextEncoder().encode(input.value).length);
const outputBytes = computed(() => new TextEncoder().encode(output.value).length);

function generate() {
  errorMessage.value = "";
  try {
    output.value = generateTypeScriptFromJson(parseJsonForTypeScript(input.value), options.value);
  } catch (error) {
    output.value = "";
    errorMessage.value = error instanceof Error ? error.message : "TypeScript tidak dapat dibuat.";
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
  const blob = new Blob([output.value], { type: "text/typescript;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${options.value.rootName.trim() || "root"}.types.ts`;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1_000);
}
async function loadFile(file?: File) {
  if (!file) return;
  if (file.size > 5 * 1024 * 1024) {
    errorMessage.value = "File JSON maksimal 5 MB.";
    return;
  }
  input.value = await file.text();
  generate();
}
async function handleFile(event: Event) {
  const element = event.target as HTMLInputElement;
  const file = element.files?.[0];
  element.value = "";
  await loadFile(file);
}
async function handleDrop(event: DragEvent) {
  isDragging.value = false;
  await loadFile(event.dataTransfer?.files[0]);
}
generate();
</script>

<template>
  <ToolPageShell
    title="JSON → TypeScript Generator"
    description="Ubah JSON menjadi interface atau type TypeScript dengan nested schema dan array inference."
    icon="mdi:language-typescript"
    category="Developer"
  >
    <div class="grid gap-6 xl:grid-cols-2">
      <section>
        <div class="flex items-center justify-between gap-3">
          <div>
            <h2 class="font-black">JSON input</h2>
            <p class="mt-1 text-xs font-semibold text-slate-500">
              {{ formatFileSize(inputBytes) }}
            </p>
          </div>
          <div class="flex gap-3">
            <button
              type="button"
              class="text-sm font-bold text-slate-500"
              @click="
                input = sample;
                generate();
              "
            >
              Contoh</button
            ><label class="cursor-pointer text-sm font-bold text-indigo-600"
              ><input
                type="file"
                accept="application/json,.json"
                class="sr-only"
                @change="handleFile"
              />Upload</label
            >
          </div>
        </div>
        <div
          class="mt-3 rounded-2xl"
          :class="isDragging ? 'ring-2 ring-indigo-500 ring-offset-2' : ''"
          @dragenter.prevent="isDragging = true"
          @dragover.prevent="isDragging = true"
          @dragleave.prevent="isDragging = false"
          @drop.prevent="handleDrop"
        >
          <textarea
            v-model="input"
            rows="22"
            spellcheck="false"
            class="w-full resize-y rounded-2xl border border-slate-200 bg-slate-950 p-4 font-mono text-sm leading-6 text-slate-100 outline-none focus:border-indigo-500"
            placeholder="Tempel atau drop file JSON di sini..."
          ></textarea>
        </div>
      </section>
      <section>
        <div class="flex items-center justify-between gap-3">
          <div>
            <h2 class="font-black">TypeScript output</h2>
            <p class="mt-1 text-xs font-semibold text-slate-500">
              {{ formatFileSize(outputBytes) }}
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
              Download .ts
            </button>
          </div>
        </div>
        <textarea
          :value="output"
          readonly
          rows="22"
          spellcheck="false"
          class="mt-3 w-full resize-y rounded-2xl border border-slate-200 bg-slate-950 p-4 font-mono text-sm leading-6 text-slate-100 outline-none"
          placeholder="Interface TypeScript akan muncul di sini."
        ></textarea>
      </section>
    </div>
    <section class="mt-7 rounded-2xl border border-slate-200 p-5 dark:border-slate-700">
      <h2 class="font-black">Generation options</h2>
      <div class="mt-4 grid gap-4 md:grid-cols-2">
        <label class="text-sm font-bold"
          >Root type name<input
            v-model="options.rootName"
            type="text"
            class="mt-2 min-h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 dark:border-slate-700 dark:bg-slate-950"
            placeholder="Root"
        /></label>
        <fieldset>
          <legend class="text-sm font-bold">Declaration style</legend>
          <div class="mt-2 grid grid-cols-2 gap-2">
            <label
              v-for="style in ['interface', 'type'] as const"
              :key="style"
              class="cursor-pointer rounded-xl border p-3 text-center text-sm font-bold"
              :class="
                options.declarationStyle === style
                  ? 'border-indigo-500 bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300'
                  : 'border-slate-200 dark:border-slate-700'
              "
              ><input
                v-model="options.declarationStyle"
                type="radio"
                :value="style"
                class="sr-only"
              />{{ style === "interface" ? "Interface" : "Type" }}</label
            >
          </div>
        </fieldset>
      </div>
      <div class="mt-4 grid gap-3 sm:grid-cols-3">
        <label
          v-for="setting in [
            { key: 'optionalProperties', label: 'Optional fields' },
            { key: 'readonlyProperties', label: 'Readonly properties' },
            { key: 'detectNullable', label: 'Detect nullable' },
          ] as const"
          :key="setting.key"
          class="flex items-center justify-between gap-3 rounded-xl bg-slate-50 p-3 text-sm font-bold dark:bg-slate-800"
          ><span>{{ setting.label }}</span
          ><input v-model="options[setting.key]" type="checkbox" class="size-5 accent-indigo-600"
        /></label>
      </div>
      <button
        type="button"
        class="mt-5 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 font-bold text-white"
        @click="generate"
      >
        <Icon icon="mdi:code-braces" class="size-5" />Generate TypeScript
      </button>
      <p class="mt-3 text-xs leading-5 text-slate-500">
        Array object dianalisis lintas item. Field yang hilang pada sebagian item tetap ditandai
        optional agar type sesuai dengan data sebenarnya.
      </p>
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
