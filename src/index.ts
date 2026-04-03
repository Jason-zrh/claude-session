#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { initializeDatabase } from "./database.js";
import { createTools } from "./tools.js";

const db = initializeDatabase();

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

const { listToolsHandler, callToolHandler } = createTools(db);

server.setRequestHandler(ListToolsRequestSchema, listToolsHandler);

server.setRequestHandler(CallToolRequestSchema, callToolHandler);

const transport = new StdioServerTransport();
server.connect(transport).catch((err) => {
  console.error("Failed to connect:", err);
  process.exit(1);
});
