import { describe, expect, it } from "vitest";
import {
  generateTypeScriptFromJson,
  normalizeTypeName,
  parseJsonForTypeScript,
} from "@/composables/useJsonToTypeScript";

const defaults = {
  rootName: "Root",
  declarationStyle: "interface" as const,
  optionalProperties: false,
  readonlyProperties: false,
  detectNullable: true,
};

describe("JSON to TypeScript generator", () => {
  it("menghasilkan interface dasar dan array primitive", () => {
    expect(
      generateTypeScriptFromJson(
        { id: 1, name: "Dirga", active: true, roles: ["admin"] },
        defaults,
      ),
    ).toBe(`export interface Root {
  id: number;
  name: string;
  active: boolean;
  roles: string[];
}`);
  });

  it("membuat nested interface dan inferensi array object lintas sample", () => {
    const output = generateTypeScriptFromJson(
      {
        users: [
          { id: 1, email: "a@example.com" },
          { id: 2, email: null, active: true },
        ],
      },
      defaults,
    );
    expect(output).toContain("users: User[];");
    expect(output).toContain("export interface User");
    expect(output).toContain("email: string | null;");
    expect(output).toContain("active?: boolean;");
  });

  it("mendukung type, readonly, optional, dan nullable toggle", () => {
    const output = generateTypeScriptFromJson(
      { profile: { display_name: "Dirga", bio: null } },
      {
        ...defaults,
        rootName: "api response",
        declarationStyle: "type",
        optionalProperties: true,
        readonlyProperties: true,
        detectNullable: false,
      },
    );
    expect(output).toContain("export type ApiResponse = {");
    expect(output).toContain("readonly profile?: Profile;");
    expect(output).toContain("readonly bio?: unknown;");
  });

  it("menangani root array, key invalid, empty array, dan nama type", () => {
    const output = generateTypeScriptFromJson([{ "display-name": "Dirga", tags: [] }], {
      ...defaults,
      rootName: "123 users",
    });
    expect(output).toContain("export type Type123Users = Type123User[];");
    expect(output).toContain('"display-name": string;');
    expect(output).toContain("tags: unknown[];");
    expect(normalizeTypeName("default")).toBe("DefaultType");
    expect(generateTypeScriptFromJson({ tags: [], samples: [[], ["value"]] }, defaults)).toContain("samples: string[][];");
    const rootArray = generateTypeScriptFromJson([{ id: 1 }], defaults);
    expect(rootArray).toContain("export type Root = RootItem[];");
    expect(rootArray).toContain("export interface RootItem");
  });

  it("memvalidasi JSON input", () => {
    expect(parseJsonForTypeScript('{"ok":true}')).toEqual({ ok: true });
    expect(() => parseJsonForTypeScript("{")).toThrow("JSON tidak valid");
  });

  it("menghasilkan type dari JSON sangat dalam tanpa recursive call stack", () => {
    let deeplyNested: Record<string, unknown> = { value: true };
    for (let depth = 0; depth < 2_000; depth += 1) deeplyNested = { child: deeplyNested };
    const output = generateTypeScriptFromJson(deeplyNested, defaults);
    expect(output).toContain("export interface Root");
    expect(output).toContain("value: boolean;");
  });
});
