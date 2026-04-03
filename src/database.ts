import Database from "better-sqlite3";
import path from "path";
import os from "os";

export function getDatabasePath(): string {
  return path.join(os.homedir(), ".claude-session.db");
}

export function initializeDatabase(): Database.Database {
  const dbPath = getDatabasePath();
  const db = new Database(dbPath);
  return db;
}
