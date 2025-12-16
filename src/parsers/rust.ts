import { join } from "node:path";
import type { ProjectInfo, Dependency } from "../types.js";
import { readToml } from "../utils/fs.js";

interface CargoToml {
  package?: {
    name?: string;
    edition?: string;
    "rust-version"?: string;
  };
  dependencies?: Record<string, unknown>;
  "dev-dependencies"?: Record<string, unknown>;
  "build-dependencies"?: Record<string, unknown>;
  workspace?: {
    members?: string[];
  };
}

function parseDependencies(
  deps: Record<string, unknown> | undefined,
  isDev: boolean
): Dependency[] {
  if (!deps) return [];

  const result: Dependency[] = [];

  for (const [name, value] of Object.entries(deps)) {
    let version = "latest";

    if (typeof value === "string") {
      version = value;
    } else if (typeof value === "object" && value !== null) {
      const v = (value as Record<string, unknown>)["version"];
      if (typeof v === "string") {
        version = v;
      }
    }

    result.push({
      name,
      version,
      isDev,
      isIndirect: false,
    });
  }

  return result;
}

export async function parseRustProject(dir: string): Promise<ProjectInfo> {
  const cargo = (await readToml(join(dir, "Cargo.toml"))) as CargoToml | null;

  if (!cargo) {
    return {
      type: "rust",
      dependencies: [],
    };
  }

  const dependencies: Dependency[] = [
    ...parseDependencies(cargo.dependencies, false),
    ...parseDependencies(cargo["dev-dependencies"], true),
    ...parseDependencies(cargo["build-dependencies"], true),
  ];

  return {
    type: "rust",
    dependencies,
    rust: {
      name: cargo.package?.name,
      edition: cargo.package?.edition,
      rustVersion: cargo.package?.["rust-version"],
    },
  };
}

