# dirgo

Fast directory structure generator with LLM context support. Built for developers and AI agents.

Supports Node.js/TypeScript, Python, Go, and Rust projects with intelligent monorepo detection.

## Installation

```bash
npm install -g dirgo
```
For bun:
```bash
bun install -g dirgo
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
dirgo serve              # Start MCP server for AI agents
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

-  Project type detection (node, python, go, rust)
-  Directory structure
-  Dependencies (regular, dev, indirect)
-  tsconfig.json paths and settings
-  Monorepo workspace packages

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
dirgo deps --help       # Dependencies command help
dirgo serve --help      # MCP server help
```

## Options

| Option                | Description                           | Default   |
| --------------------- | ------------------------------------- | --------- |
| `-d, --dir <path>`    | Target directory                      | `.`       |
| `-e, --emoji`         | Enable emojis in output               | `false`   |
| `-o, --output <file>` | Write to file instead of stdout       | -         |
| `--no-copy`           | Disable clipboard copy                | `false`   |
| `--format <type>`     | Output format: `tree`, `toon`, `json` | `tree`    |
| `--depth <n>`         | Limit tree depth                      | unlimited |
| `--focus <path>`      | Only expand specific subtree          | -         |
| `--include-all`       | Include node_modules, .git, etc.      | `false`   |

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

| Language               | Files Parsed                                    | What's Extracted                       |
| ---------------------- | ----------------------------------------------- | -------------------------------------- |
| **Node.js/TypeScript** | `package.json`, `tsconfig.json`                 | deps, devDeps, paths, compiler options |
| **Python**             | `pyproject.toml`, `requirements.txt`, `Pipfile` | deps, python version, build system     |
| **Go**                 | `go.mod`, `go.work`                             | deps (direct/indirect), go version     |
| **Rust**               | `Cargo.toml`                                    | deps, edition, workspace members       |

## Monorepo Detection

Automatically detects and analyzes:

-  npm/yarn/pnpm workspaces
-  Turborepo
-  Nx
-  Lerna
-  Go workspaces (`go.work`)
-  Cargo workspaces

## Library Usage

Use dirgo programmatically in your Node.js/TypeScript projects:

```typescript
import { 
  scan, 
  buildContext, 
  buildTree, 
  buildDeps,
  detectProjectType,
  detectMonorepo,
  estimateTokens,
  formatTree,
  formatToon,
  formatJson
} from 'dirgo';

// Scan directory
const result = await scan({ 
  dir: './my-project',
  depth: 3,
  focus: 'src',
  includeAll: false 
});
console.log(result.projectInfo.type); // 'node' | 'python' | 'go' | 'rust'
console.log(result.projectInfo.dependencies);
console.log(result.monorepo); // workspace info if detected

// Build full LLM context
const context = await buildContext({ 
  dir: '.',
  depth: 2,
  focus: 'src/components'
}, 'toon', true); // format, emoji
console.log(context.text);
console.log(`${context.tokens} tokens`);

// Build just the tree
const tree = await buildTree({ 
  dir: '.',
  depth: 3 
}, 'tree', false); // format, emoji
console.log(tree.text);

// Get dependencies
const deps = await buildDeps('.');
console.log(deps.text);

// Advanced usage
const projectType = await detectProjectType('./my-project');
const monorepo = await detectMonorepo('./my-monorepo');
const tokens = estimateTokens('some text content');
```

### Available Exports

```typescript
// Core functions
scan(options); // Directory scan with project detection
buildContext(options, format, emoji); // Full LLM context
buildTree(options, format, emoji); // Just directory tree
buildDeps(dir); // Just dependencies

// Detection utilities
detectProjectType(dir); // Detect project type
parseProject(dir, type); // Parse project info
detectMonorepo(dir); // Detect monorepo

// Token utilities
estimateTokens(text); // Estimate token count
formatTokens(count); // Format as "~123 tokens"

// Formatters
formatTree(entries, emoji); // ASCII tree
formatToon(entries); // TOON notation
formatJson(result); // JSON output

// Types
import type { 
  ProjectType, 
  ProjectInfo, 
  ScanResult, 
  ScanOptions,
  ContextOptions,
  OutputFormat,
  MonorepoInfo,
  Dependency,
  FileEntry
} from 'dirgo';
```

### Programmatic Examples

