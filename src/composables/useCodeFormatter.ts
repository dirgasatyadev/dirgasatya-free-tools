export type CodeLanguage = "html" | "css" | "javascript" | "typescript" | "sql";
export type CodeFormatAction = "beautify" | "minify";
export type CodeIndent = "2" | "4" | "tabs";

export interface CodeFormatterRequest {
  id: number;
  source: string;
  language: CodeLanguage;
  action: CodeFormatAction;
  indent: CodeIndent;
}

export const maxCodeInputBytes = 2 * 1024 * 1024;
export const codeLanguageOptions: {
  value: CodeLanguage;
  label: string;
  extension: string;
  minifiedExtension?: string;
}[] = [
  { value: "html", label: "HTML", extension: "html" },
  { value: "css", label: "CSS", extension: "css" },
  { value: "javascript", label: "JavaScript", extension: "js" },
  { value: "typescript", label: "TypeScript", extension: "ts", minifiedExtension: "js" },
  { value: "sql", label: "SQL", extension: "sql" },
];

export const codeSamples: Record<CodeLanguage, string> = {
  html: '<!doctype html><html><head><title>Dearga</title></head><body><main class="app"><h1>Hello</h1><p>Browser tools.</p></main></body></html>',
  css: ".card{display:grid;gap:16px;padding:24px;background:#fff}.card h2{color:#4f46e5;margin:0}",
  javascript:
    'const tools=["formatter","minifier"];function greet(name){return `Hello ${name}`;}console.log(tools.map(greet));',
  typescript:
    'interface Tool {name:string;active:boolean} const tools:Tool[]=[{name:"Formatter",active:true}];export const active=tools.filter((tool)=>tool.active);',
  sql: "select users.id, users.name, count(orders.id) as order_count from users left join orders on orders.user_id = users.id where users.active = true group by users.id, users.name order by order_count desc;",
};

export function codeByteSize(value: string) {
  return new TextEncoder().encode(value).length;
}
export function codeSavings(input: string, output: string) {
  const inputBytes = codeByteSize(input);
  const outputBytes = codeByteSize(output);
  return {
    inputBytes,
    outputBytes,
    savedPercentage: inputBytes ? (1 - outputBytes / inputBytes) * 100 : 0,
  };
}
export function codeFileExtension(language: CodeLanguage, action: CodeFormatAction) {
  const option = codeLanguageOptions.find((item) => item.value === language)!;
  return action === "minify" && option.minifiedExtension
    ? option.minifiedExtension
    : option.extension;
}

export function minifySql(source: string) {
  let output = "";
  let index = 0;
  let quote = "";
  let pendingSpace = false;
  while (index < source.length) {
    const character = source[index]!;
    const next = source[index + 1] ?? "";
    if (quote) {
      output += character;
      if (character === quote) {
        if (next === quote) {
          output += next;
          index += 2;
          continue;
        }
        quote = "";
      } else if (character === "\\" && next) {
        output += next;
        index += 2;
        continue;
      }
      index += 1;
      continue;
    }
    if (character === "'" || character === '"' || character === "`") {
      if (pendingSpace && output && !/[\s(,]/.test(output[output.length - 1]!)) output += " ";
      pendingSpace = false;
      quote = character;
      output += character;
      index += 1;
      continue;
    }
    if (character === "-" && next === "-") {
      index += 2;
      while (index < source.length && source[index] !== "\n") index += 1;
      pendingSpace = true;
      continue;
    }
    if (character === "/" && next === "*") {
      const end = source.indexOf("*/", index + 2);
      if (end < 0) throw new Error("Komentar blok SQL tidak ditutup.");
      index = end + 2;
      pendingSpace = true;
      continue;
    }
    if (/\s/.test(character)) {
      pendingSpace = true;
      index += 1;
      continue;
    }
    if (
      pendingSpace &&
      output &&
      !/[\s(,]/.test(output[output.length - 1]!) &&
      !/[),;]/.test(character)
    )
      output += " ";
    pendingSpace = false;
    output += character;
    index += 1;
  }
  if (quote) throw new Error("String SQL tidak ditutup.");
  return output.trim();
}

export function runCodeFormatterWorker(
  request: Omit<CodeFormatterRequest, "id">,
  signal?: AbortSignal,
  timeoutMs = 20_000,
) {
  if (codeByteSize(request.source) > maxCodeInputBytes)
    return Promise.reject(new Error("Input code maksimal 2 MB."));
  if (!request.source.trim()) return Promise.reject(new Error("Masukkan code terlebih dahulu."));
  if (signal?.aborted)
    return Promise.reject(new DOMException("Formatting dibatalkan.", "AbortError"));
  return new Promise<string>((resolve, reject) => {
    const worker = new Worker(new URL("../workers/codeFormatter.worker.ts", import.meta.url), {
      type: "module",
    });
    const id = Date.now();
    const cleanup = () => {
      window.clearTimeout(timer);
      signal?.removeEventListener("abort", abort);
      worker.terminate();
    };
    const abort = () => {
      cleanup();
      reject(new DOMException("Formatting dibatalkan.", "AbortError"));
    };
    const timer = window.setTimeout(() => {
      cleanup();
      reject(new Error(`Formatting dihentikan setelah ${Math.round(timeoutMs / 1000)} detik.`));
    }, timeoutMs);
    worker.onmessage = (event: MessageEvent<{ id: number; output?: string; error?: string }>) => {
      if (event.data.id !== id) return;
      cleanup();
      if (event.data.error || event.data.output === undefined)
        reject(new Error(event.data.error ?? "Worker tidak menghasilkan output."));
      else resolve(event.data.output);
    };
    worker.onerror = () => {
      cleanup();
      reject(new Error("Code formatter worker tidak dapat dimuat."));
    };
    signal?.addEventListener("abort", abort, { once: true });
    worker.postMessage({ id, ...request });
  });
}
