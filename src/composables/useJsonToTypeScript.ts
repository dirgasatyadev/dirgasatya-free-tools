export type TypeScriptDeclarationStyle = "interface" | "type";

export interface JsonToTypeScriptOptions {
  rootName: string;
  declarationStyle: TypeScriptDeclarationStyle;
  optionalProperties: boolean;
  readonlyProperties: boolean;
  detectNullable: boolean;
}

type PrimitiveName = "string" | "number" | "boolean" | "null" | "unknown";
type Schema =
  | { kind: "primitive"; name: PrimitiveName }
  | { kind: "array"; element: Schema }
  | { kind: "object"; sampleCount: number; fields: Map<string, SchemaField> }
  | { kind: "union"; variants: Schema[] };
interface SchemaField {
  schema: Schema;
  occurrences: number;
}

export const maxJsonToTypeScriptBytes = 5 * 1024 * 1024;
export const maxJsonToTypeScriptNodes = 50_000;

const reservedTypeNames = new Set([
  "Any",
  "Boolean",
  "Constructor",
  "Declare",
  "Default",
  "Enum",
  "Export",
  "Extends",
  "False",
  "Function",
  "Import",
  "In",
  "Instanceof",
  "Interface",
  "Keyof",
  "Let",
  "Module",
  "Namespace",
  "Never",
  "New",
  "Null",
  "Number",
  "Object",
  "Package",
  "Private",
  "Protected",
  "Public",
  "Readonly",
  "Require",
  "Return",
  "Static",
  "String",
  "Super",
  "Symbol",
  "This",
  "Throw",
  "True",
  "Type",
  "Typeof",
  "Undefined",
  "Unknown",
  "Var",
  "Void",
  "While",
  "With",
  "Yield",
]);

function primitive(name: PrimitiveName): Schema {
  return { kind: "primitive", name };
}

function schemaKey(schema: Schema): string {
  if (schema.kind === "primitive") return schema.name;
  if (schema.kind === "array") return `array:${schemaKey(schema.element)}`;
  if (schema.kind === "object") return "object";
  return `union:${schema.variants.map(schemaKey).sort().join("|")}`;
}

function mergeSchemas(left: Schema, right: Schema): Schema {
  if (left.kind === "primitive" && left.name === "unknown") return right;
  if (right.kind === "primitive" && right.name === "unknown") return left;
  if (left.kind === "object" && right.kind === "object") {
    const fields = new Map<string, SchemaField>();
    for (const [key, field] of left.fields) fields.set(key, { ...field });
    for (const [key, field] of right.fields) {
      const existing = fields.get(key);
      fields.set(
        key,
        existing
          ? {
              schema: mergeSchemas(existing.schema, field.schema),
              occurrences: existing.occurrences + field.occurrences,
            }
          : { ...field },
      );
    }
    return { kind: "object", sampleCount: left.sampleCount + right.sampleCount, fields };
  }
  if (left.kind === "array" && right.kind === "array")
    return { kind: "array", element: mergeSchemas(left.element, right.element) };
  if (schemaKey(left) === schemaKey(right)) return left;
  const variants = [
    left.kind === "union" ? left.variants : [left],
    right.kind === "union" ? right.variants : [right],
  ].flat();
  const objects = variants.filter(
    (variant): variant is Extract<Schema, { kind: "object" }> => variant.kind === "object",
  );
  const arrays = variants.filter(
    (variant): variant is Extract<Schema, { kind: "array" }> => variant.kind === "array",
  );
  const others = variants.filter(
    (variant) => variant.kind !== "object" && variant.kind !== "array",
  );
  const merged = [
    ...(objects.length ? [objects.slice(1).reduce(mergeSchemas, objects[0]!)] : []),
    ...(arrays.length ? [arrays.slice(1).reduce(mergeSchemas, arrays[0]!)] : []),
    ...others,
  ];
  return {
    kind: "union",
    variants: Array.from(new Map(merged.map((variant) => [schemaKey(variant), variant])).values()),
  };
}

