<script setup lang="ts">
import { computed, ref } from "vue";
import { Icon } from "@iconify/vue";
import ToolPageShell from "@/components/ToolPageShell.vue";
import JsonExplorerTree from "@/components/JsonExplorerTree.vue";
import {
  evaluateJsonPath,
  flattenJsonTree,
  jsonPreview,
  parseJsonExplorerInput,
  searchJsonNodes,
  type JsonExplorerNode,
  type JsonPathMatch,
} from "@/composables/useJsonExplorer";

const sample = `{
  "user": {
    "profile": { "name": "Dirga" },
    "email": "dirga@example.com"
  },
  "users": [
    { "name": "Ayu", "email": "a@example.com", "active": true },
    { "name": "Bima", "email": "b@example.com", "active": true },
    { "name": "Citra", "email": "c@example.com", "active": false }
  ]
}`;
const input = ref(sample);
const parsed = ref<unknown>(null);
const nodes = ref<JsonExplorerNode[]>([]);
const expandedPaths = ref(new Set<string>());
const search = ref("");
const expression = ref("$.users[?(@.active)].email");
const results = ref<JsonPathMatch[]>([]);
const errorMessage = ref("");
const copied = ref("");
const matches = computed(() => searchJsonNodes(nodes.value, search.value));
const matchedPaths = computed(() => new Set(matches.value.map((node) => node.path)));

function explore() {
  errorMessage.value = "";
  results.value = [];
  try {
    parsed.value = parseJsonExplorerInput(input.value);
    nodes.value = flattenJsonTree(parsed.value);
    expandedPaths.value = new Set(
      nodes.value.filter((node) => node.depth < 2 && node.expandable).map((node) => node.path),
    );
  } catch (error) {
    parsed.value = null;
    nodes.value = [];
    errorMessage.value = error instanceof Error ? error.message : "JSON tidak dapat dibaca.";
  }
}
function runQuery() {
  errorMessage.value = "";
  try {
    if (!nodes.value.length) explore();
    if (nodes.value.length) results.value = evaluateJsonPath(parsed.value, expression.value);
  } catch (error) {
    results.value = [];
    errorMessage.value =
      error instanceof Error ? error.message : "JSONPath tidak dapat dijalankan.";
  }
}
function toggle(path: string) {
  const next = new Set(expandedPaths.value);
  if (next.has(path)) next.delete(path);
  else next.add(path);
  expandedPaths.value = next;
}
function expandMatches() {
  const next = new Set(expandedPaths.value);
  for (const match of matches.value) {
    let parent = match.parentPath;
    while (parent) {
      next.add(parent);
      parent = nodes.value.find((node) => node.path === parent)?.parentPath ?? null;
    }
  }
  expandedPaths.value = next;
}
async function copy(value: unknown, label: string) {
  await navigator.clipboard.writeText(
    typeof value === "string" ? value : JSON.stringify(value, null, 2),
  );
  copied.value = label;
  window.setTimeout(() => (copied.value = ""), 1_200);
}
function downloadResults() {
  const blob = new Blob(
    [
      JSON.stringify(
        results.value.map((result) => result.value),
        null,
        2,
      ),
    ],
    { type: "application/json" },
  );
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "jsonpath-results.json";
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1_000);
}
explore();
</script>

