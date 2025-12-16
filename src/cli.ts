#!/usr/bin/env node

import { program } from "commander";
import { writeFile } from "node:fs/promises";
import { buildContext, buildTree, buildDeps } from "./core/context.js";
import { copyToClipboard, formatCopyStatus } from "./utils/clipboard.js";
import type { OutputFormat } from "./types.js";

async function handleOutput(
  text: string,
  bytes: number,
  tokens: number,
  options: { output?: string; copy: boolean }
): Promise<void> {
  if (options.output) {
    await writeFile(options.output, text);
    console.log(`Written to ${options.output}`);
  } else {
    console.log(text);
  }

  let copied = false;
  if (options.copy) {
    copied = await copyToClipboard(text);
  }

  console.log(formatCopyStatus(bytes, tokens, copied));
}

program
  .name("dirgo")
  .description("Fast directory structure generator with LLM context support")
  .version("2.0.0");

program
  .command("tree", { isDefault: true })
  .description("Generate directory tree")
  .option("-d, --dir <path>", "Target directory", ".")
  .option("-e, --emoji", "Enable emojis", false)
  .option("-o, --output <file>", "Write to file")
  .option("--no-copy", "Disable clipboard copy")
  .option("--format <type>", "Output format (tree, toon, json)", "tree")
  .option("--depth <n>", "Limit tree depth")
  .option("--focus <path>", "Only expand specific subtree")
  .option("--include-all", "Include normally excluded directories")
  .action(async (options) => {
    const result = await buildTree(
      {
        dir: options.dir,
        depth: options.depth ? parseInt(options.depth, 10) : undefined,
        focus: options.focus,
        includeAll: options.includeAll,
      },
      options.format as OutputFormat,
      options.emoji
    );

    await handleOutput(result.text, result.bytes, result.tokens, {
      output: options.output,
      copy: options.copy,
    });
  });

program
  .command("context")
  .description("Generate full LLM context")
  .option("-d, --dir <path>", "Target directory", ".")
  .option("-e, --emoji", "Enable emojis", false)
  .option("-o, --output <file>", "Write to file")
  .option("--no-copy", "Disable clipboard copy")
  .option("--format <type>", "Output format (tree, toon, json)", "tree")
  .option("--depth <n>", "Limit tree depth")
  .option("--focus <path>", "Only expand specific subtree")
  .option("--include-all", "Include normally excluded directories")
  .action(async (options) => {
    const result = await buildContext(
      {
        dir: options.dir,
        depth: options.depth ? parseInt(options.depth, 10) : undefined,
        focus: options.focus,
        includeAll: options.includeAll,
      },
      options.format as OutputFormat,
      options.emoji
    );

    await handleOutput(result.text, result.bytes, result.tokens, {
      output: options.output,
      copy: options.copy,
    });
  });

program
  .command("deps")
  .description("Show project dependencies")
  .option("-d, --dir <path>", "Target directory", ".")
  .option("-o, --output <file>", "Write to file")
  .option("--no-copy", "Disable clipboard copy")
  .action(async (options) => {
    const result = await buildDeps(options.dir);

    await handleOutput(result.text, result.bytes, result.tokens, {
      output: options.output,
      copy: options.copy,
    });
  });

program
  .command("serve")
  .description("Start MCP server")
  .action(async () => {
    const { startServer } = await import("./mcp.js");
    await startServer();
  });

program.parse();


