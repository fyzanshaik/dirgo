import { join } from "node:path";
import type { ProjectInfo, Dependency } from "../types.js";
import { readText, readToml, exists } from "../utils/fs.js";

function parseRequirementLine(line: string): Dependency | null {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#") || trimmed.startsWith("-")) {
    return null;
  }

  const match = trimmed.match(/^([a-zA-Z0-9_-]+)(?:\[.*?\])?(.*)$/);
  if (!match) return null;

  const name = match[1];
  let version = "latest";

  const versionMatch = match[2]?.match(/[=<>~!]+\s*([0-9][^\s,;]*)/);
  if (versionMatch) {
    version = versionMatch[1];
  }

  return {
    name,
    version,
    isDev: false,
    isIndirect: false,
  };
}

async function parseRequirementsTxt(dir: string): Promise<Dependency[]> {
  const content = await readText(join(dir, "requirements.txt"));
  if (!content) return [];

  const deps: Dependency[] = [];
  for (const line of content.split("\n")) {
    const dep = parseRequirementLine(line);
    if (dep) deps.push(dep);
  }
  return deps;
}

async function parsePyproject(
  dir: string
): Promise<{ deps: Dependency[]; pythonVersion?: string; buildSystem?: string }> {
  const toml = await readToml(join(dir, "pyproject.toml"));
  if (!toml) return { deps: [] };

  const deps: Dependency[] = [];
  let pythonVersion: string | undefined;
  let buildSystem: string | undefined;

  const buildBackend = (toml["build-system"] as Record<string, unknown>)?.["build-backend"];
  if (typeof buildBackend === "string") {
    if (buildBackend.includes("poetry")) buildSystem = "poetry";
    else if (buildBackend.includes("hatch")) buildSystem = "hatch";
    else if (buildBackend.includes("flit")) buildSystem = "flit";
    else if (buildBackend.includes("setuptools")) buildSystem = "setuptools";
  }

  const project = toml["project"] as Record<string, unknown> | undefined;
  if (project) {
    const requiresPython = project["requires-python"];
    if (typeof requiresPython === "string") {
      const match = requiresPython.match(/[0-9.]+/);
      if (match) pythonVersion = match[0];
    }

    const dependencies = project["dependencies"];
    if (Array.isArray(dependencies)) {
      for (const dep of dependencies) {
        if (typeof dep === "string") {
          const parsed = parseRequirementLine(dep);
          if (parsed) deps.push(parsed);
        }
      }
    }

    const optionalDeps = project["optional-dependencies"] as Record<string, string[]> | undefined;
    if (optionalDeps?.["dev"]) {
      for (const dep of optionalDeps["dev"]) {
        const parsed = parseRequirementLine(dep);
        if (parsed) {
          parsed.isDev = true;
          deps.push(parsed);
        }
      }
    }
  }

  const poetry = (toml["tool"] as Record<string, unknown>)?.["poetry"] as Record<string, unknown> | undefined;
  if (poetry) {
    buildSystem = "poetry";

    const poetryDeps = poetry["dependencies"] as Record<string, unknown> | undefined;
    if (poetryDeps) {
      for (const [name, value] of Object.entries(poetryDeps)) {
        if (name === "python") {
          if (typeof value === "string") {
            const match = value.match(/[0-9.]+/);
            if (match) pythonVersion = match[0];
          }
          continue;
        }

        let version = "latest";
        if (typeof value === "string") {
          version = value.replace(/[\^~>=<]/g, "");
        } else if (typeof value === "object" && value !== null) {
          const v = (value as Record<string, unknown>)["version"];
          if (typeof v === "string") {
            version = v.replace(/[\^~>=<]/g, "");
          }
        }

        deps.push({
          name,
          version,
          isDev: false,
          isIndirect: false,
        });
      }
    }

    const devDeps = (poetry["group"] as Record<string, unknown>)?.["dev"] as Record<string, unknown> | undefined;
    const devDepsList = devDeps?.["dependencies"] as Record<string, unknown> | undefined;
    if (devDepsList) {
      for (const [name, value] of Object.entries(devDepsList)) {
        let version = "latest";
        if (typeof value === "string") {
          version = value.replace(/[\^~>=<]/g, "");
        }
        deps.push({
          name,
          version,
          isDev: true,
          isIndirect: false,
        });
      }
    }
  }

  return { deps, pythonVersion, buildSystem };
}

async function parsePipfile(dir: string): Promise<Dependency[]> {
  const toml = await readToml(join(dir, "Pipfile"));
  if (!toml) return [];

  const deps: Dependency[] = [];

  const packages = toml["packages"] as Record<string, unknown> | undefined;
  if (packages) {
    for (const [name, value] of Object.entries(packages)) {
      let version = "latest";
      if (typeof value === "string" && value !== "*") {
        version = value;
      }
      deps.push({
        name,
        version,
        isDev: false,
        isIndirect: false,
      });
    }
  }

  const devPackages = toml["dev-packages"] as Record<string, unknown> | undefined;
  if (devPackages) {
    for (const [name, value] of Object.entries(devPackages)) {
      let version = "latest";
      if (typeof value === "string" && value !== "*") {
        version = value;
      }
      deps.push({
        name,
        version,
        isDev: true,
        isIndirect: false,
      });
    }
  }

  return deps;
}

export async function parsePythonProject(dir: string): Promise<ProjectInfo> {
  let dependencies: Dependency[] = [];
  let pythonVersion: string | undefined;
  let buildSystem: string | undefined;

  if (await exists(join(dir, "pyproject.toml"))) {
    const result = await parsePyproject(dir);
    dependencies = result.deps;
    pythonVersion = result.pythonVersion;
    buildSystem = result.buildSystem;
  } else if (await exists(join(dir, "Pipfile"))) {
    dependencies = await parsePipfile(dir);
    buildSystem = "pipenv";
  } else if (await exists(join(dir, "requirements.txt"))) {
    dependencies = await parseRequirementsTxt(dir);
    buildSystem = "pip";
  }

  const pythonVersionFile = await readText(join(dir, ".python-version"));
  if (pythonVersionFile) {
    pythonVersion = pythonVersionFile.trim();
  }

  return {
    type: "python",
    dependencies,
    python: {
      pythonVersion,
      buildSystem,
    },
  };
}


