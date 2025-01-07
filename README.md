# ProjMap - Project Structure Generator for LLMs

## Overview

ProjMap is a powerful CLI tool that generates project structures optimized for LLM context. It goes beyond simple directory trees by providing code analysis, dependency tracking, and LLM-friendly
output formats.

## Quick Start

```bash
# Install globally
npm install -g projmap

# Or run directly with npx
npx projmap
```

## Core Features & Examples

### 1. Basic Structure Generation

```bash
# Generate basic tree
npx projmap

# With statistics
npx projmap --stats

# Output:
📁 my-project/ [15 files, 3 dirs, 1.24 MB]
├── 📁 src/ [10 files, 2 dirs, 856.32 KB]
│   ├── ⚛️ App.tsx [12.5 KB]
│   └── 🎨 styles.css [2.3 KB]
```

### 2. Code Analysis Mode

```bash
npx projmap --code-analysis

# Output example:
📁 src/
├── ⚛️ App.tsx
│   ├── Imports: 5
│   ├── Exports: 1
│   ├── Functions: 3
│   └── Lines: 120
└── 📁 components/
    └── Button.tsx
        ├── Imports: 2
        └── Functions: 1
```

### 3. Dependency Analysis

```bash
npx projmap --dependencies

# Shows:
Dependencies:
├── NPM Packages: 15
├── Main deps: react, express, typescript
└── Dev deps: jest, eslint
```

### 4. Documentation Mode

```bash
npx projmap --docs --format markdown

# Creates a markdown file with:
- Project structure
- Code summaries
- Import/export maps
- Dependency lists
```

## Advanced Use Cases

### 1. LLM Context Generation

```bash
# Generate complete context
npx projmap --stats --code-analysis --docs --format markdown --copy

# Perfect for pasting into ChatGPT:
- Full project structure
- Code analysis
- Dependencies
- Documentation
```

### 2. Project Documentation

```bash
# Generate documentation
npx projmap -o file -f project-docs.md --format markdown --docs

# Includes:
- Directory structure
- File summaries
- Code organization
- Tech stack details
```

### 3. Codebase Analysis

```bash
# Full analysis
npx projmap --stats --code-analysis --dependencies

# Shows:
- File counts and sizes
- Code complexity
- Import/export relationships
- Dependency graph
```

## Interactive Mode

```bash
npx projmap -i

# Provides interactive menu for:
1. Output format selection
2. Feature toggling
3. Custom configurations
4. Analysis options
```

## Common Options

-  `--stats`: Show file/directory statistics
-  `--emoji`: Enable/disable emoji indicators
-  `--copy`: Copy output to clipboard
-  `--format`: Choose output format (tree/markdown/json)
-  `--output`: Output destination (console/file/both)
-  `--code-analysis`: Include code analysis
-  `--dependencies`: Add dependency information
-  `--docs`: Include documentation

## Why Use ProjMap?

1. **LLM Optimization**

   -  Structured output for better context
   -  Code relationship analysis
   -  Comprehensive project overview

2. **Developer Friendly**

   -  Quick project insights
   -  Easy documentation generation
   -  Multiple output formats

3. **Time Saving**
   -  Automated analysis
   -  Clipboard integration
   -  Configurable output
