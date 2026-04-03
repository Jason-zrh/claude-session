# Claude Session

<div align="center">

![Claude Session](https://img.shields.io/badge/Claude-Code-7C3AED?style=for-the-badge&logo=anthropic)
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
| 💾 **Flexible save modes** | Auto-save or manual save - you choose |
| 🔢 **Sequential IDs** | Project IDs reset after all projects are deleted |

| 功能 | 说明 |
|------|------|
| 📁 **按项目存储** | 按项目组织保存对话 |
| 🔄 **自动加载上下文** | 恢复项目时加载完整对话历史 |
| 🌐 **跨平台** | Windows 和 macOS 都能用 |
| 🔌 **MCP 协议** | 与 Claude Code 原生集成 |
| 🔢 **顺序 ID** | 删除所有项目后 ID 会重置 |

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

### Commands | 使用方式(用自然语言与cc对话，会自动匹配指令)

- 查看项目列表: 查看项目列表
- 创建项目: 创建 / 进入 "xxx" 项目
- 保存对话消息(在项目中的时候): 保存当前对话
- 结束项目: 结束当前项目
- 删除项目: 删除 "xxx" 项目

整个使用过程不需要用指令，可以识别匹配中文或者英文的指令自动对项目进行管理

---

### How it works | 工作原理

```
┌─────────────────────────────────────────────────────┐
│  /project <name>                                    │
│    ↓                                                │
│  Creates/loads project  +  Loads history            │
│    ↓                                                │
│  You choose: auto or manual save mode               │
│    ↓                                                │
│  You chat with Claude Code                          │
│    ↓                                                │
│  [Auto] Every message saved automatically           │
│  [Manual] Messages buffered, use /save to flush     │
│    ↓                                                │
│  /end                                               │
│    ↓                                                │
│  Recording stopped, data preserved                  │
└─────────────────────────────────────────────────────┘
```

### Database | 数据库

| Location | 位置 |
|----------|------|
| Default | `~/.claude-session.db` |

Put it in iCloud/Dropbox to sync across machines!

---

## Example | 示例

### 查看项目列表
```
用户: 查看项目列表
Claude: [项目列表]

| 项目名称 | 创建时间 | 最后活动时间 |
|---------|---------|------------|
| my-webapp | 2026-03-31 | 2026-04-01 |
| api-design | 2026-04-02 | 2026-04-02 |
```

### 创建/进入项目
```
用户: 创建 "my-webapp" 项目
Claude: 已切换到 my-webapp 项目。0 条历史消息。

用户: 进入 "api-design" 项目
Claude: 已切换到 api-design 项目。5 条历史消息已恢复。
```

### 保存对话消息
```
用户: 保存当前对话
Claude: 对话已保存到数据库。
```
> 自动保存模式下，每条消息会自动保存，无需手动调用。

### 结束项目
```
用户: 结束当前项目
Claude: 项目已结束，对话记录已保存。
```

### 删除项目
```
用户: 删除 "old-project" 项目
Claude: 项目 old-project 已删除，所有相关数据已清除。
```

### 完整使用流程
```
用户: 创建一个新项目叫电商后端
Claude: 已创建并切换到「电商后端」项目。

用户: 开始讨论数据库设计
[对话内容]

用户: 查看项目列表
Claude: [显示电商后端项目]

用户: 结束当前项目
Claude: 项目已结束。

[第二天]

用户: 继续电商后端项目
Claude: 已切换到「电商后端」项目。12 条历史消息已恢复。
[可以继续之前的讨论]
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