```typescript
// Custom analysis script
async function analyzeProject(dir: string) {
  const result = await scan({ dir });
  
  console.log(`Project Type: ${result.projectInfo.type}`);
  
  if (result.monorepo) {
    console.log(`Monorepo: ${result.monorepo.type}`);
    console.log(`Packages: ${result.monorepo.packages.length}`);
  }
  
  const context = await buildContext({ dir }, 'toon', false);
  console.log(`Context: ${context.tokens} tokens`);
  
  return {
    type: result.projectInfo.type,
    hasMonorepo: !!result.monorepo,
    tokenCount: context.tokens,
    dependencies: result.projectInfo.dependencies.length
  };
}

// Generate custom reports
async function generateReport(dir: string) {
  const [tree, deps, context] = await Promise.all([
    buildTree({ dir }, 'json', false),
    buildDeps(dir),
    buildContext({ dir }, 'toon', true)
  ]);
  
  return {
    structure: JSON.parse(tree.text),
    dependencies: deps.text,
    fullContext: context.text,
    metadata: {
      structureTokens: tree.tokens,
      dependenciesTokens: deps.tokens,
      contextTokens: context.tokens
    }
  };
}
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

**Continue.dev** (`~/.continue/config.json`):

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

| Tool            | Description                    |
| --------------- | ------------------------------ |
| `dirgo_tree`    | Get directory structure        |
| `dirgo_context` | Get full LLM context with deps |
| `dirgo_deps`    | Get project dependencies       |

### MCP Tool Parameters

Each tool accepts:

-  `dir` (string) - Target directory path (default: ".")
-  `emoji` (boolean) - Include emojis in output
-  `format` (string) - `tree`, `toon`, or `json` (default: "tree")
-  `depth` (number) - Max traversal depth

### MCP Usage Examples

```json
// Get directory structure with toon format
{
  "tool": "dirgo_tree",
  "arguments": {
    "dir": "./src",
    "format": "toon",
    "depth": 3
  }
}

// Get full context for AI analysis
{
  "tool": "dirgo_context", 
  "arguments": {
    "dir": ".",
    "format": "toon",
    "emoji": true
  }
}

// Get dependencies for security analysis
{
  "tool": "dirgo_deps",
  "arguments": {
    "dir": "."
  }
}
```

### MCP Integration Benefits

- **Real-time Analysis**: AI agents can query current project state
- **Context-aware Responses**: Tools provide structured project information
- **Multi-format Support**: Choose optimal format for each use case
- **Token Efficiency**: TOON format minimizes token usage
- **Language Detection**: Automatic project type identification

## Use Cases

### 1. Share Project Context with AI

```bash
dirgo context
# Paste into ChatGPT, Claude, etc.

# Or use toon format for better LLM parsing
dirgo context --format toon

# Include emojis for visual clarity
dirgo context -e
```

### 2. Project Documentation

```bash
# Generate documentation with emojis
dirgo -e -o docs/structure.md

# Create focused documentation
dirgo --focus src --format toon -o docs/src-structure.md

# Document dependencies
dirgo deps -o docs/dependencies.md
```

### 3. Quick Project Overview

```bash
# Basic overview
dirgo context --depth 2

# Compact overview with toon format
dirgo --format toon --depth 3

# Overview with specific focus
dirgo context --focus src/components --depth 2
```

### 4. Focus on Specific Area

```bash
# Focus on API directory
dirgo --focus src/api

# Focus with depth limit and toon format
dirgo --focus src/components --format toon --depth 3

# Context for specific area
dirgo context --focus lib/utils --depth 2
```

### 5. CI/CD Integration

```bash
# Generate JSON for automated processing
dirgo --format json --no-copy > structure.json

# Generate context for build scripts
dirgo context --format json --no-copy > project-context.json

# Dependencies for security scanning
dirgo deps --format json > dependencies.json
```

### 6. AI Agent Integration

```bash
# Run as MCP server for Claude, Cursor, etc.
dirgo serve

# Available MCP tools:
# - dirgo_tree: Get directory structure
# - dirgo_context: Get full LLM context
# - dirgo_deps: Get project dependencies
```

### 7. Development Workflows

```bash
# Before code review - share context
dirgo context --format toon | pbcopy

# Debug project structure issues
dirgo --include-all --depth 2

# Compare project structures
dirgo --format json > current-structure.json

# Monitor dependency changes
dirgo deps --format json > current-deps.json
```

### 8. Monorepo Management

```bash
# Get workspace overview
dirgo context --depth 2

# Focus on specific package
dirgo --focus packages/frontend

# Analyze all packages
dirgo context --format json --no-copy > monorepo-analysis.json
```

### 9. Language-Specific Analysis

```bash
# Node.js/TypeScript projects
dirgo context  # Shows package.json, tsconfig.json, paths

# Python projects  
dirgo context  # Shows pyproject.toml, requirements, build system

