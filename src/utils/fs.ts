import { readFile, access } from "node:fs/promises";
import { constants } from "node:fs";

export async function exists(path: string): Promise<boolean> {
  try {
    await access(path, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

export async function readJson<T>(path: string): Promise<T | null> {
  try {
    const content = await readFile(path, "utf-8");
    return JSON.parse(content) as T;
  } catch {
    return null;
  }
}

export async function readText(path: string): Promise<string | null> {
  try {
    return await readFile(path, "utf-8");
  } catch {
    return null;
  }
}

export async function readLines(path: string): Promise<string[]> {
  const content = await readText(path);
  if (!content) return [];
  return content.split("\n").filter((line) => line.trim());
}

export function parseToml(content: string): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  let currentSection = result;
  let currentSectionName = "";

  const lines = content.split("\n");

  for (const line of lines) {
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith("#")) continue;

    const sectionMatch = trimmed.match(/^\[([^\]]+)\]$/);
    if (sectionMatch) {
      currentSectionName = sectionMatch[1];
      const parts = currentSectionName.split(".");
      let target = result;
      for (const part of parts) {
        if (!target[part]) {
          target[part] = {};
        }
        target = target[part] as Record<string, unknown>;
      }
      currentSection = target;
      continue;
    }

    const kvMatch = trimmed.match(/^([^=]+)=\s*(.+)$/);
    if (kvMatch) {
      const key = kvMatch[1].trim();
      const rawValue = kvMatch[2].trim();
      let value: unknown = rawValue;

      if (
        (rawValue.startsWith('"') && rawValue.endsWith('"')) ||
        (rawValue.startsWith("'") && rawValue.endsWith("'"))
      ) {
        value = rawValue.slice(1, -1);
      } else if (rawValue === "true") {
        value = true;
      } else if (rawValue === "false") {
        value = false;
      } else if (/^\d+$/.test(rawValue)) {
        value = parseInt(rawValue, 10);
      } else if (rawValue.startsWith("[") && rawValue.endsWith("]")) {
        const arrayContent = rawValue.slice(1, -1);
        value = arrayContent
          .split(",")
          .map((item: string) => item.trim().replace(/^["']|["']$/g, ""))
          .filter(Boolean);
      }

      currentSection[key] = value;
    }
  }

  return result;
}

export async function readToml(
  path: string
): Promise<Record<string, unknown> | null> {
  const content = await readText(path);
  if (!content) return null;
  try {
    return parseToml(content);
  } catch {
    return null;
  }
}

