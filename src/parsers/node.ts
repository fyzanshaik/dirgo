import { join } from "node:path";
import type {
  ProjectInfo,
  Dependency,
  PackageManager,
  TSConfig,
} from "../types.js";
import { readJson, exists } from "../utils/fs.js";

interface PackageJson {
  name?: string;
  version?: string;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  workspaces?: string[] | { packages: string[] };
}

interface TSConfigJson {
  compilerOptions?: {
    paths?: Record<string, string[]>;
    baseUrl?: string;
    target?: string;
    module?: string;
    strict?: boolean;
    jsx?: string;
  };
  references?: { path: string }[];
}

async function detectPackageManager(dir: string): Promise<PackageManager> {
  if (await exists(join(dir, "bun.lockb"))) return "bun";
  if (await exists(join(dir, "pnpm-lock.yaml"))) return "pnpm";
  if (await exists(join(dir, "yarn.lock"))) return "yarn";
  return "npm";
}

async function parseTSConfig(dir: string): Promise<TSConfig | undefined> {
  const config = await readJson<TSConfigJson>(join(dir, "tsconfig.json"));
  if (!config) return undefined;

  const result: TSConfig = {};

  if (config.compilerOptions?.paths) {
    result.paths = config.compilerOptions.paths;
  }
  if (config.compilerOptions?.baseUrl) {
    result.baseUrl = config.compilerOptions.baseUrl;
  }
  if (config.compilerOptions?.target) {
    result.target = config.compilerOptions.target;
  }
  if (config.compilerOptions?.module) {
    result.module = config.compilerOptions.module;
  }
  if (config.compilerOptions?.strict !== undefined) {
    result.strict = config.compilerOptions.strict;
  }
  if (config.compilerOptions?.jsx) {
    result.jsx = config.compilerOptions.jsx;
  }
  if (config.references) {
    result.references = config.references;
  }

  return Object.keys(result).length > 0 ? result : undefined;
}

export async function parseNodeProject(dir: string): Promise<ProjectInfo> {
  const pkg = await readJson<PackageJson>(join(dir, "package.json"));
  const dependencies: Dependency[] = [];

  if (pkg?.dependencies) {
    for (const [name, version] of Object.entries(pkg.dependencies)) {
      dependencies.push({
        name,
        version,
        isDev: false,
        isIndirect: false,
      });
    }
  }

  if (pkg?.devDependencies) {
    for (const [name, version] of Object.entries(pkg.devDependencies)) {
      dependencies.push({
        name,
        version,
        isDev: true,
        isIndirect: false,
      });
    }
  }

  const packageManager = await detectPackageManager(dir);
  const tsconfig = await parseTSConfig(dir);

  return {
    type: "node",
    dependencies,
    node: {
      name: pkg?.name,
      version: pkg?.version,
      packageManager,
      tsconfig,
    },
  };
}

