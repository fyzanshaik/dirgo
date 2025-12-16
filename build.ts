import { $ } from "bun";

await $`rm -rf dist`;

const result = await Bun.build({
  entrypoints: ["./src/cli.ts", "./src/index.ts", "./src/mcp.ts"],
  outdir: "./dist",
  target: "node",
  format: "esm",
  minify: true,
  external: ["commander", "ignore", "clipboardy"],
});

if (!result.success) {
  console.error("Build failed:");
  for (const log of result.logs) {
    console.error(log);
  }
  process.exit(1);
}

await $`tsc --emitDeclarationOnly`;

console.log("Build complete!");