<template>
  <ToolPageShell
    title="JSON Explorer + JSONPath"
    description="Jelajahi JSON sebagai tree, cari key atau value, dan jalankan query JSONPath langsung di browser."
    icon="mdi:file-tree-outline"
    category="Developer"
  >
    <div class="grid gap-6 xl:grid-cols-2">
      <section>
        <div class="flex items-center justify-between">
          <h2 class="font-black">JSON input</h2>
          <button
            type="button"
            class="text-sm font-bold text-indigo-600"
            @click="
              input = sample;
              explore();
            "
          >
            Gunakan contoh
          </button>
        </div>
        <textarea
          v-model="input"
          rows="18"
          spellcheck="false"
          class="mt-3 w-full resize-y rounded-2xl border border-slate-200 bg-slate-50 p-4 font-mono text-sm leading-6 outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-950"
          placeholder="Tempel JSON di sini..."
        ></textarea
        ><button
          type="button"
          class="mt-3 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 font-bold text-white"
          @click="explore"
        >
          <Icon icon="mdi:file-tree-outline" class="size-5" />Explore JSON
        </button>
      </section>
      <section>
        <div class="flex flex-wrap items-center justify-between gap-2">
          <h2 class="font-black">Tree explorer · {{ nodes.length }} node</h2>
          <span v-if="search" class="text-xs font-bold text-amber-600"
            >{{ matches.length }} cocok</span
          >
        </div>
        <div class="mt-3 flex gap-2">
          <input
            v-model="search"
            type="search"
            class="min-h-11 min-w-0 flex-1 rounded-xl border border-slate-200 bg-slate-50 px-4 dark:border-slate-700 dark:bg-slate-950"
            placeholder="Cari key, value, atau path..."
            @input="expandMatches"
          /><button
            type="button"
            class="rounded-xl border border-slate-200 px-3 font-bold dark:border-slate-700"
            @click="
              expandedPaths = new Set(
                nodes.filter((node) => node.expandable).map((node) => node.path),
              )
            "
          >
            Expand</button
          ><button
            type="button"
            class="rounded-xl border border-slate-200 px-3 font-bold dark:border-slate-700"
            @click="expandedPaths = new Set(['$'])"
          >
            Collapse
          </button>
        </div>
        <div
          class="mt-3 h-[30rem] overflow-auto rounded-2xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-950"
        >
          <JsonExplorerTree
            :nodes="nodes"
            :expanded-paths="expandedPaths"
            :matched-paths="matchedPaths"
            @toggle="toggle"
            @copy-path="(value) => copy(value, 'path')"
            @copy-value="(value) => copy(value, 'value')"
          />
        </div>
        <p v-if="copied" class="mt-2 text-xs font-bold text-emerald-600">
          {{ copied === "path" ? "Path" : "Value" }} tersalin.
        </p>
      </section>
    </div>
    <section class="mt-7 rounded-2xl border border-slate-200 p-5 dark:border-slate-700">
      <h2 class="font-black">JSONPath query</h2>
      <div class="mt-3 grid gap-3 sm:grid-cols-[1fr_auto]">
        <input
          v-model="expression"
          type="text"
          spellcheck="false"
          class="min-h-12 rounded-xl border border-slate-200 bg-slate-50 px-4 font-mono dark:border-slate-700 dark:bg-slate-950"
          placeholder="$.users[?(@.active)].email"
          @keyup.enter="runQuery"
        /><button
          type="button"
          class="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-violet-600 px-5 font-bold text-white"
          @click="runQuery"
        >
          <Icon icon="mdi:play" class="size-5" />Run JSONPath
        </button>
      </div>
      <p class="mt-2 text-xs text-slate-500">
        Contoh: <code>$.users[?(@.active)].email</code>, <code>$..email</code>,
        <code>$.users[0].name</code>. Filter dievaluasi memakai mode safe.
      </p>
      <div v-if="results.length" class="mt-4">
        <div class="flex items-center justify-between gap-3">
          <p class="font-bold">{{ results.length }} hasil</p>
          <div class="flex gap-2">
            <button
              type="button"
              class="min-h-9 rounded-lg border border-slate-200 px-3 text-sm font-bold dark:border-slate-700"
              @click="
                copy(
                  results.map((result) => result.value),
                  'value',
                )
              "
            >
              Salin hasil</button
            ><button
              type="button"
              class="min-h-9 rounded-lg bg-emerald-600 px-3 text-sm font-bold text-white"
              @click="downloadResults"
            >
              Download JSON
            </button>
          </div>
        </div>
        <div class="mt-3 rounded-xl bg-slate-950 p-4 text-slate-100">
          <span class="text-xs font-bold uppercase tracking-wide text-slate-400">Result JSON</span>
          <pre data-testid="jsonpath-result-json" class="mt-2 overflow-auto font-mono text-sm">{{
            JSON.stringify(
              results.map((result) => result.value),
              null,
              2,
            )
          }}</pre>
        </div>
        <ul class="mt-3 max-h-96 space-y-2 overflow-auto">
          <li
            v-for="(result, index) in results"
            :key="`${result.path}-${index}`"
            class="rounded-xl bg-slate-50 p-3 dark:bg-slate-800"
          >
            <button
              type="button"
              class="font-mono text-xs font-bold text-indigo-600"
              @click="copy(result.path, 'path')"
            >
              {{ result.path }}
            </button>
            <pre class="mt-2 whitespace-pre-wrap break-words font-mono text-sm">{{
              result.type === "object" || result.type === "array"
                ? JSON.stringify(result.value, null, 2)
                : jsonPreview(result.value, 500)
            }}</pre>
          </li>
        </ul>
      </div>
      <p v-else class="mt-4 text-sm text-slate-500">Belum ada hasil query.</p>
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
