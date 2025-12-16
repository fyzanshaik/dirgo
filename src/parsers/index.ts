import type { ProjectType, ProjectInfo } from "../types.js";
import { exists } from "../utils/fs.js";
import { join } from "node:path";
import { parseNodeProject } from "./node.js";
import { parsePythonProject } from "./python.js";
import { parseGoProject } from "./go.js";
import { parseRustProject } from "./rust.js";

export async function detectProjectType(dir: string): Promise<ProjectType> {
  const checks: [string, ProjectType][] = [
    ["package.json", "node"],
    ["Cargo.toml", "rust"],
    ["go.mod", "go"],
    ["pyproject.toml", "python"],
    ["requirements.txt", "python"],
    ["Pipfile", "python"],
    ["setup.py", "python"],
  ];

  for (const [file, type] of checks) {
    if (await exists(join(dir, file))) {
      return type;
    }
  }

  return "unknown";
}

export async function parseProject(
  dir: string,
  type: ProjectType
): Promise<ProjectInfo> {
  const baseInfo: ProjectInfo = {
    type,
    dependencies: [],
  };

  switch (type) {
    case "node":
      return parseNodeProject(dir);
    case "python":
      return parsePythonProject(dir);
    case "go":
      return parseGoProject(dir);
    case "rust":
      return parseRustProject(dir);
    default:
      return baseInfo;
  }
}


