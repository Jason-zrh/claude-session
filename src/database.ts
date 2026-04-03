import Database from "better-sqlite3";
import path from "path";
import os from "os";

export interface Project {
  id: number;
  name: string;
  created_at: number;
  updated_at: number;
}

export interface Session {
  id: number;
  project_id: number;
  session_uuid: string;
  started_at: number;
  ended_at: number | null;
}

export interface Message {
  id: number;
  session_id: number;
  role: "user" | "assistant" | "system";
  content: string;
  tools: string | null;
  collapsed: number;
  created_at: number;
}

export function getDatabasePath(): string {
  return path.join(os.homedir(), ".claude-session.db");
}

export function initializeDatabase(): Database.Database {
  const dbPath = getDatabasePath();
  const db = new Database(dbPath);

  db.exec(`
    CREATE TABLE IF NOT EXISTS projects (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id INTEGER NOT NULL,
      session_uuid TEXT NOT NULL,
      started_at INTEGER NOT NULL,
      ended_at INTEGER,
      FOREIGN KEY (project_id) REFERENCES projects(id)
    );

    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id INTEGER NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('user', 'assistant', 'system')),
      content TEXT NOT NULL,
      tools TEXT,
      collapsed INTEGER DEFAULT 0,
      created_at INTEGER NOT NULL,
      FOREIGN KEY (session_id) REFERENCES sessions(id)
    );

    CREATE INDEX IF NOT EXISTS idx_messages_session_id ON messages(session_id);
    CREATE INDEX IF NOT EXISTS idx_sessions_project_id ON sessions(project_id);
  `);

  db.pragma("foreign_keys = ON");

  return db;
}

// Project operations
export function getOrCreateProject(db: Database.Database, name: string): Project {
  const existing = db.prepare("SELECT * FROM projects WHERE name = ?").get(name) as Project | undefined;
  if (existing) {
    db.prepare("UPDATE projects SET updated_at = ? WHERE id = ?").run(Date.now(), existing.id);
    return existing;
  }
  const now = Date.now();
  const result = db.prepare("INSERT INTO projects (name, created_at, updated_at) VALUES (?, ?, ?)").run(name, now, now);
  return { id: result.lastInsertRowid as number, name, created_at: now, updated_at: now };
}

export function listProjects(db: Database.Database): Project[] {
  return db.prepare("SELECT * FROM projects ORDER BY updated_at DESC").all() as Project[];
}

export function getProjectByName(db: Database.Database, name: string): Project | undefined {
  return db.prepare("SELECT * FROM projects WHERE name = ?").get(name) as Project | undefined;
}

// Session operations
export function createSession(db: Database.Database, projectId: number, sessionUuid: string): Session {
  const now = Date.now();
  const result = db.prepare("INSERT INTO sessions (project_id, session_uuid, started_at) VALUES (?, ?, ?)").run(projectId, sessionUuid, now);
  return { id: result.lastInsertRowid as number, project_id: projectId, session_uuid: sessionUuid, started_at: now, ended_at: null };
}

export function endSession(db: Database.Database, sessionId: number): void {
  db.prepare("UPDATE sessions SET ended_at = ? WHERE id = ?").run(Date.now(), sessionId);
}

export function getActiveSession(db: Database.Database, projectId: number): Session | undefined {
  return db.prepare("SELECT * FROM sessions WHERE project_id = ? AND ended_at IS NULL ORDER BY started_at DESC LIMIT 1").get(projectId) as Session | undefined;
}

// Message operations
export function addMessage(
  db: Database.Database,
  sessionId: number,
  role: "user" | "assistant" | "system",
  content: string,
  tools?: string,
  collapsed: boolean = true
): Message {
  const now = Date.now();
  const result = db.prepare("INSERT INTO messages (session_id, role, content, tools, collapsed, created_at) VALUES (?, ?, ?, ?, ?, ?)").run(sessionId, role, content, tools ?? null, collapsed ? 1 : 0, now);
  return { id: result.lastInsertRowid as number, session_id: sessionId, role, content, tools: tools ?? null, collapsed: collapsed ? 1 : 0, created_at: now };
}

export function getProjectMessages(db: Database.Database, projectId: number): Message[] {
  return db.prepare(`
    SELECT m.* FROM messages m
    JOIN sessions s ON m.session_id = s.id
    WHERE s.project_id = ?
    ORDER BY m.created_at ASC
  `).all(projectId) as Message[];
}

function escapeLikePattern(str: string): string {
  return str.replace(/[%_\\]/g, '\\$&');
}

export function searchProjectMessages(db: Database.Database, projectId: number, query: string): Message[] {
  return db.prepare(`
    SELECT m.* FROM messages m
    JOIN sessions s ON m.session_id = s.id
    WHERE s.project_id = ? AND m.content LIKE ?
    ORDER BY m.created_at ASC
  `).all(projectId, `%${escapeLikePattern(query)}%`) as Message[];
}