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
📁 my-project/
├── 📁 src/
│   ├── ⚛️ App.tsx
│   └── 🎨 styles.css
└── 📦 package.json

# Include file stats
dirgo --stats

# Save to file
dirgo -o file -f project.txt
```

### 🤖 LLM Context Generation

Perfect for providing context to ChatGPT or other LLMs:

```bash
# Generate LLM-optimized context
dirgo --llm-context

# Output includes:
- Project type detection
- Directory structure
- Dependencies analysis
- Key file summaries
```

### 🎯 Smart Features

-  Automatic project type detection (Node.js, Python, Go)
-  Dependency analysis
-  File statistics and size information
-  Copy to clipboard support
-  Custom ignore patterns
-  Interactive mode

## 🛠️ Command Options

### Basic Commands

```bash
dirgo                           # Basic tree
dirgo --stats                   # Include statistics
dirgo -d ./my-project          # Specific directory
dirgo --copy                   # Copy to clipboard
```

### LLM Context

```bash
dirgo --llm-context            # Full project context
dirgo --llm-context --stats    # With file statistics
dirgo --llm-context --copy     # Copy to clipboard
```

### Output Options

```bash
dirgo -o file                  # Save to file
dirgo -o both                  # Console & file
dirgo -f custom-name.txt       # Custom filename
```

### Customization

```bash
dirgo --no-emoji               # Disable emojis
dirgo --include-all            # Include node_modules
dirgo --ignore "dist,build"    # Custom ignore
```

## 🎨 Interactive Mode

Run with `-i` for an interactive menu:

```bash
dirgo -i

# Provides options for:
✓ Quick structure generation
✓ LLM context generation
✓ Output customization
✓ File statistics
✓ Copy to clipboard
```

## 💡 Use Cases

### 1. LLM Context

```bash
dirgo --llm-context --copy
# Perfect for:
- Sharing project context with ChatGPT
- Getting AI assistance
- Project documentation
```

### 2. Project Documentation

```bash
dirgo --stats -o file -f docs.md
# Great for:
- Project overviews
- Documentation
- Team onboarding
```

### 3. Quick Analysis

```bash
dirgo --stats
# Shows:
- File counts
- Directory sizes
- Project structure
```

## 🌟 Why dirgo?

### For Developers

-  Quick project visualization
-  Easy documentation generation
-  Multiple output formats
-  Configurable and extensible

### For LLM Users

-  Optimized context generation
-  Smart project analysis
-  Dependency tracking
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
