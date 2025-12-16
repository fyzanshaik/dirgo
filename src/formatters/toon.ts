import type { FileEntry } from "../types.js";

export function formatToon(entries: FileEntry[]): string {
  let result = "";

  for (const entry of entries) {
    const indent = "  ".repeat(entry.depth);
    const name = entry.isDirectory ? entry.name + "/" : entry.name;
    result += indent + name + "\n";
  }

  return result;
}


