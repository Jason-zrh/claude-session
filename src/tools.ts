import { ListToolsRequestSchema, CallToolRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import Database from "better-sqlite3";
import {
  getOrCreateProject,
  listProjects,
  getProjectByName,
  deleteProject,
  createSession,
  endSession,
  getActiveSession,
  addMessage,
  getProjectMessages,
  searchProjectMessages,
  type Project,
  type Session,
} from "./database.js";

interface ToolCallParams {
  name: string;
  arguments?: Record<string, unknown>;
}

interface ServerState {
  currentProject: Project | null;
  currentSession: Session | null;
  isRecording: boolean;
}

export function createTools(db: Database.Database) {
  const serverState: ServerState = {
    currentProject: null,
    currentSession: null,
    isRecording: false,
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
          description: "Record a message to the current project",
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
        try {
          const project = getOrCreateProject(db, name);
          const sessionUuid = crypto.randomUUID();
          const session = createSession(db, project.id, sessionUuid);

          serverState.currentProject = project;
          serverState.currentSession = session;
          serverState.isRecording = true;

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
        try {
          if (serverState.currentSession) {
            endSession(db, serverState.currentSession.id);
          }
          serverState.currentProject = null;
          serverState.currentSession = null;
          serverState.isRecording = false;

          return {
            content: [
              {
                type: "text",
                text: JSON.stringify({ success: true, message: "Project ended, recording stopped" }),
              },
            ],
          };
        } catch (err) {
          return {
            content: [{ type: "text", text: JSON.stringify({ error: `Database error: ${err}` }) }],
          };
        }
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

      default:
        return {
          content: [{ type: "text", text: JSON.stringify({ error: `Unknown tool: ${toolName}` }) }],
        };
    }
  };

  return { listToolsHandler, callToolHandler };
}
