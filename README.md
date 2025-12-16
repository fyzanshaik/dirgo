# dirgo

Fast directory structure generator with LLM context support. Built for developers and AI agents.

Supports Node.js/TypeScript, Python, Go, and Rust projects with intelligent monorepo detection.

## Installation

```bash
npm install -g dirgo
```

Or run directly:

```bash
npx dirgo
bunx dirgo
```

## Quick Start

```bash
dirgo                    # Tree output → clipboard
dirgo context            # Full LLM context with deps
dirgo deps               # Dependencies only
dirgo help               # Show help
```

## Commands

### `dirgo` / `dirgo tree`

Generate directory tree structure.

```bash
dirgo                        # Basic tree, copies to clipboard
dirgo -e                     # With emojis
dirgo --format toon          # TOON notation (indentation-based)
dirgo --format json          # JSON output
dirgo --depth 3              # Limit depth to 3 levels
dirgo --focus src/components # Focus on specific subtree
dirgo -o tree.txt            # Write to file
dirgo --no-copy              # Don't copy to clipboard
dirgo --include-all          # Include node_modules, .git, etc.
```

### `dirgo context`

Generate full LLM context including structure, dependencies, and config.

```bash
dirgo context                # Full context → clipboard
dirgo context -e             # With emojis
dirgo context --format json  # JSON output
dirgo context --depth 2      # Limit tree depth
```

Output includes:
- Project type detection (node, python, go, rust)
- Directory structure
- Dependencies (regular, dev, indirect)
- tsconfig.json paths and settings
- Monorepo workspace packages

### `dirgo deps`

Show project dependencies only.

```bash
dirgo deps                   # Show all deps
dirgo deps -d ./my-project   # Specific directory
dirgo deps -o deps.txt       # Write to file
```

### `dirgo serve`

Start MCP server for AI agent integration.

```bash
dirgo serve
```

### `dirgo help`

Show help information.

```bash
dirgo help              # General help
dirgo tree --help       # Tree command help
dirgo context --help    # Context command help
```

## Options

| Option | Description | Default |
|--------|-------------|---------|
| `-d, --dir <path>` | Target directory | `.` |
| `-e, --emoji` | Enable emojis in output | `false` |
| `-o, --output <file>` | Write to file instead of stdout | - |
| `--no-copy` | Disable clipboard copy | `false` |
| `--format <type>` | Output format: `tree`, `toon`, `json` | `tree` |
| `--depth <n>` | Limit tree depth | unlimited |
| `--focus <path>` | Only expand specific subtree | - |
| `--include-all` | Include node_modules, .git, etc. | `false` |

## Output Formats

### Tree (default)
```
├── src/
│   ├── index.ts
│   └── utils/
│       └── helpers.ts
└── package.json

[copied 123B · ~31 tokens]
```

### TOON (Tree Object-Oriented Notation)
```
src/
  index.ts
  utils/
    helpers.ts
package.json

[copied 89B · ~22 tokens]
```

### JSON
```json
{
  "project": { "type": "node" },
  "structure": [...],
  "dependencies": [...],
  "meta": { "bytes": 1234, "tokens": 308 }
}
```

## Language Support

| Language | Files Parsed | What's Extracted |
|----------|--------------|------------------|
| **Node.js/TypeScript** | `package.json`, `tsconfig.json` | deps, devDeps, paths, compiler options |
| **Python** | `pyproject.toml`, `requirements.txt`, `Pipfile` | deps, python version, build system |
| **Go** | `go.mod`, `go.work` | deps (direct/indirect), go version |
| **Rust** | `Cargo.toml` | deps, edition, workspace members |

## Monorepo Detection

Automatically detects and analyzes:
- npm/yarn/pnpm workspaces
- Turborepo
- Nx
- Lerna
- Go workspaces (`go.work`)
- Cargo workspaces

## Library Usage

Use dirgo programmatically in your Node.js/TypeScript projects:

```typescript
import { scan, buildContext, buildTree, buildDeps } from 'dirgo';

// Scan directory
const result = await scan({ dir: './my-project' });
console.log(result.projectInfo.type);        // 'node' | 'python' | 'go' | 'rust'
console.log(result.projectInfo.dependencies);
console.log(result.monorepo);                // workspace info if detected

// Build full LLM context
const context = await buildContext({ dir: '.' });
console.log(context.text);
console.log(`${context.tokens} tokens`);

// Build just the tree
const tree = await buildTree({ dir: '.' }, 'tree', false);
console.log(tree.text);

// Get dependencies
const deps = await buildDeps('.');
console.log(deps.text);
```

### Available Exports

```typescript
// Core functions
scan(options)           // Directory scan with project detection
buildContext(options)   // Full LLM context
buildTree(options)      // Just directory tree
buildDeps(dir)          // Just dependencies

// Utilities
estimateTokens(text)    // Estimate token count
formatTokens(count)     // Format as "~123 tokens"
detectProjectType(dir)  // Detect project type
parseProject(dir, type) // Parse project info
detectMonorepo(dir)     // Detect monorepo

// Formatters
formatTree(entries, emoji)  // ASCII tree
formatToon(entries)         // TOON notation
formatJson(result)          // JSON output
```

## MCP Integration

dirgo can run as an MCP (Model Context Protocol) server, allowing AI agents like Claude, Cursor, and others to query project information.

### Setup

Add to your MCP configuration:

**Claude Desktop** (`~/Library/Application Support/Claude/claude_desktop_config.json`):
```json
{
  "mcpServers": {
    "dirgo": {
      "command": "dirgo",
      "args": ["serve"]
    }
  }
}
```

**Cursor** (`.cursor/mcp.json`):
```json
{
  "mcpServers": {
    "dirgo": {
      "command": "dirgo",
      "args": ["serve"]
    }
  }
}
```

### Available MCP Tools

| Tool | Description |
|------|-------------|
| `dirgo_tree` | Get directory structure |
| `dirgo_context` | Get full LLM context with deps |
| `dirgo_deps` | Get project dependencies |

Each tool accepts:
- `dir` (string) - Target directory path
- `emoji` (boolean) - Include emojis
- `format` (string) - `tree`, `toon`, or `json`
- `depth` (number) - Max traversal depth

## Use Cases

### 1. Share Project Context with AI

```bash
dirgo context
# Paste into ChatGPT, Claude, etc.
```

### 2. Project Documentation

```bash
dirgo -e -o docs/structure.md
```

### 3. Quick Project Overview

```bash
dirgo context --depth 2
```

### 4. Focus on Specific Area

```bash
dirgo --focus src/api
```

### 5. CI/CD Integration

```bash
dirgo --format json --no-copy > structure.json
```

### 6. AI Agent Integration

```bash
# Run as MCP server
dirgo serve
```

## Token Counting

Every output shows the byte size and estimated token count:

```
[copied 1.2KB · ~312 tokens]
```

This helps you stay within LLM context limits.

## Ignored by Default

The following are excluded by default:
- `node_modules`, `.git`, `dist`, `build`
- `.next`, `.nuxt`, `.output`, `coverage`
- `__pycache__`, `.pytest_cache`, `.venv`, `venv`
- `target` (Rust), `.cache`, `.turbo`

Use `--include-all` to include everything.

## License

MIT
