import { getAdaptiveImageTransformPixelLimit } from "@/composables/imageSafety";
import { normalizeImageBaseName } from "@/composables/image/fileNaming";
import { validateImageDimensions } from "@/composables/image/imageValidation";
import {
  hasUnsafeSvgUrl,
  isAllowedSvgResourceReference,
  validateSvgInputSize,
} from "@/composables/svgSecurity";

export { maxSvgInputBytes } from "@/composables/svgSecurity";

export interface SvgOptimizeOptions {
  removeMetadata: boolean;
  removeComments: boolean;
  removeGroups: boolean;
  simplifyAttributes: boolean;
  outputStyle: "minify" | "prettify";
}

export interface SvgDimensions {
  width: number;
  height: number;
  ratio: number;
}

export interface SvgOptimizerResult {
  data: string;
  dimensions: SvgDimensions;
}

export interface SvgOptimizerWorkerRequest {
  id: number;
  source: string;
  options?: SvgOptimizeOptions;
}

export interface SvgOptimizerWorkerResponse {
  id: number;
  result?: SvgOptimizerResult;
  error?: string;
}

function numericDimension(value: string | null) {
  if (!value || value.endsWith("%")) return 0;
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

export function validateAndSanitizeSvg(source: string) {
  validateSvgInputSize(source);
  const document = new DOMParser().parseFromString(source, "image/svg+xml");
  const parserError = document.querySelector("parsererror");
  if (parserError)
    throw new Error(
      `SVG tidak valid: ${parserError.textContent?.trim().slice(0, 240) || "XML parser error"}`,
    );
  const root = document.documentElement;
  if (root.localName !== "svg") throw new Error("Root document harus berupa elemen <svg>.");

  for (const element of Array.from(
    root.querySelectorAll("script, foreignObject, iframe, object, embed, audio, video, link"),
  ))
    element.remove();
  for (const style of Array.from(root.querySelectorAll("style"))) {
    const css = style.textContent ?? "";
    if (/@import/i.test(css) || hasUnsafeSvgUrl(css)) style.remove();
  }
  for (const element of [root, ...Array.from(root.querySelectorAll("*"))]) {
    for (const attribute of Array.from(element.attributes)) {
      const name = attribute.name.toLocaleLowerCase("en");
      const value = attribute.value.trim();
      if (name.startsWith("on")) element.removeAttribute(attribute.name);
      else if (
        (name === "href" || name.endsWith(":href")) &&
        value &&
        !isAllowedSvgResourceReference(value)
      )
        element.removeAttribute(attribute.name);
      else if (hasUnsafeSvgUrl(value))
        element.removeAttribute(attribute.name);
    }
  }
  return new XMLSerializer().serializeToString(root);
}

export function getSvgDimensions(source: string): SvgDimensions {
  const document = new DOMParser().parseFromString(source, "image/svg+xml");
  const root = document.documentElement;
  const viewBox = root
    .getAttribute("viewBox")
    ?.trim()
    .split(/[\s,]+/)
    .map(Number);
  const viewBoxWidth =
    viewBox?.length === 4 && Number.isFinite(viewBox[2]) && viewBox[2]! > 0 ? viewBox[2]! : 0;
  const viewBoxHeight =
    viewBox?.length === 4 && Number.isFinite(viewBox[3]) && viewBox[3]! > 0 ? viewBox[3]! : 0;
  const width = Math.round(numericDimension(root.getAttribute("width")) || viewBoxWidth || 512);
  const height = Math.round(numericDimension(root.getAttribute("height")) || viewBoxHeight || 512);
  return { width, height, ratio: width / height };
}

let svgWorkerRequestId = 0;

export function runSvgOptimizerWorker(
  source: string,
  options?: SvgOptimizeOptions,
  signal?: AbortSignal,
  timeoutMs = 12_000,
) {
  try { validateSvgInputSize(source); }
  catch (error) { return Promise.reject(error); }
  if (signal?.aborted)
    return Promise.reject(new DOMException("Pemrosesan SVG dibatalkan.", "AbortError"));
  return new Promise<SvgOptimizerResult>((resolve, reject) => {
    const worker = new Worker(new URL("../workers/svgOptimizer.worker.ts", import.meta.url), {
      type: "module",
    });
    const id = ++svgWorkerRequestId;
    const cleanup = () => {
      window.clearTimeout(timer);
      signal?.removeEventListener("abort", abort);
      worker.terminate();
    };
    const abort = () => {
      cleanup();
      reject(new DOMException("Pemrosesan SVG dibatalkan.", "AbortError"));
    };
    const timer = window.setTimeout(() => {
      cleanup();
      reject(new Error(`Optimasi SVG dihentikan setelah ${Math.round(timeoutMs / 1000)} detik untuk mencegah UI freeze.`));
    }, timeoutMs);
    worker.onmessage = (event: MessageEvent<SvgOptimizerWorkerResponse>) => {
      if (event.data.id !== id) return;
      cleanup();
      if (event.data.error || !event.data.result)
        reject(new Error(event.data.error ?? "Worker SVG tidak menghasilkan output."));
      else resolve(event.data.result);
    };
    worker.onerror = () => {
      cleanup();
      reject(new Error("SVG optimizer worker tidak dapat dimuat."));
    };
    signal?.addEventListener("abort", abort, { once: true });
    const workerOptions = options ? {
      removeMetadata: options.removeMetadata,
      removeComments: options.removeComments,
      removeGroups: options.removeGroups,
      simplifyAttributes: options.simplifyAttributes,
      outputStyle: options.outputStyle,
    } : undefined;
    worker.postMessage({ id, source, options: workerOptions } satisfies SvgOptimizerWorkerRequest);
  });
}

export function svgSavings(original: string, optimized: string) {
  const originalBytes = new TextEncoder().encode(original).length;
  const optimizedBytes = new TextEncoder().encode(optimized).length;
  return {
    originalBytes,
    optimizedBytes,
    savedPercentage: originalBytes ? Math.max(0, (1 - optimizedBytes / originalBytes) * 100) : 0,
  };
}

export function svgDataUrl(source: string) {
  const bytes = new TextEncoder().encode(source);
  let binary = "";
  for (let offset = 0; offset < bytes.length; offset += 32_768)
    binary += String.fromCharCode(...bytes.subarray(offset, offset + 32_768));
  return `data:image/svg+xml;base64,${btoa(binary)}`;
}

export function svgOutputBaseName(fileName: string) {
  return normalizeImageBaseName(fileName.replace(/\.svg$/i, ""), "optimized");
}

export async function rasterizeSvg(
  source: string,
  format: "png" | "webp",
  width: number,
  height: number,
  quality = 90,
  signal?: AbortSignal,
) {
  const maxPixels = getAdaptiveImageTransformPixelLimit();
  const dimensionError = validateImageDimensions(width, height, maxPixels, "output");
  if (dimensionError) throw new Error(dimensionError);
  if (signal?.aborted) throw new DOMException("Export raster dibatalkan.", "AbortError");
  const blob = new Blob([validateAndSanitizeSvg(source)], { type: "image/svg+xml" });
  const url = URL.createObjectURL(blob);
  try {
    const image = new Image();
    image.decoding = "async";
    const loaded = new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error("SVG tidak dapat dirasterisasi."));
    });
    image.src = url;
    await loaded;
    if (signal?.aborted) throw new DOMException("Export raster dibatalkan.", "AbortError");
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Browser tidak dapat membuat canvas raster.");
    context.drawImage(image, 0, 0, width, height);
    return await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob(
        (output) =>
          output ? resolve(output) : reject(new Error("Output raster tidak dapat dibuat.")),
        `image/${format}`,
        quality / 100,
      ),
    );
  } finally {
    URL.revokeObjectURL(url);
  }
}
