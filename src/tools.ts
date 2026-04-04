import { ListToolsRequestSchema, CallToolRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import Database from "better-sqlite3";
import {
  getOrCreateProject,
  listProjects,
  getProjectByName,
  deleteProject,
  createSession,
  getActiveSession,
  addMessage,
  getProjectMessages,
  searchProjectMessages,
  type Project,
  type Session,
} from "./database.js";

export function restoreServerState(db: Database.Database): Partial<ServerState> {
  // 查找最后一个活动会话
  const lastSession = db.prepare(`
    SELECT s.*, p.name as project_name, p.created_at as project_created_at, p.updated_at as project_updated_at
    FROM sessions s
    JOIN projects p ON s.project_id = p.id
    WHERE s.ended_at IS NULL
    ORDER BY s.started_at DESC
    LIMIT 1
  `).get() as (Session & { project_name: string; project_created_at: number; project_updated_at: number }) | undefined;

  if (lastSession) {
    const project: Project = {
      id: lastSession.project_id,
      name: lastSession.project_name,
      created_at: lastSession.project_created_at,
      updated_at: lastSession.project_updated_at,
    };
    return {
      currentProject: project,
      currentSession: lastSession,
      isRecording: true,
    };
  }
  return {};
}

interface ToolCallParams {
  name: string;
  arguments?: Record<string, unknown>;
}

interface PendingMessage {
  role: "user" | "assistant" | "system";
  content: string;
  tools: string | null;
  created_at: number;
}

interface ServerState {
  currentProject: Project | null;
  currentSession: Session | null;
  isRecording: boolean;
  saveMode: "auto" | "manual";
  pendingMessages: PendingMessage[];
}

export function createTools(db: Database.Database) {
  const serverState: ServerState = {
    currentProject: null,
    currentSession: null,
    isRecording: false,
    saveMode: "auto",
    pendingMessages: [],
  };

  const listToolsHandler = async () => {
    return {
      tools: [
        {
          name: "use_project",
          description: "Create or switch to a project. Loads all previous conversation history and begins recording.",
          inputSchema: {
            type: "object",
            properties: {
              name: { type: "string", description: "Project name" },
              save_mode: {
                type: "string",
                enum: ["auto", "manual"],
                description: "Save mode: 'auto' saves after each message, 'manual' requires explicit save_message calls"
              },
            },
            required: ["name"],
          },
        },
        {
          name: "list_projects",
          description: "List all projects with their last activity time",
          inputSchema: { type: "object", properties: {} },
        },
        {
          name: "current_project",
          description: "Show the currently active project",
          inputSchema: { type: "object", properties: {} },
        },
        {
          name: "search_project",
          description: "Search within the current project's messages",
          inputSchema: {
            type: "object",
            properties: {
              query: { type: "string", description: "Search query" },
            },
            required: ["query"],
          },
        },
        {
          name: "end_project",
          description: "End the current project and stop recording",
          inputSchema: { type: "object", properties: {} },
        },
        {
          name: "delete_project",
          description: "Delete a project and all its data (requires project name confirmation)",
          inputSchema: {
            type: "object",
            properties: {
              name: { type: "string", description: "Project name to delete" },
            },
            required: ["name"],
          },
        },
        {
          name: "record_message",
          description: "Record a message to the current project. In manual save mode, messages are buffered until save_message is called.",
          inputSchema: {
            type: "object",
            properties: {
              role: { type: "string", enum: ["user", "assistant", "system"] },
              content: { type: "string" },
              tools: { type: "string", description: "JSON string of tool calls if any" },
            },
            required: ["role", "content"],
          },
        },
        {
          name: "auto_record",
          description: "Auto-save a conversation turn (both user message and assistant response). Call this after each exchange to persist the full conversation. Returns the number of messages saved.",
          inputSchema: {
            type: "object",
            properties: {
              user_message: { type: "string", description: "The user's message" },
              assistant_message: { type: "string", description: "The assistant's response" },
            },
            required: ["user_message", "assistant_message"],
          },
        },
        {
          name: "project_save",
          description: "Save current project. MUST be called when user says: '保存项目', '保存对话', '保存当前项目', 'save project', 'save conversation', or similar phrases. The summary parameter should contain the user's message content or an auto-generated summary of the conversation.",
          inputSchema: {
            type: "object",
            properties: {
              summary: { type: "string", description: "The content to save - can be the user's request or an auto-generated summary" },
            },
            required: ["summary"],
          },
        },
        {
          name: "save_message",
          description: "Flush all pending messages to the database (used in manual save mode)",
          inputSchema: { type: "object", properties: {} },
        },
      ],
    };
  };

  const callToolHandler = async (request: { params: ToolCallParams }) => {
    const toolName = request.params.name;
    const input = (request.params.arguments || {}) as Record<string, unknown>;

    switch (toolName) {
      case "use_project": {
        const name = (input.name as string)?.trim();
        if (!name) {
          return {
            content: [{ type: "text", text: JSON.stringify({ error: "Project name is required" }) }],
          };
        }
        const saveMode = (input.save_mode as "auto" | "manual") || "auto";

        try {
          const project = getOrCreateProject(db, name);

          // 检查是否已有该项目的活动会话
          const existingSession = getActiveSession(db, project.id);
          if (existingSession) {
            // 恢复现有会话
            serverState.currentProject = project;
            serverState.currentSession = existingSession;
            serverState.isRecording = true;
            serverState.saveMode = saveMode;
            serverState.pendingMessages = [];

            const messages = getProjectMessages(db, project.id);

            return {
              content: [
                {
                  type: "text",
                  text: JSON.stringify({
                    success: true,
                    project: { name: project.name, id: project.id },
                    session_id: existingSession.id,
                    is_new_project: false,
                    previous_messages_count: messages.length,
                    save_mode: saveMode,
                    messages: messages.map((m) => ({
                      role: m.role,
                      content: m.content,
                      created_at: m.created_at,
                    })),
                    save_instruction: "要保存对话，请对 Claude 说：保存当前对话",
                  }),
                },
              ],
            };
          }

          // 没有现有会话，创建新的
          const sessionUuid = crypto.randomUUID();
          const session = createSession(db, project.id, sessionUuid);

          serverState.currentProject = project;
          serverState.currentSession = session;
          serverState.isRecording = true;
          serverState.saveMode = saveMode;
          serverState.pendingMessages = [];

          const messages = getProjectMessages(db, project.id);

          return {
            content: [
              {
                type: "text",
                text: JSON.stringify({
                  success: true,
                  project: { name: project.name, id: project.id },
                  session_id: session.id,
                  is_new_project: messages.length === 0,
                  previous_messages_count: messages.length,
                  save_mode: saveMode,
                  messages: messages.map((m) => ({
                    role: m.role,
                    content: m.content,
                    created_at: m.created_at,
                  })),
                  save_instruction: "要保存对话，请对 Claude 说：保存当前对话",
                }),
              },
            ],
          };
        } catch (err) {
          return {
            content: [{ type: "text", text: JSON.stringify({ error: `Database error: ${err}` }) }],
          };
        }
      }

      case "list_projects": {
        try {
          const projects = listProjects(db);
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify({
                  projects: projects.map((p) => ({
                    name: p.name,
                    created_at: p.created_at,
                    updated_at: p.updated_at,
                  })),
                }),
              },
            ],
          };
        } catch (err) {
          return {
            content: [{ type: "text", text: JSON.stringify({ error: `Database error: ${err}` }) }],
          };
        }
      }

      case "current_project": {
        if (!serverState.currentProject) {
          return {
            content: [{ type: "text", text: JSON.stringify({ active: false }) }],
          };
        }
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                active: true,
                project: {
                  name: serverState.currentProject.name,
                  id: serverState.currentProject.id,
                },
                session_id: serverState.currentSession?.id,
                is_recording: serverState.isRecording,
                save_mode: serverState.saveMode,
                pending_messages: serverState.pendingMessages.length,
              }),
            },
          ],
        };
      }

      case "search_project": {
        if (!serverState.currentProject) {
          return {
            content: [{ type: "text", text: JSON.stringify({ error: "No active project" }) }],
          };
        }
        const query = input.query as string;
        try {
          const messages = searchProjectMessages(db, serverState.currentProject.id, query);
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify({
                  query,
                  results_count: messages.length,
                  messages: messages.map((m) => ({
                    role: m.role,
                    content: m.content,
                    created_at: m.created_at,
                  })),
                }),
              },
            ],
          };
        } catch (err) {
          return {
            content: [{ type: "text", text: JSON.stringify({ error: `Database error: ${err}` }) }],
          };
        }
      }

      case "end_project": {
        // 暂停项目：只断开连接，会话保留在DB中（不设置ended_at），下次进入可恢复
        serverState.currentProject = null;
        serverState.currentSession = null;
        serverState.isRecording = false;
        serverState.pendingMessages = [];

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({ success: true, message: "Project paused, session saved" }),
            },
          ],
        };
      }

      case "delete_project": {
        const name = (input.name as string)?.trim();
        if (!name) {
          return {
            content: [{ type: "text", text: JSON.stringify({ error: "Project name is required" }) }],
          };
        }
        // Prevent deleting currently active project
        if (serverState.currentProject?.name === name) {
          return {
            content: [{ type: "text", text: JSON.stringify({ error: "Cannot delete active project. Use /end first." }) }],
          };
        }
        try {
          const deleted = deleteProject(db, name);
          if (deleted) {
            return {
              content: [{ type: "text", text: JSON.stringify({ success: true, message: `Project "${name}" deleted` }) }],
            };
          } else {
            return {
              content: [{ type: "text", text: JSON.stringify({ error: `Project "${name}" not found` }) }],
            };
          }
        } catch (err) {
          return {
            content: [{ type: "text", text: JSON.stringify({ error: `Database error: ${err}` }) }],
          };
        }
      }

      case "record_message": {
        if (!serverState.isRecording || !serverState.currentSession) {
          return {
            content: [{ type: "text", text: JSON.stringify({ success: false, reason: "Not recording" }) }],
          };
        }

        const roleInput = input.role as string;
        if (!["user", "assistant", "system"].includes(roleInput)) {
          return {
            content: [{ type: "text", text: JSON.stringify({ error: "Invalid role" }) }],
          };
        }
        const role = roleInput as "user" | "assistant" | "system";
        const content = input.content as string;
        const tools = input.tools as string | undefined;
        const now = Date.now();

        if (serverState.saveMode === "manual") {
          serverState.pendingMessages.push({ role, content, tools: tools ?? null, created_at: now });
          return {
            content: [{ type: "text", text: JSON.stringify({ success: true, pending: true, count: serverState.pendingMessages.length }) }],
          };
        }

        try {
          addMessage(db, serverState.currentSession.id, role, content, tools, true);
        } catch (err) {
          return {
            content: [{ type: "text", text: JSON.stringify({ error: `Database error: ${err}` }) }],
          };
        }

        return {
          content: [{ type: "text", text: JSON.stringify({ success: true }) }],
        };
      }

      case "save_message": {
        if (!serverState.isRecording || !serverState.currentSession) {
          return {
            content: [{ type: "text", text: JSON.stringify({ success: false, reason: "Not recording" }) }],
          };
        }
        if (serverState.saveMode !== "manual") {
          return {
            content: [{ type: "text", text: JSON.stringify({ success: false, reason: "Not in manual save mode" }) }],
          };
        }
        if (serverState.pendingMessages.length === 0) {
          return {
            content: [{ type: "text", text: JSON.stringify({ success: true, saved: 0 }) }],
          };
        }

        try {
          const toSave = [...serverState.pendingMessages];
          for (const msg of toSave) {
            addMessage(db, serverState.currentSession.id, msg.role, msg.content, msg.tools ?? undefined, true);
          }
          serverState.pendingMessages = [];
          return {
            content: [{ type: "text", text: JSON.stringify({ success: true, saved: toSave.length }) }],
          };
        } catch (err) {
          return {
            content: [{ type: "text", text: JSON.stringify({ error: `Database error: ${err}` }) }],
          };
        }
      }

      case "auto_record": {
        if (!serverState.isRecording || !serverState.currentSession) {
          return {
            content: [{ type: "text", text: JSON.stringify({ success: false, reason: "Not recording" }) }],
          };
        }

        const userMessage = input.user_message as string;
        const assistantMessage = input.assistant_message as string;
        const now = Date.now();

        try {
          // Save user message
          addMessage(db, serverState.currentSession.id, "user", userMessage, undefined, true);
          // Save assistant message
          addMessage(db, serverState.currentSession.id, "assistant", assistantMessage, undefined, true);

          return {
            content: [{ type: "text", text: JSON.stringify({ success: true, saved: 2 }) }],
          };
        } catch (err) {
          return {
            content: [{ type: "text", text: JSON.stringify({ error: `Database error: ${err}` }) }],
          };
        }
      }

      case "project_save": {
        if (!serverState.isRecording || !serverState.currentSession) {
          return {
            content: [{ type: "text", text: JSON.stringify({ success: false, reason: "Not in a project" }) }],
          };
        }

        const summary = input.summary as string;
        if (!summary || summary.trim().length === 0) {
          return {
            content: [{ type: "text", text: JSON.stringify({ error: "Summary content is empty" }) }],
          };
        }

        try {
          addMessage(db, serverState.currentSession.id, "system", `[项目总结] ${summary}`, undefined, true);
          return {
            content: [{ type: "text", text: JSON.stringify({ success: true, message: "Summary saved to project" }) }],
          };
        } catch (err) {
          return {
            content: [{ type: "text", text: JSON.stringify({ error: `Database error: ${err}` }) }],
          };
        }
      }

      default:
        return {
          content: [{ type: "text", text: JSON.stringify({ error: `Unknown tool: ${toolName}` }) }],
        };
    }
  };

  return { listToolsHandler, callToolHandler, getServerState: () => serverState };
}
