import { Tool, CallToolRequest } from "@modelcontextprotocol/sdk/types.js";
import Database from "better-sqlite3";

export function listTools(_db: Database.Database): Tool[] {
  return [];
}

export function callTool(
  _db: Database.Database,
  _request: CallToolRequest
): { content: { type: "text"; text: string }[] } {
  return { content: [{ type: "text", text: "Not implemented" }] };
}
