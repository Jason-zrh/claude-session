# Claude Session

> Persist Claude Code conversations to SQLite, organized by projects.

[English](#english) | [中文](#中文)

---

## English

### Features

- **Project-based storage** - Save conversations organized by project
- **Auto context loading** - Resume projects with full conversation history
- **Cross-platform** - Works on Windows and macOS via Node.js
- **MCP protocol** - Native integration with Claude Code via Model Context Protocol

### Installation

```bash
npm install -g claude-session
```

### Setup

```bash
claude-session init
```

This creates `~/.claude/claude_desktop_config.json` so Claude Code can discover the MCP server.

### Usage

In Claude Code CLI:

```
/project my-webapp    # Start/continue a project + load history + begin saving
/projects             # List all projects
/search auth setup   # Search within current project
/end                 # End project, stop saving
```

### How it works

1. Run `/project <name>` to start saving conversations to that project
2. All messages (yours and Claude's) are stored in SQLite
3. Run `/end` when done - recording stops but data is preserved
4. Next time you run `/project <name>`, all previous messages are loaded into context

### Database Location

Default: `~/.claude-session.db`

### License

MIT

---

## 中文

### 功能特点

- **按项目存储** - 按项目组织保存对话
- **自动加载上下文** - 恢复项目时加载完整对话历史
- **跨平台** - 通过 Node.js 在 Windows 和 macOS 上运行
- **MCP 协议** - 通过 Model Context Protocol 与 Claude Code 原生集成

### 安装

```bash
npm install -g claude-session
```

### 初始化

```bash
claude-session init
```

这会创建 `~/.claude/claude_desktop_config.json`，让 Claude Code 能够发现 MCP 服务器。

### 使用方式

在 Claude Code CLI 中：

```
/project my-webapp    # 启动/继续项目 + 加载历史 + 开始保存
/projects             # 列出所有项目
/search auth setup   # 在当前项目内搜索
/end                 # 结束项目，停止保存
```

### 工作原理

1. 运行 `/project <name>` 开始保存对话到该项目
2. 所有消息（你和 Claude 的）都存储在 SQLite 中
3. 运行 `/end` 结束时——记录停止但数据保留
4. 下次运行 `/project <name>` 时，所有之前的消息都会被加载到上下文中

### 数据库位置

默认：`~/.claude-session.db`

### 许可证

MIT
