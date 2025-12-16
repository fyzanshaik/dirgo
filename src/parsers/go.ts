import { join } from "node:path";
import type { ProjectInfo, Dependency } from "../types.js";
import { readText } from "../utils/fs.js";

function parseGoMod(content: string): {
  moduleName?: string;
  goVersion?: string;
  dependencies: Dependency[];
} {
  const dependencies: Dependency[] = [];
  let moduleName: string | undefined;
  let goVersion: string | undefined;
  let inRequireBlock = false;

  const lines = content.split("\n");

  for (const line of lines) {
    const trimmed = line.trim();

    if (trimmed.startsWith("module ")) {
      moduleName = trimmed.slice(7).trim();
      continue;
    }

    if (trimmed.startsWith("go ")) {
      goVersion = trimmed.slice(3).trim();
      continue;
    }

    if (trimmed === "require (") {
      inRequireBlock = true;
      continue;
    }

    if (trimmed === ")" && inRequireBlock) {
      inRequireBlock = false;
      continue;
    }

    if (trimmed.startsWith("require ") && !trimmed.includes("(")) {
      const parts = trimmed.slice(8).trim().split(/\s+/);
      if (parts.length >= 2) {
        dependencies.push({
          name: parts[0],
          version: parts[1],
          isDev: false,
          isIndirect: false,
        });
      }
      continue;
    }

    if (inRequireBlock && trimmed && !trimmed.startsWith("//")) {
      const isIndirect = trimmed.includes("// indirect");
      const cleanLine = trimmed.replace("// indirect", "").trim();
      const parts = cleanLine.split(/\s+/);

      if (parts.length >= 2) {
        dependencies.push({
          name: parts[0],
          version: parts[1],
          isDev: false,
          isIndirect,
        });
      }
    }
  }

  return { moduleName, goVersion, dependencies };
}

export async function parseGoProject(dir: string): Promise<ProjectInfo> {
  const goModContent = await readText(join(dir, "go.mod"));

  if (!goModContent) {
    return {
      type: "go",
      dependencies: [],
    };
  }

  const { moduleName, goVersion, dependencies } = parseGoMod(goModContent);

  return {
    type: "go",
    dependencies,
    go: {
      moduleName,
      goVersion,
    },
  };
}

