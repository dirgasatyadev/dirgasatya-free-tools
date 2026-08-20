import esbuildWasmUrl from "esbuild-wasm/esbuild.wasm?url";
import {
  minifySql,
  type CodeFormatterRequest,
  type CodeLanguage,
} from "@/composables/useCodeFormatter";

async function beautify(
  source: string,
  language: CodeLanguage,
  indent: CodeFormatterRequest["indent"],
) {
  if (language === "sql") {
    const { format } = await import("sql-formatter");
    return format(source, {
      language: "sql",
      tabWidth: indent === "4" ? 4 : 2,
      useTabs: indent === "tabs",
      keywordCase: "upper",
      linesBetweenQueries: 1,
    });
  }
  const { format } = await import("prettier/standalone");
  const tabWidth = indent === "4" ? 4 : 2;
  const useTabs = indent === "tabs";
  if (language === "html") {
    const html = await import("prettier/plugins/html");
    return format(source, { parser: "html", plugins: [html], tabWidth, useTabs });
  }
  if (language === "css") {
    const postcss = await import("prettier/plugins/postcss");
    return format(source, { parser: "css", plugins: [postcss], tabWidth, useTabs });
  }
  if (language === "javascript") {
    const [babel, estree] = await Promise.all([
      import("prettier/plugins/babel"),
      import("prettier/plugins/estree"),
    ]);
    return format(source, { parser: "babel", plugins: [babel, estree], tabWidth, useTabs });
  }
  const [typescript, estree] = await Promise.all([
    import("prettier/plugins/typescript"),
    import("prettier/plugins/estree"),
  ]);
  return format(source, { parser: "typescript", plugins: [typescript, estree], tabWidth, useTabs });
}

let esbuildInitialization: Promise<void> | null = null;
async function esbuildMinify(source: string, language: "css" | "javascript" | "typescript") {
  const esbuild = await import("esbuild-wasm");
  esbuildInitialization ??= esbuild.initialize({ wasmURL: esbuildWasmUrl, worker: false });
  await esbuildInitialization;
  const loader = language === "javascript" ? "js" : language === "typescript" ? "ts" : "css";
  const result = await esbuild.transform(source, {
    loader,
    minify: true,
    legalComments: "none",
    target: language === "css" ? undefined : "es2020",
  });
  return result.code.trim();
}

async function minify(source: string, language: CodeLanguage) {
  if (language === "sql") return minifySql(source);
  if (language === "html") {
    const { minify: minifyHtml } = await import(
      "html-minifier-terser/dist/htmlminifier.esm.bundle"
    );
    return minifyHtml(source, {
      collapseWhitespace: true,
      conservativeCollapse: false,
      removeComments: true,
      removeRedundantAttributes: true,
      removeEmptyAttributes: true,
      sortAttributes: false,
      sortClassName: false,
      minifyCSS: true,
      minifyJS: true,
    });
  }
  return esbuildMinify(source, language);
}

self.onmessage = async (event: MessageEvent<CodeFormatterRequest>) => {
  try {
    const output =
      event.data.action === "beautify"
        ? await beautify(event.data.source, event.data.language, event.data.indent)
        : await minify(event.data.source, event.data.language);
    self.postMessage({ id: event.data.id, output });
  } catch (error) {
    self.postMessage({
      id: event.data.id,
      error: error instanceof Error ? error.message : "Code tidak dapat diproses.",
    });
  }
};
