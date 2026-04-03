#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { initializeDatabase } from "./database.js";
import { createTools } from "./tools.js";
import fs from "fs";
import path from "path";
import os from "os";

const args = process.argv.slice(2);

if (args[0] === "init") {
  const configDir = path.join(os.homedir(), ".claude");
  const configPath = path.join(configDir, "claude_desktop_config.json");
  const dbPath = path.join(os.homedir(), ".claude-session.db");

  const config = {
    mcpServers: {
      "claude-session": {
        command: "node",
        args: [path.join(__dirname, "index.js")],
        env: {
          CLAUDE_SESSION_DB: dbPath,
        },
      },
    },
  };

  try {
    fs.mkdirSync(configDir, { recursive: true });
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
    console.log(`MCP config written to ${configPath}`);
    console.log(`Database path: ${dbPath}`);
    console.log("");
    console.log("Restart Claude Code to use the MCP server.");
    process.exit(0);
  } catch (err) {
    console.error("Failed to write config:", err instanceof Error ? err.message : err);
    process.exit(1);
  }
}

// Normal server mode
const db = initializeDatabase();
const { listToolsHandler, callToolHandler } = createTools(db);

const server = new Server(
  {
    name: "claude-session",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

server.setRequestHandler(ListToolsRequestSchema, listToolsHandler);
server.setRequestHandler(CallToolRequestSchema, callToolHandler);

const transport = new StdioServerTransport();
server.connect(transport).catch((err) => {
  console.error("Failed to connect:", err);
  process.exit(1);
});