function inferSchema(value: unknown, budget: { nodes: number }): Schema {
  let result = primitive("unknown");
  type InferTask =
    | { kind: "infer"; value: unknown; assign: (schema: Schema) => void }
    | { kind: "array"; children: Schema[]; assign: (schema: Schema) => void }
    | { kind: "object"; entries: [string, unknown][]; children: Schema[]; assign: (schema: Schema) => void };
  const tasks: InferTask[] = [{ kind: "infer", value, assign: (schema) => { result = schema; } }];

  while (tasks.length > 0) {
    const task = tasks.pop()!;
    if (task.kind === "array") {
      const element = task.children.slice(1).reduce(mergeSchemas, task.children[0] ?? primitive("unknown"));
      task.assign({ kind: "array", element });
      continue;
    }
    if (task.kind === "object") {
      const fields = new Map<string, SchemaField>();
      task.entries.forEach(([key], index) => fields.set(key, { schema: task.children[index]!, occurrences: 1 }));
      task.assign({ kind: "object", sampleCount: 1, fields });
      continue;
    }

    budget.nodes += 1;
    if (budget.nodes > maxJsonToTypeScriptNodes)
      throw new Error(`JSON memiliki lebih dari ${maxJsonToTypeScriptNodes.toLocaleString("id-ID")} node.`);
    const current = task.value;
    if (current === null) task.assign(primitive("null"));
    else if (Array.isArray(current)) {
      if (current.length === 0) task.assign({ kind: "array", element: primitive("unknown") });
      else {
        const children: Schema[] = [];
        children.length = current.length;
        tasks.push({ kind: "array", children, assign: task.assign });
        for (let index = current.length - 1; index >= 0; index -= 1)
          tasks.push({ kind: "infer", value: current[index], assign: (schema) => { children[index] = schema; } });
      }
    } else if (typeof current === "object") {
      const entries = Object.entries(current as Record<string, unknown>);
      const children: Schema[] = [];
      children.length = entries.length;
      tasks.push({ kind: "object", entries, children, assign: task.assign });
      for (let index = entries.length - 1; index >= 0; index -= 1)
        tasks.push({ kind: "infer", value: entries[index]![1], assign: (schema) => { children[index] = schema; } });
    } else if (typeof current === "string") task.assign(primitive("string"));
    else if (typeof current === "number") task.assign(primitive("number"));
    else if (typeof current === "boolean") task.assign(primitive("boolean"));
    else task.assign(primitive("unknown"));
  }
  return result;
}

function words(value: string) {
  return value.match(/[A-Za-z0-9]+/g) ?? [];
}
export function normalizeTypeName(value: string, fallback = "Root") {
  const name =
    words(value)
      .map((word) => `${word.charAt(0).toUpperCase()}${word.slice(1)}`)
      .join("") || fallback;
  const safe = /^\d/.test(name) ? `Type${name}` : name;
  return reservedTypeNames.has(safe) ? `${safe}Type` : safe;
}

function singularize(value: string) {
  const irregular: Record<string, string> = { children: "child", people: "person" };
  const irregularMatch = irregular[value.toLocaleLowerCase("en")];
  if (irregularMatch) return /^[A-Z]/.test(value) ? normalizeTypeName(irregularMatch) : irregularMatch;
  if (/ies$/i.test(value)) return `${value.slice(0, -3)}y`;
  if (/(ches|shes|xes|zes)$/i.test(value)) return value.slice(0, -2);
  if (/s$/i.test(value) && !/(ss|us|is)$/i.test(value)) return value.slice(0, -1);
  return value;
}

function propertyName(value: string) {
  return /^[A-Za-z_$][\w$]*$/.test(value) ? value : JSON.stringify(value);
}

export function parseJsonForTypeScript(source: string) {
  if (!source.trim()) throw new Error("Masukkan JSON terlebih dahulu.");
  if (new TextEncoder().encode(source).length > maxJsonToTypeScriptBytes)
    throw new Error("Input JSON maksimal 5 MB.");
  try {
    return JSON.parse(source) as unknown;
  } catch (error) {
    throw new Error(`JSON tidak valid: ${error instanceof Error ? error.message : "syntax error"}`);
  }
}

