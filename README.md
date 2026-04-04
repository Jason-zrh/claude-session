# Claude Session

将 Claude Code 对话持久化到 SQLite，按项目组织。

---

## 安装

```bash
npm install
npm run build
node dist/index.js init
```

重启 Claude Code 使 MCP server 生效。

---

## 工作原理

这是一个 MCP (Model Context Protocol) Server。Claude Code 通过 MCP 协议连接后，对话会被自动记录到 SQLite 数据库。

用户通过自然语言命令触发 MCP 工具调用来管理项目。

---

## 核心操作

### 1. 创建/进入项目

```
创建"xxx"项目
```
或
```
进入"xxx"项目
```

MCP 工具 `use_project` 会被调用。如果项目已存在，会恢复之前的会话；如果不存在，会创建新项目。

支持 `save_mode` 参数：
- `auto`（默认）：每条消息即时保存
- `manual`：消息暂存，定期调用 `save_message` 批量保存

### 2. 查看项目列表

```
查看项目列表
```

MCP 工具 `list_projects` 会被调用。

### 3. 结束项目（暂停）

```
结束当前项目
```

MCP 工具 `end_project` 会被调用。项目会暂停但数据保留在数据库中，下次进入可恢复。

### 4. 删除项目

```
删除"xxx"项目
```

MCP 工具 `delete_project` 会被调用。

### 5. 搜索项目消息

```
搜索"xxx"在当前项目中
```

MCP 工具 `search_project` 会被调用。

### 6. 保存项目总结

```
保存项目
```
或
```
保存对话
```

MCP 工具 `project_save` 会被调用，保存一个项目总结消息。

---

## 自动记录

每轮对话结束后，Claude Code 会自动调用 `auto_record` 工具，将用户消息和助手回复同时保存到数据库。

---

## 恢复项目

下次打开 Claude Code 时，说：

```
进入"xxx"项目
```

Claude 会显示该项目的历史消息数量（`previous_messages_count`），并加载所有历史消息。

---

## 数据库位置

```
~/.claude-session.db
```

可以同步到云端（iCloud/Dropbox）实现跨设备共享。

---

## MCP 工具列表

| 工具 | 触发命令 | 用途 |
|------|----------|------|
| `use_project` | 创建/进入"xxx"项目 | 创建或切换项目 |
| `list_projects` | 查看项目列表 | 列出所有项目 |
| `current_project` | - | 显示当前项目状态 |
| `search_project` | 搜索"xxx" | 搜索项目消息 |
| `end_project` | 结束当前项目 | 暂停项目 |
| `delete_project` | 删除"xxx"项目 | 删除项目及所有数据 |
| `record_message` | - | 记录单条消息 |
| `auto_record` | - | 自动保存一轮对话 |
| `project_save` | 保存项目/保存对话 | 保存项目总结 |
| `save_message` | - | 批量保存暂存消息（manual模式） |

---

## 数据库结构

| 表 | 字段 |
|---|------|
| projects | id, name, created_at, updated_at |
| sessions | id, project_id, session_uuid, started_at, ended_at |
| messages | id, session_id, role, content, tools, collapsed, created_at |

查看数据：

```bash
sqlite3 ~/.claude-session.db "SELECT * FROM messages JOIN sessions ON messages.session_id = sessions.id WHERE sessions.project_id = 1;"
```

---

## 故障排除

**Q: 说"保存项目"但没有反应？**
A: 检查是否在项目中，先说"查看项目列表"确认。

**Q: 消息没有保存？**
A: 确保项目处于激活状态（`current_project` 显示 `is_recording: true`）

**Q: 看不到历史消息？**
A: 进入项目时会显示 `previous_messages_count`，历史消息会自动加载

--- 

## 使用示例
- 创建"XXX"项目 
- 与cc对话.... 
- 保存当前对话(cc自动总结上文全部对话并进行保存，如果你想自己总结也可以输入自己总结的内容)
- 结束对话(离开当前项目)

关闭cc后重新进入项目或者直接重新进入对话
切换到"XXX"项目 / 对话

在每次大批对话后执行一次保存当前对话，防止上下文窗口过大导致部分消息丢失！！！