# 🌳 dirgo - Smart Directory Trees for LLMs & Devs

A lightning-fast directory structure generator with LLM context support, code analysis, and dependency tracking.

## 🚀 Quick Start

```bash
# Install globally
npm install -g dirgo

# Or run directly
npx dirgo
```

## ✨ Features

### 📁 Quick Structure Generation

```bash
# Basic tree with emojis
dirgo

# Without emojis (new!)
dirgo -n

# Include file stats
dirgo -s

# Save to file
dirgo -o file -f project.txt
```

### 🤖 LLM Context Generation

Perfect for providing context to ChatGPT or other LLMs:

```bash
# Generate LLM-optimized context
dirgo --llm-context

# Without emojis (new!)
dirgo -n --llm-context

# With stats and clipboard copy
dirgo --llm-context -s -c

Output includes:
- Project type detection (Node.js, Python, Go)
- Directory structure
- Comprehensive dependency analysis
  - Direct and indirect Go dependencies
  - Python package requirements
  - Node.js dependencies
```

### 🎯 Smart Features

-  Go module analysis with direct/indirect dependencies
-  Python dependencies from requirements.txt and pyproject.toml
-  Node.js package.json analysis
-  File statistics and size information
-  Copy to clipboard support
-  Custom ignore patterns
-  Interactive mode

## 🛠️ Command Options

### Basic Commands

```bash
dirgo              # Basic tree with emojis
dirgo -n           # Without emojis
dirgo -s           # Include statistics
dirgo -d ./path    # Specific directory
dirgo -c           # Copy to clipboard
```

### LLM Context

```bash
dirgo --llm-context          # Full project context
dirgo --llm-context -s       # With file statistics
dirgo --llm-context -n -c    # No emojis, copy to clipboard
```

### Output Options

```bash
dirgo -o file                # Save to file
dirgo -o both                # Console & file
dirgo -f custom-name.txt     # Custom filename
```

### Customization

```bash
dirgo -n                     # No emojis (shorthand)
dirgo --no-emoji            # No emojis (long form)
dirgo --include-all         # Include node_modules
dirgo --ignore "dist,build" # Custom ignore patterns
```

## 🎨 Interactive Mode

Run with `-i` for an interactive menu:

```bash
dirgo -i

Provides options for:
✓ Quick structure generation
✓ LLM context generation
✓ Output customization
✓ File statistics
✓ Copy to clipboard
```

## 💡 Use Cases

### 1. LLM Context

```bash
dirgo --llm-context -c
# Perfect for:
- Sharing project context with ChatGPT
- Getting AI assistance
- Project documentation
```

### 2. Project Documentation

```bash
dirgo -s -o file -f docs.md
# Great for:
- Project overviews
- Documentation
- Team onboarding
```

### 3. Quick Analysis

```bash
dirgo -s
# Shows:
- File counts
- Directory sizes
- Project structure
```

### 4. Dependency Analysis

```bash
dirgo --llm-context
# Shows:
- Go dependencies (direct/indirect)
- Python package requirements
- Node.js dependencies
```

## 🌟 Why dirgo?

### For Developers

-  Quick project visualization
-  Easy documentation generation
-  Multiple output formats
-  Language-aware dependency analysis

### For LLM Users

-  Optimized context generation
-  Smart project analysis
-  Comprehensive dependency tracking
-  Code relationship mapping

### For Teams

-  Consistent project documentation
-  Easy project sharing
-  Quick project insights
-  Time-saving automation

## 📦 Installation

### Global Installation

```bash
npm install -g dirgo
```

### One-time Use

```bash
npx dirgo
```

## 📝 Version History

### v1.0.3 (Current Stable)

✅ **Recommended version for full functionality**

-  Fixed clipboard output formatting (no more ANSI color codes)
-  Added `-n` shorthand for `--no-emoji`
-  Enhanced Go dependency analysis (direct/indirect dependencies)
-  Fixed emoji display in LLM context
-  Memory optimization
-  Fixed project structure display

### v1.0.2

⚠️ Had following issues:

-  Clipboard copied ANSI color codes
-  Memory leaks in directory traversal
-  Emoji display issues in LLM context
-  Fixed recursive structure generation
-  Added better error handling

### v1.0.1

❌ Not recommended due to:

-  Node module resolution issues
-  Hidden files being generated
-  Memory issues with large directories
-  CLI execution problems
-  Dependency tracking bugs

### v1.0.0 (Initial Release)

❌ Initial test release with:

-  Basic directory structure generation
-  Simple dependency analysis
-  Known issues with module imports
-  Installation and execution problems

## 💡 Installation Guide

For the best experience, install version 1.0.3:

```bash
# Install specific version globally
npm install -g dirgo@1.0.3

# Or run with npx
npx dirgo@1.0.3
```

## 🤝 Contributing

Contributions welcome! Feel free to:

-  Open issues
-  Submit PRs
-  Suggest features
-  Improve documentation

## 📄 License

MIT - feel free to use in your projects!

## 🔗 Links

-  [GitHub Repository](https://github.com/fyzanshaik/dirgo)
-  [NPM Package](https://www.npmjs.com/package/dirgo)
-  [Issues](https://github.com/fyzanshaik/dirgo/issues)
