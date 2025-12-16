import { createInterface } from "node:readline";
import { buildContext, buildTree, buildDeps } from "./core/context.js";
import type { MCPRequest, MCPResponse, MCPTool } from "./types.js";

const TOOLS: MCPTool[] = [
  {
    name: "dirgo_tree",
    description: "Get directory tree structure of a project",
    inputSchema: {
      type: "object",
      properties: {
        dir: {
          type: "string",
          description: "Target directory path",
        },
        emoji: {
          type: "boolean",
          description: "Include emojis in output",
        },
        format: {
          type: "string",
          enum: ["tree", "toon", "json"],
          description: "Output format",
        },
        depth: {
          type: "number",
          description: "Maximum depth to traverse",
        },
      },
    },
  },
  {
    name: "dirgo_context",
    description: "Get full LLM context including structure, dependencies, and config",
    inputSchema: {
      type: "object",
      properties: {
        dir: {
          type: "string",
          description: "Target directory path",
        },
        emoji: {
          type: "boolean",
          description: "Include emojis in output",
        },
        format: {
          type: "string",
          enum: ["tree", "toon", "json"],
          description: "Output format",
        },
        depth: {
          type: "number",
          description: "Maximum depth to traverse",
        },
      },
    },
  },
  {
    name: "dirgo_deps",
    description: "Get project dependencies",
    inputSchema: {
      type: "object",
      properties: {
        dir: {
          type: "string",
          description: "Target directory path",
        },
      },
    },
  },
];

function createResponse(id: number | string, result: unknown): MCPResponse {
  return {
    jsonrpc: "2.0",
    id,
    result,
  };
}

function createError(
  id: number | string,
  code: number,
  message: string
): MCPResponse {
  return {
    jsonrpc: "2.0",
    id,
    error: { code, message },
  };
}

async function handleRequest(request: MCPRequest): Promise<MCPResponse> {
  const { id, method, params } = request;

  switch (method) {
    case "initialize":
      return createResponse(id, {
        protocolVersion: "2024-11-05",
        capabilities: {
          tools: {},
        },
        serverInfo: {
          name: "dirgo",
          version: "2.0.0",
        },
      });

    case "tools/list":
      return createResponse(id, { tools: TOOLS });

    case "tools/call": {
      const toolName = params?.name as string;
      const args = (params?.arguments || {}) as Record<string, unknown>;

      try {
        let result: { text: string; bytes: number; tokens: number };

        switch (toolName) {
          case "dirgo_tree":
            result = await buildTree(
              {
                dir: (args.dir as string) || ".",
                depth: args.depth as number | undefined,
              },
              (args.format as "tree" | "toon" | "json") || "tree",
              (args.emoji as boolean) || false
            );
            break;

          case "dirgo_context":
            result = await buildContext(
              {
                dir: (args.dir as string) || ".",
                depth: args.depth as number | undefined,
              },
              (args.format as "tree" | "toon" | "json") || "tree",
              (args.emoji as boolean) || false
            );
            break;

          case "dirgo_deps":
            result = await buildDeps((args.dir as string) || ".");
            break;

          default:
            return createError(id, -32601, `Unknown tool: ${toolName}`);
        }

        return createResponse(id, {
          content: [
            {
              type: "text",
              text: result.text + `\n\n[${result.bytes}B · ~${result.tokens} tokens]`,
            },
          ],
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";
        return createError(id, -32603, message);
      }
    }

    case "notifications/initialized":
      return createResponse(id, {});

    default:
      return createError(id, -32601, `Method not found: ${method}`);
  }
}

export async function startServer(): Promise<void> {
  const rl = createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: false,
  });

  for await (const line of rl) {
    if (!line.trim()) continue;

    try {
      const request = JSON.parse(line) as MCPRequest;
      const response = await handleRequest(request);
      console.log(JSON.stringify(response));
    } catch (error) {
      const errorResponse: MCPResponse = {
        jsonrpc: "2.0",
        id: 0,
        error: {
          code: -32700,
          message: "Parse error",
        },
      };
      console.log(JSON.stringify(errorResponse));
    }
  }
}

