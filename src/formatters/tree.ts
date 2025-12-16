import { extname, basename } from "node:path";
import type { FileEntry } from "../types.js";

const FILE_EMOJIS: Record<string, string> = {
  ".js": "📄",
  ".ts": "📄",
  ".jsx": "⚛️",
  ".tsx": "⚛️",
  ".vue": "🎨",
  ".svelte": "🎨",
  ".css": "🎨",
  ".scss": "🎨",
  ".sass": "🎨",
  ".less": "🎨",
  ".html": "🌐",
  ".md": "📚",
  ".mdx": "📚",
  ".txt": "📝",
  ".json": "⚙️",
  ".yaml": "⚙️",
  ".yml": "⚙️",
  ".toml": "⚙️",
  ".env": "🔒",
  ".gitignore": "👁️",
  ".dockerignore": "👁️",
  ".png": "🖼️",
  ".jpg": "🖼️",
  ".jpeg": "🖼️",
  ".gif": "🖼️",
  ".svg": "🎨",
  ".webp": "🖼️",
  ".ico": "🖼️",
  ".sql": "🗄️",
  ".db": "🗄️",
  ".sqlite": "🗄️",
  ".csv": "📊",
  ".py": "🐍",
  ".go": "🐹",
  ".rs": "🦀",
  ".rb": "💎",
  ".php": "🐘",
  ".java": "☕",
  ".kt": "📱",
  ".swift": "🍎",
  ".c": "⚡",
  ".cpp": "⚡",
  ".h": "⚡",
  ".sh": "📜",
  ".bash": "📜",
  ".zsh": "📜",
  ".fish": "📜",
  ".ps1": "📜",
  ".bat": "📜",
  ".lock": "🔒",
};

const SPECIAL_FILES: Record<string, string> = {
  "package.json": "📦",
  "Cargo.toml": "📦",
  "go.mod": "📦",
  "pyproject.toml": "📦",
  "requirements.txt": "📦",
  "Pipfile": "📦",
  "Dockerfile": "🐳",
  "docker-compose.yml": "🐳",
  "docker-compose.yaml": "🐳",
  ".dockerignore": "🐳",
  "Makefile": "🔧",
  "CMakeLists.txt": "🔧",
  "LICENSE": "📜",
  "README.md": "📚",
  "CHANGELOG.md": "📚",
  "tsconfig.json": "⚙️",
  "vite.config.ts": "⚡",
  "vite.config.js": "⚡",
  "next.config.js": "▲",
  "next.config.mjs": "▲",
  "nuxt.config.ts": "💚",
  "tailwind.config.js": "🎨",
  "tailwind.config.ts": "🎨",
  ".eslintrc": "📏",
  ".eslintrc.js": "📏",
  ".eslintrc.json": "📏",
  ".prettierrc": "💅",
  ".prettierrc.js": "💅",
  ".prettierrc.json": "💅",
  "jest.config.js": "🧪",
  "vitest.config.ts": "🧪",
  ".gitignore": "👁️",
  ".env": "🔒",
  ".env.local": "🔒",
  ".env.example": "🔒",
};

function getEmoji(entry: FileEntry): string {
  if (entry.isDirectory) return "📁";

  const name = basename(entry.name);
  if (SPECIAL_FILES[name]) return SPECIAL_FILES[name];

  const ext = extname(name);
  return FILE_EMOJIS[ext] || "📄";
}

interface TreeNode {
  entry: FileEntry;
  children: TreeNode[];
}

function buildTree(entries: FileEntry[]): TreeNode[] {
  const root: TreeNode[] = [];
  const nodeMap = new Map<string, TreeNode>();

  for (const entry of entries) {
    const node: TreeNode = { entry, children: [] };
    nodeMap.set(entry.relativePath, node);

    if (entry.depth === 0) {
      root.push(node);
    } else {
      const parentPath = entry.relativePath.split("/").slice(0, -1).join("/");
      const parent = nodeMap.get(parentPath);
      if (parent) {
        parent.children.push(node);
      }
    }
  }

  return root;
}

function renderNode(
  node: TreeNode,
  prefix: string,
  isLast: boolean,
  useEmoji: boolean
): string {
  let result = "";

  const connector = isLast ? "└── " : "├── ";
  const emoji = useEmoji ? getEmoji(node.entry) + " " : "";
  const name = node.entry.isDirectory
    ? node.entry.name + "/"
    : node.entry.name;

  result += prefix + connector + emoji + name + "\n";

  const childPrefix = prefix + (isLast ? "    " : "│   ");

  for (let i = 0; i < node.children.length; i++) {
    const child = node.children[i];
    const childIsLast = i === node.children.length - 1;
    result += renderNode(child, childPrefix, childIsLast, useEmoji);
  }

  return result;
}

export function formatTree(entries: FileEntry[], useEmoji: boolean): string {
  const tree = buildTree(entries);
  let result = "";

  for (let i = 0; i < tree.length; i++) {
    const node = tree[i];
    const isLast = i === tree.length - 1;
    result += renderNode(node, "", isLast, useEmoji);
  }

  return result;
}


