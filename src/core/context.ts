import type {
  ScanResult,
  ContextOptions,
  ContextResult,
  OutputFormat,
  Dependency,
} from "../types.js";
import { scan } from "./scanner.js";
import { estimateTokens } from "./tokens.js";
import { formatTree } from "../formatters/tree.js";
import { formatToon } from "../formatters/toon.js";
import { formatJson } from "../formatters/json.js";

function formatProjectHeader(result: ScanResult): string {
  let header = `Project: ${result.projectInfo.type}`;

  if (result.projectInfo.node) {
    const node = result.projectInfo.node;
    header += ` (${node.packageManager})`;
    if (node.tsconfig) {
      header += " [typescript]";
    }
  }

  if (result.projectInfo.python) {
    const py = result.projectInfo.python;
    if (py.buildSystem) {
      header += ` (${py.buildSystem})`;
    }
  }

  if (result.projectInfo.go) {
    const go = result.projectInfo.go;
    if (go.goVersion) {
      header += ` (go ${go.goVersion})`;
    }
  }

  if (result.projectInfo.rust) {
    const rust = result.projectInfo.rust;
    if (rust.edition) {
      header += ` (edition ${rust.edition})`;
    }
  }

  header += "\n";

  if (result.monorepo) {
    header += `Monorepo: ${result.monorepo.type} (${result.monorepo.packages.length} packages)\n`;
  }

  return header;
}

function formatDependencies(deps: Dependency[]): string {
  if (deps.length === 0) return "";

  const directDeps = deps.filter((d) => !d.isDev && !d.isIndirect);
  const devDeps = deps.filter((d) => d.isDev);
  const indirectDeps = deps.filter((d) => d.isIndirect);

  let output = "";

  if (directDeps.length > 0) {
    output += `\nDependencies (${directDeps.length}):\n`;
    for (const dep of directDeps.slice(0, 20)) {
      output += `  ${dep.name}: ${dep.version}\n`;
    }
    if (directDeps.length > 20) {
      output += `  ... and ${directDeps.length - 20} more\n`;
    }
  }

  if (devDeps.length > 0) {
    output += `\nDev Dependencies (${devDeps.length}):\n`;
    for (const dep of devDeps.slice(0, 10)) {
      output += `  ${dep.name}: ${dep.version}\n`;
    }
    if (devDeps.length > 10) {
      output += `  ... and ${devDeps.length - 10} more\n`;
    }
  }

  if (indirectDeps.length > 0) {
    output += `\nIndirect Dependencies: ${indirectDeps.length}\n`;
  }

  return output;
}

function formatTSConfig(result: ScanResult): string {
  const tsconfig = result.projectInfo.node?.tsconfig;
  if (!tsconfig) return "";

  let output = "\ntsconfig.json:\n";

  if (tsconfig.paths && Object.keys(tsconfig.paths).length > 0) {
    output += "  paths:\n";
    for (const [alias, paths] of Object.entries(tsconfig.paths)) {
      output += `    ${alias}: ${paths[0]}\n`;
    }
  }

  if (tsconfig.target) {
    output += `  target: ${tsconfig.target}\n`;
  }

  if (tsconfig.strict !== undefined) {
    output += `  strict: ${tsconfig.strict}\n`;
  }

  if (tsconfig.references && tsconfig.references.length > 0) {
    output += `  references: ${tsconfig.references.length} projects\n`;
  }

  return output;
}

function formatMonorepoPackages(result: ScanResult): string {
  if (!result.monorepo) return "";

  let output = "\nWorkspace Packages:\n";
  for (const pkg of result.monorepo.packages) {
    output += `  ${pkg.name} (${pkg.path})\n`;
  }

  return output;
}

export async function buildContext(
  options: ContextOptions,
  format: OutputFormat = "tree",
  useEmoji: boolean = false
): Promise<ContextResult> {
  const result = await scan(options);

  if (format === "json") {
    return formatJson(result);
  }

  let text = "";

  text += formatProjectHeader(result);
  text += "\n";

  if (format === "toon") {
    text += formatToon(result.entries);
  } else {
    text += formatTree(result.entries, useEmoji);
  }

  text += formatDependencies(result.projectInfo.dependencies);
  text += formatTSConfig(result);
  text += formatMonorepoPackages(result);

  const bytes = Buffer.byteLength(text, "utf-8");
  const tokens = estimateTokens(text);

  return { text, bytes, tokens };
}

export async function buildTree(
  options: ContextOptions,
  format: OutputFormat = "tree",
  useEmoji: boolean = false
): Promise<ContextResult> {
  const result = await scan(options);

  if (format === "json") {
    return formatJson(result);
  }

  let text = "";

  if (format === "toon") {
    text = formatToon(result.entries);
  } else {
    text = formatTree(result.entries, useEmoji);
  }

  const bytes = Buffer.byteLength(text, "utf-8");
  const tokens = estimateTokens(text);

  return { text, bytes, tokens };
}

export async function buildDeps(dir: string): Promise<ContextResult> {
  const result = await scan({ dir });

  let text = formatProjectHeader(result);
  text += formatDependencies(result.projectInfo.dependencies);

  const bytes = Buffer.byteLength(text, "utf-8");
  const tokens = estimateTokens(text);

  return { text, bytes, tokens };
}

