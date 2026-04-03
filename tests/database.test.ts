import { initializeDatabase, getOrCreateProject, listProjects, createSession, addMessage, getProjectMessages, endSession, getActiveSession, getDatabasePath } from "../src/database";
import Database from "better-sqlite3";
import path from "path";
import os from "os";
import { unlink } from "fs/promises";

const TEST_DB = path.join(os.tmpdir(), "claude-session-test.db");

async function cleanup() {
  try {
    await unlink(TEST_DB);
  } catch {
    // ignore
  }
}

describe("Database operations", () => {
  let db: Database.Database;

  beforeEach(() => {
    db = new Database(TEST_DB);
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
    `);
  });

  afterEach(async () => {
    db.close();
    await cleanup();
  });

  test("getOrCreateProject creates new project", () => {
    const project = getOrCreateProject(db, "test-project");
    expect(project.name).toBe("test-project");
    expect(project.id).toBeGreaterThan(0);
  });

  test("getOrCreateProject returns existing project", () => {
    const project1 = getOrCreateProject(db, "test-project");
    const project2 = getOrCreateProject(db, "test-project");
    expect(project1.id).toBe(project2.id);
  });

  test("listProjects returns all projects", () => {
    getOrCreateProject(db, "project-1");
    getOrCreateProject(db, "project-2");
    const projects = listProjects(db);
    expect(projects).toHaveLength(2);
  });

  test("createSession and addMessage work", () => {
    const project = getOrCreateProject(db, "test-project");
    const session = createSession(db, project.id, "uuid-123");
    expect(session.project_id).toBe(project.id);
    expect(session.session_uuid).toBe("uuid-123");

    addMessage(db, session.id, "user", "Hello");
    addMessage(db, session.id, "assistant", "Hi there");

    const messages = getProjectMessages(db, project.id);
    expect(messages).toHaveLength(2);
    expect(messages[0].role).toBe("user");
    expect(messages[1].role).toBe("assistant");
  });

  test("endSession marks session as ended", () => {
    const project = getOrCreateProject(db, "test-project");
    const session = createSession(db, project.id, "uuid-123");
    endSession(db, session.id);

    const active = getActiveSession(db, project.id);
    expect(active).toBeUndefined();
  });

  test("getActiveSession returns ongoing session", () => {
    const project = getOrCreateProject(db, "test-project");
    const session = createSession(db, project.id, "uuid-123");

    const active = getActiveSession(db, project.id);
    expect(active?.id).toBe(session.id);
  });
});