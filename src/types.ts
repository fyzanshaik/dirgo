export type ProjectType = "node" | "python" | "go" | "rust" | "unknown";

export type MonorepoType =
  | "npm-workspaces"
  | "pnpm"
  | "yarn"
  | "turbo"
  | "nx"
  | "lerna"
  | "go-workspace"
  | "cargo-workspace"
  | "python-monorepo";

export type OutputFormat = "tree" | "toon" | "json";

export type PackageManager = "npm" | "pnpm" | "yarn" | "bun";

export interface Dependency {
  name: string;
  version: string;
  isDev: boolean;
  isIndirect: boolean;
}

export interface TSConfig {
  paths?: Record<string, string[]>;
  baseUrl?: string;
  target?: string;
  module?: string;
  strict?: boolean;
  jsx?: string;
  references?: { path: string }[];
}

export interface NodeProjectInfo {
  name?: string;
  version?: string;
  packageManager: PackageManager;
  tsconfig?: TSConfig;
}

export interface PythonProjectInfo {
  pythonVersion?: string;
  buildSystem?: string;
}

export interface GoProjectInfo {
  moduleName?: string;
  goVersion?: string;
}

export interface RustProjectInfo {
  name?: string;
  edition?: string;
  rustVersion?: string;
}

export interface ProjectInfo {
  type: ProjectType;
  dependencies: Dependency[];
  node?: NodeProjectInfo;
  python?: PythonProjectInfo;
  go?: GoProjectInfo;
  rust?: RustProjectInfo;
}

export interface WorkspacePackage {
  name: string;
  path: string;
  type?: ProjectType;
}

export interface MonorepoInfo {
  type: MonorepoType;
  packages: WorkspacePackage[];
}

export interface FileEntry {
  name: string;
  path: string;
  relativePath: string;
  isDirectory: boolean;
  depth: number;
  size?: number;
}

export interface ScanResult {
  root: string;
  entries: FileEntry[];
  projectInfo: ProjectInfo;
  monorepo?: MonorepoInfo;
}

export interface ScanOptions {
  dir: string;
  ignore?: string[];
  includeAll?: boolean;
  depth?: number;
  focus?: string;
}

export interface OutputOptions {
  format: OutputFormat;
  emoji: boolean;
  clipboard: boolean;
  output?: string;
}

export interface ContextOptions extends ScanOptions {
  include?: string[];
  maxTokens?: number;
}

export interface ContextResult {
  text: string;
  bytes: number;
  tokens: number;
}

export interface MCPTool {
  name: string;
  description: string;
  inputSchema: {
    type: "object";
    properties: Record<string, unknown>;
    required?: string[];
  };
}

export interface MCPRequest {
  jsonrpc: "2.0";
  id: number | string;
  method: string;
  params?: Record<string, unknown>;
}

export interface MCPResponse {
  jsonrpc: "2.0";
  id: number | string;
  result?: unknown;
  error?: {
    code: number;
    message: string;
    data?: unknown;
  };
}


