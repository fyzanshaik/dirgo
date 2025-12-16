import { join } from "node:path";
import { readdir } from "node:fs/promises";
import type { MonorepoInfo, MonorepoType, WorkspacePackage } from "../types.js";
import { exists, readJson, readText, readToml } from "../utils/fs.js";

interface PackageJson {
  name?: string;
  workspaces?: string[] | { packages: string[] };
}

async function findPackagesFromGlobs(
  dir: string,
  patterns: string[]
): Promise<WorkspacePackage[]> {
  const packages: WorkspacePackage[] = [];

  for (const pattern of patterns) {
    const cleanPattern = pattern.replace(/\/\*$/, "").replace(/\*$/, "");
    const packagesDir = join(dir, cleanPattern);

    if (!(await exists(packagesDir))) continue;

    try {
      const items = await readdir(packagesDir, { withFileTypes: true });
      for (const item of items) {
        if (!item.isDirectory()) continue;

        const pkgPath = join(packagesDir, item.name);
        const pkgJson = await readJson<PackageJson>(join(pkgPath, "package.json"));

        packages.push({
          name: pkgJson?.name || item.name,
          path: join(cleanPattern, item.name),
        });
      }
    } catch {}
  }

  return packages;
}

async function detectNpmWorkspaces(dir: string): Promise<MonorepoInfo | null> {
  const pkg = await readJson<PackageJson>(join(dir, "package.json"));
  if (!pkg?.workspaces) return null;

  const patterns = Array.isArray(pkg.workspaces)
    ? pkg.workspaces
    : pkg.workspaces.packages || [];

  const packages = await findPackagesFromGlobs(dir, patterns);

  return {
    type: "npm-workspaces",
    packages,
  };
}

async function detectPnpmWorkspace(dir: string): Promise<MonorepoInfo | null> {
  const content = await readText(join(dir, "pnpm-workspace.yaml"));
  if (!content) return null;

  const patterns: string[] = [];
  const lines = content.split("\n");
  let inPackages = false;

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed === "packages:") {
      inPackages = true;
      continue;
    }
    if (inPackages && trimmed.startsWith("- ")) {
      patterns.push(trimmed.slice(2).replace(/['"`]/g, ""));
    } else if (inPackages && !trimmed.startsWith("-") && trimmed) {
      inPackages = false;
    }
  }

  const packages = await findPackagesFromGlobs(dir, patterns);

  return {
    type: "pnpm",
    packages,
  };
}

async function detectTurbo(dir: string): Promise<MonorepoInfo | null> {
  if (!(await exists(join(dir, "turbo.json")))) return null;

  const workspaces = await detectNpmWorkspaces(dir);
  if (!workspaces) {
    const pnpm = await detectPnpmWorkspace(dir);
    if (pnpm) {
      return { ...pnpm, type: "turbo" };
    }
    return null;
  }

  return {
    type: "turbo",
    packages: workspaces.packages,
  };
}

async function detectNx(dir: string): Promise<MonorepoInfo | null> {
  if (!(await exists(join(dir, "nx.json")))) return null;

  const packages: WorkspacePackage[] = [];

  for (const subdir of ["packages", "apps", "libs"]) {
    const subdirPath = join(dir, subdir);
    if (!(await exists(subdirPath))) continue;

    try {
      const items = await readdir(subdirPath, { withFileTypes: true });
      for (const item of items) {
        if (!item.isDirectory()) continue;
        const pkgJson = await readJson<PackageJson>(
          join(subdirPath, item.name, "package.json")
        );
        packages.push({
          name: pkgJson?.name || item.name,
          path: join(subdir, item.name),
        });
      }
    } catch {}
  }

  return {
    type: "nx",
    packages,
  };
}

async function detectLerna(dir: string): Promise<MonorepoInfo | null> {
  const lernaJson = await readJson<{ packages?: string[] }>(
    join(dir, "lerna.json")
  );
  if (!lernaJson) return null;

  const patterns = lernaJson.packages || ["packages/*"];
  const packages = await findPackagesFromGlobs(dir, patterns);

  return {
    type: "lerna",
    packages,
  };
}

async function detectGoWorkspace(dir: string): Promise<MonorepoInfo | null> {
  const content = await readText(join(dir, "go.work"));
  if (!content) return null;

  const packages: WorkspacePackage[] = [];
  const lines = content.split("\n");
  let inUse = false;

  for (const line of lines) {
    const trimmed = line.trim();

    if (trimmed === "use (") {
      inUse = true;
      continue;
    }

    if (trimmed === ")" && inUse) {
      inUse = false;
      continue;
    }

    if (trimmed.startsWith("use ") && !trimmed.includes("(")) {
      const path = trimmed.slice(4).trim();
      packages.push({
        name: path,
        path,
        type: "go",
      });
      continue;
    }

    if (inUse && trimmed) {
      packages.push({
        name: trimmed,
        path: trimmed,
        type: "go",
      });
    }
  }

  return {
    type: "go-workspace",
    packages,
  };
}

async function detectCargoWorkspace(dir: string): Promise<MonorepoInfo | null> {
  const cargo = await readToml(join(dir, "Cargo.toml"));
  if (!cargo) return null;

  const workspace = cargo["workspace"] as { members?: string[] } | undefined;
  if (!workspace?.members) return null;

  const packages: WorkspacePackage[] = [];

  for (const member of workspace.members) {
    const memberPath = member.replace(/\/\*$/, "");

    if (member.endsWith("/*")) {
      const memberDir = join(dir, memberPath);
      if (!(await exists(memberDir))) continue;

      try {
        const items = await readdir(memberDir, { withFileTypes: true });
        for (const item of items) {
          if (!item.isDirectory()) continue;
          const cargoToml = await readToml(
            join(memberDir, item.name, "Cargo.toml")
          );
          const pkg = cargoToml?.["package"] as { name?: string } | undefined;
          packages.push({
            name: pkg?.name || item.name,
            path: join(memberPath, item.name),
            type: "rust",
          });
        }
      } catch {}
    } else {
      const cargoToml = await readToml(join(dir, member, "Cargo.toml"));
      const pkg = cargoToml?.["package"] as { name?: string } | undefined;
      packages.push({
        name: pkg?.name || member,
        path: member,
        type: "rust",
      });
    }
  }

  return {
    type: "cargo-workspace",
    packages,
  };
}

export async function detectMonorepo(dir: string): Promise<MonorepoInfo | null> {
  const turbo = await detectTurbo(dir);
  if (turbo) return turbo;

  const nx = await detectNx(dir);
  if (nx) return nx;

  const lerna = await detectLerna(dir);
  if (lerna) return lerna;

  const pnpm = await detectPnpmWorkspace(dir);
  if (pnpm) return pnpm;

  const npm = await detectNpmWorkspaces(dir);
  if (npm) return npm;

  const goWorkspace = await detectGoWorkspace(dir);
  if (goWorkspace) return goWorkspace;

  const cargo = await detectCargoWorkspace(dir);
  if (cargo) return cargo;

  return null;
}

