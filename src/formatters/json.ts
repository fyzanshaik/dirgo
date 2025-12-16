import type { ScanResult, ContextResult } from "../types.js";
import { estimateTokens } from "../core/tokens.js";

interface JsonOutput {
  project: {
    type: string;
    monorepo?: {
      type: string;
      packages: Array<{
        name: string;
        path: string;
      }>;
    };
  };
  structure: Array<{
    path: string;
    type: "file" | "directory";
    depth: number;
    size?: number;
  }>;
  dependencies: Array<{
    name: string;
    version: string;
    dev: boolean;
    indirect: boolean;
  }>;
  config?: Record<string, unknown>;
  meta: {
    bytes: number;
    tokens: number;
  };
}

export function formatJson(result: ScanResult): ContextResult {
  const output: JsonOutput = {
    project: {
      type: result.projectInfo.type,
    },
    structure: result.entries.map((e) => ({
      path: e.relativePath,
      type: e.isDirectory ? "directory" : "file",
      depth: e.depth,
      size: e.size,
    })),
    dependencies: result.projectInfo.dependencies.map((d) => ({
      name: d.name,
      version: d.version,
      dev: d.isDev,
      indirect: d.isIndirect,
    })),
    meta: {
      bytes: 0,
      tokens: 0,
    },
  };

  if (result.monorepo) {
    output.project.monorepo = {
      type: result.monorepo.type,
      packages: result.monorepo.packages.map((p) => ({
        name: p.name,
        path: p.path,
      })),
    };
  }

  if (result.projectInfo.node?.tsconfig) {
    output.config = { tsconfig: result.projectInfo.node.tsconfig };
  }

  const text = JSON.stringify(output, null, 2);
  const bytes = Buffer.byteLength(text, "utf-8");
  const tokens = estimateTokens(text);

  output.meta.bytes = bytes;
  output.meta.tokens = tokens;

  const finalText = JSON.stringify(output, null, 2);

  return {
    text: finalText,
    bytes: Buffer.byteLength(finalText, "utf-8"),
    tokens: estimateTokens(finalText),
  };
}