# Go projects
dirgo context  # Shows go.mod, go.work, go version

# Rust projects
dirgo context  # Shows Cargo.toml, edition, workspace members
```

### 10. Performance Optimization

```bash
# Quick scan with depth limit
dirgo --depth 3 --format toon

# Minimal output for large projects
dirgo --format toon --no-copy

# Exclude clipboard operations for scripts
dirgo context --no-copy --format json
```

## Token Counting

Every output shows the byte size and estimated token count:

```
[copied 1.2KB · ~312 tokens]
```

This helps you stay within LLM context limits.

### Token Optimization Tips

```bash
# Use toon format for minimal tokens
dirgo --format toon

# Limit depth to reduce tokens
dirgo --depth 2

# Focus on specific areas
dirgo --focus src

# Compare token usage
dirgo --format tree     # More tokens
dirgo --format toon     # Fewer tokens
dirgo --format json     # Variable tokens
```

## Ignored by Default

The following are excluded by default:

-  `node_modules`, `.git`, `dist`, `build`
-  `.next`, `.nuxt`, `.output`, `coverage`
-  `__pycache__`, `.pytest_cache`, `.venv`, `venv`
-  `target` (Rust), `.cache`, `.turbo`

Use `--include-all` to include everything.

### Filtering Examples

```bash
# Include everything (use with caution)
dirgo --include-all

# Focus on specific directory, ignoring others
dirgo --focus src

# Combine with depth for large projects
dirgo --include-all --depth 2
```

## Complete Command Reference

### Global Options

These options work with all commands:

| Option | Description | Example |
|--------|-------------|---------|
| `-d, --dir <path>` | Target directory | `dirgo -d ./my-project` |
| `-e, --emoji` | Enable emojis | `dirgo -e` |
| `-o, --output <file>` | Write to file | `dirgo -o structure.txt` |
| `--no-copy` | Disable clipboard copy | `dirgo --no-copy` |
| `--format <type>` | Output format | `dirgo --format toon` |
| `--depth <n>` | Limit tree depth | `dirgo --depth 3` |
| `--focus <path>` | Focus on subtree | `dirgo --focus src` |
| `--include-all` | Include excluded dirs | `dirgo --include-all` |

### Command Matrix

| Command | Purpose | Default Format | Common Options |
|---------|---------|----------------|----------------|
| `dirgo` | Directory tree | tree | `--format`, `--depth`, `--focus` |
| `dirgo tree` | Directory tree | tree | `--format`, `--depth`, `--focus` |
| `dirgo context` | Full LLM context | tree | `--format`, `--depth`, `--focus` |
| `dirgo deps` | Dependencies only | text | `-d`, `-o`, `--no-copy` |
| `dirgo serve` | MCP server | - | - |

### Practical Command Combinations

```bash
# Quick overview (most common)
dirgo

# Compact LLM-friendly output
dirgo --format toon

# Full context for AI
dirgo context --format toon -e

# Project documentation
dirgo -e -o docs/structure.md

# Large project analysis
dirgo --depth 2 --format toon

# Specific component analysis
dirgo --focus src/components --depth 3

# Dependencies for security audit
dirgo deps --format json -o deps.json

# CI/CD integration
dirgo context --format json --no-copy

# Monorepo package focus
dirgo --focus packages/frontend

# Performance analysis
dirgo --include-all --depth 1

# Token-optimized output
dirgo --format toon --depth 2 --no-copy
```

## Advanced Usage Patterns

### Pipeline Integration

```bash
# Chain with other tools
dirgo --format json | jq '.structure | length'
dirgo --format toon | wc -l
dirgo deps | grep "react"

# Use in scripts
PROJECT_TYPE=$(dirgo --format json | jq -r '.project.type')
TOKEN_COUNT=$(dirgo context --format toon | grep -o '~[0-9]* tokens')
```

### Automation Examples

```bash
# Pre-commit hook
#!/bin/bash
echo "Project structure:"
dirgo --format toon --depth 2

echo "Dependencies:"
dirgo deps

# Daily project report
dirgo context -e -o "reports/$(date +%Y-%m-%d).md"

# Security scan
dirgo deps --format json > security/deps.json
npx audit-ci --moderate
```

### Development Workflows

```bash
# Before starting work
dirgo context --format toon | pbcopy

# Code review preparation
dirgo --focus src --format toon -o review-structure.md

# Debugging project issues
dirgo --include-all --depth 2 | grep -E "(error|fail|missing)"

# Performance monitoring
dirgo --format json | jq '.meta.tokens'
```

## License

MIT
