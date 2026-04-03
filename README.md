# Claude Session

<div align="center">

![Claude Session](https://img.shields.io/badge/Claude-Code-7C3AED?style=for-the-badge&logo=anthropic)
![Node.js](https://img.shields.io/badge/Node.js-18+-339933?style=for-the-badge&logo=nodedotjs)
![SQLite](https://img.shields.io/badge/SQLite-Persisted-brightgreen?style=for-the-badge&logo=sqlite)
![MIT](https://img.shields.io/badge/License-MIT-yellow?style=for-the-badge)

**Persist Claude Code conversations to SQLite, organized by projects.**

[English](#english) | [中文](#中文)

</div>

---

## Features | 功能特点

| Feature | Description |
|---------|-------------|
| 📁 **Project-based storage** | Save conversations organized by project |
| 🔄 **Auto context loading** | Resume projects with full conversation history |
| 🌐 **Cross-platform** | Works on Windows and macOS |
| 🔌 **MCP protocol** | Native integration with Claude Code |

| 功能 | 说明 |
|------|------|
| 📁 **按项目存储** | 按项目组织保存对话 |
| 🔄 **自动加载上下文** | 恢复项目时加载完整对话历史 |
| 🌐 **跨平台** | Windows 和 macOS 都能用 |
| 🔌 **MCP 协议** | 与 Claude Code 原生集成 |

---

## Quick Start | 快速开始

### Installation | 安装

```bash
npm install -g claude-session
```

### Setup | 初始化

```bash
claude-session init
```

> Restart Claude Code to load the MCP server.

---

## Usage | 使用方式

```bash
# Start/continue a project
/project my-webapp

# List all projects
/projects

# Search within project
/search auth setup

# End project, stop saving
/end
```

### How it works | 工作原理

```
┌─────────────────────────────────────────────────────┐
│  /project <name>                                    │
│    ↓                                                │
│  Creates/loads project  +  Loads history  +  Starts saving
│    ↓                                                │
│  You chat with Claude Code                          │
│    ↓                                                │
│  /end                                               │
│    ↓                                                │
│  Recording stopped, data preserved                   │
└─────────────────────────────────────────────────────┘
```

### Database | 数据库

| Location | 位置 |
|----------|------|
| Default | `~/.claude-session.db` |

Put it in iCloud/Dropbox to sync across machines!

---

## Commands | 命令

| Command | Description | 说明 |
|---------|-------------|------|
| `claude-session init` | Initialize MCP config | 初始化 MCP 配置 |
| `/project <name>` | Start or continue a project | 启动或继续项目 |
| `/projects` | List all projects | 列出所有项目 |
| `/search <query>` | Search project messages | 搜索项目消息 |
| `/end` | End project, stop recording | 结束项目，停止保存 |

---

## Example | 示例

```bash
# Start a new project
/project my-webapp
# → "Project created. 0 previous messages."

# Chat with Claude
# → "How do I set up authentication?"

# End session
/end
# → "Project ended, recording stopped."

# Continue later
/project my-webapp
# → "Project loaded. 2 previous messages restored."
```

---

## Tech Stack | 技术栈

- **Runtime**: Node.js 18+
- **Protocol**: Model Context Protocol (MCP)
- **Database**: SQLite via better-sqlite3
- **Language**: TypeScript

---

## License | 许可证

MIT © 2026

---

<div align="center">

**Star ⭐ if this helped you!**

</div>
