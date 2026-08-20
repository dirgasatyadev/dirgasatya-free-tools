import { optimize } from "svgo/browser";
import { getAdaptiveImageTransformPixelLimit } from "@/composables/imageSafety";
import { normalizeImageBaseName } from "@/composables/image/fileNaming";
import { validateImageDimensions } from "@/composables/image/imageValidation";

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
export const maxSvgInputBytes = 2 * 1024 * 1024;

function numericDimension(value: string | null) {
  if (!value || value.endsWith("%")) return 0;
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

export function validateAndSanitizeSvg(source: string) {
  const bytes = new TextEncoder().encode(source).length;
  if (!source.trim()) throw new Error("Masukkan SVG terlebih dahulu.");
  if (bytes > maxSvgInputBytes) throw new Error("Input SVG maksimal 2 MB.");
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
    if (/@import|url\(\s*["']?(?!#|data:image\/)/i.test(style.textContent ?? "")) style.remove();
  }
  for (const element of [root, ...Array.from(root.querySelectorAll("*"))]) {
    for (const attribute of Array.from(element.attributes)) {
      const name = attribute.name.toLocaleLowerCase("en");
      const value = attribute.value.trim();
      if (name.startsWith("on")) element.removeAttribute(attribute.name);
      else if (
        (name === "href" || name === "xlink:href") &&
        value &&
        !value.startsWith("#") &&
        !value.startsWith("data:image/")
      )
        element.removeAttribute(attribute.name);
      else if (
        (name === "style" || name === "fill" || name === "stroke" || name === "filter") &&
        /url\(\s*["']?(?!#|data:image\/)/i.test(value)
      )
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

export function optimizeSvg(source: string, options: SvgOptimizeOptions) {
  const sanitized = validateAndSanitizeSvg(source);
  const result = optimize(sanitized, {
    multipass: true,
    plugins: [
      {
        name: "preset-default" as const,
        params: {
          overrides: {
            removeComments: options.removeComments ? {} : false,
            removeMetadata: options.removeMetadata ? null : false,
            collapseGroups: options.removeGroups ? null : false,
            cleanupAttrs: options.simplifyAttributes ? {} : false,
            cleanupNumericValues: options.simplifyAttributes ? {} : false,
            convertColors: options.simplifyAttributes ? {} : false,
          },
        },
      },
    ],
    js2svg: { pretty: options.outputStyle === "prettify", indent: 2 },
  });
  return { data: result.data, dimensions: getSvgDimensions(result.data) };
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