export function generateTypeScriptFromJson(value: unknown, options: JsonToTypeScriptOptions) {
  const schema = inferSchema(value, { nodes: 0 });
  const declarations: { name: string; body: string }[] = [];
  const usedNames = new Set<string>();
  const schemaNames = new WeakMap<object, string>();

  function uniqueName(hint: string) {
    const base = normalizeTypeName(hint);
    let candidate = base;
    let suffix = 2;
    while (usedNames.has(candidate)) candidate = `${base}${suffix++}`;
    usedNames.add(candidate);
    return candidate;
  }

  function renderType(schema: Schema, hint: string): string {
    let result = "unknown";
    type RenderTask =
      | { kind: "render"; schema: Schema; hint: string; assign: (value: string) => void }
      | { kind: "array"; rendered: string[]; assign: (value: string) => void }
      | { kind: "union"; rendered: string[]; assign: (value: string) => void }
      | { kind: "object"; declaration: { name: string; body: string }; entries: [string, SchemaField][]; rendered: string[]; sampleCount: number };
    const tasks: RenderTask[] = [{ kind: "render", schema, hint, assign: (value) => { result = value; } }];

    while (tasks.length > 0) {
      const task = tasks.pop()!;
      if (task.kind === "array") {
        const element = task.rendered[0] ?? "unknown";
        task.assign(/\s\|\s/.test(element) ? `(${element})[]` : `${element}[]`);
        continue;
      }
      if (task.kind === "union") {
        const rendered = Array.from(new Set(task.rendered));
        task.assign(rendered.length ? rendered.join(" | ") : "unknown");
        continue;
      }
      if (task.kind === "object") {
        const properties = task.entries.map(([key, field], index) => {
          const optional = options.optionalProperties || field.occurrences < task.sampleCount;
          const readonly = options.readonlyProperties ? "readonly " : "";
          return `  ${readonly}${propertyName(key)}${optional ? "?" : ""}: ${task.rendered[index]};`;
        });
        task.declaration.body = options.declarationStyle === "interface"
          ? `export interface ${task.declaration.name} {\n${properties.join("\n")}\n}`
          : `export type ${task.declaration.name} = {\n${properties.join("\n")}\n}`;
        continue;
      }

      const current = task.schema;
      if (current.kind === "primitive") {
        task.assign(current.name === "null" && !options.detectNullable ? "unknown" : current.name);
      } else if (current.kind === "array") {
        const rendered: string[] = [];
        tasks.push({ kind: "array", rendered, assign: task.assign });
        tasks.push({ kind: "render", schema: current.element, hint: singularize(task.hint), assign: (value) => { rendered[0] = value; } });
      } else if (current.kind === "union") {
        let variants = current.variants;
        if (!options.detectNullable && variants.length > 1)
          variants = variants.filter((variant) => !(variant.kind === "primitive" && variant.name === "null"));
        const rendered: string[] = [];
        rendered.length = variants.length;
        tasks.push({ kind: "union", rendered, assign: task.assign });
        for (let index = variants.length - 1; index >= 0; index -= 1)
          tasks.push({ kind: "render", schema: variants[index]!, hint: task.hint, assign: (value) => { rendered[index] = value; } });
      } else {
        const existing = schemaNames.get(current);
        if (existing) task.assign(existing);
        else {
          const name = uniqueName(task.hint);
          schemaNames.set(current, name);
          const declaration = { name, body: "" };
          declarations.push(declaration);
          task.assign(name);
          const entries = Array.from(current.fields.entries());
          const rendered: string[] = [];
          rendered.length = entries.length;
          tasks.push({ kind: "object", declaration, entries, rendered, sampleCount: current.sampleCount });
          for (let index = entries.length - 1; index >= 0; index -= 1)
            tasks.push({ kind: "render", schema: entries[index]![1].schema, hint: entries[index]![0], assign: (value) => { rendered[index] = value; } });
        }
      }
    }
    return result;
  }

  const rootName = normalizeTypeName(options.rootName);
  if (schema.kind === "object") renderType(schema, rootName);
  else {
    usedNames.add(rootName);
    const hint =
      schema.kind === "array"
        ? singularize(rootName) === rootName
          ? `${rootName}Items`
          : rootName
        : `${rootName}Value`;
    const rootType = renderType(schema, hint);
    declarations.unshift({ name: rootName, body: `export type ${rootName} = ${rootType};` });
  }
  return declarations
    .map((declaration) => declaration.body)
    .filter(Boolean)
    .join("\n\n");
}
