import { readdir, stat } from "node:fs/promises";
import { join, relative } from "node:path";
import ignore, { type Ignore } from "ignore";
import type { FileEntry, ScanOptions, ScanResult } from "../types.js";
import { readText } from "../utils/fs.js";
import { parseProject, detectProjectType } from "../parsers/index.js";
import { detectMonorepo } from "../monorepo/detect.js";

const DEFAULT_EXCLUDES = [
  "node_modules",
  ".git",
  "dist",
  "build",
  ".next",
  ".nuxt",
  ".output",
  "coverage",
  "__pycache__",
  ".pytest_cache",
  ".venv",
  "venv",
  ".env",
  "target",
  ".cache",
  ".turbo",
  ".DS_Store",
  "*.pyc",
  "*.pyo",
];

async function loadGitignore(dir: string): Promise<string[]> {
  const content = await readText(join(dir, ".gitignore"));
  if (!content) return [];
  return content
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#"));
}

async function scanDirectory(
  dir: string,
  baseDir: string,
  ig: Ignore,
  depth: number,
  maxDepth: number | undefined,
  focus: string | undefined
): Promise<FileEntry[]> {
  if (maxDepth !== undefined && depth > maxDepth) return [];

  const entries: FileEntry[] = [];
  const items = await readdir(dir, { withFileTypes: true });

  const dirs: typeof items = [];
  const files: typeof items = [];

  for (const item of items) {
    const relativePath = relative(baseDir, join(dir, item.name));
    if (ig.ignores(relativePath)) continue;

    if (item.isDirectory()) {
      dirs.push(item);
    } else {
      files.push(item);
    }
  }

  dirs.sort((a, b) => a.name.localeCompare(b.name));
  files.sort((a, b) => a.name.localeCompare(b.name));

  for (const item of dirs) {
    const fullPath = join(dir, item.name);
    const relativePath = relative(baseDir, fullPath);

    if (focus && !relativePath.startsWith(focus) && !focus.startsWith(relativePath)) {
      continue;
    }

    let size: number | undefined;
    try {
      const stats = await stat(fullPath);
      size = stats.size;
    } catch {}

    entries.push({
      name: item.name,
      path: fullPath,
      relativePath,
      isDirectory: true,
      depth,
      size,
    });

    const subEntries = await scanDirectory(
      fullPath,
      baseDir,
      ig,
      depth + 1,
      maxDepth,
      focus
    );
    entries.push(...subEntries);
  }

  for (const item of files) {
    const fullPath = join(dir, item.name);
    const relativePath = relative(baseDir, fullPath);

    if (focus && !relativePath.startsWith(focus)) {
      continue;
    }

    let size: number | undefined;
    try {
      const stats = await stat(fullPath);
      size = stats.size;
    } catch {}

    entries.push({
      name: item.name,
      path: fullPath,
      relativePath,
      isDirectory: false,
      depth,
      size,
    });
  }

  return entries;
}

export async function scan(options: ScanOptions): Promise<ScanResult> {
  const dir = options.dir || ".";
  const ig = ignore();

  if (!options.includeAll) {
    ig.add(DEFAULT_EXCLUDES);
  }

  if (options.ignore) {
    ig.add(options.ignore);
  }

  const gitignorePatterns = await loadGitignore(dir);
  ig.add(gitignorePatterns);

  const entries = await scanDirectory(
    dir,
    dir,
    ig,
    0,
    options.depth,
    options.focus
  );

  const projectType = await detectProjectType(dir);
  const projectInfo = await parseProject(dir, projectType);
  const monorepo = await detectMonorepo(dir);

  return {
    root: dir,
    entries,
    projectInfo,
    monorepo: monorepo ?? undefined,
  };
}


