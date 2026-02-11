# Architecture

## 分层与职责

- **Planner（智能决策层）**：任务理解、步骤拆解、工具选择、参数生成、结果归纳。
  - 通过 **LLM Gateway** 与下层通信。
  - 不直接触碰文件/系统资源。

- **Executor（执行层）**：确定性执行与可审计。
  - **Orchestrator**：加载工作流、渲染参数、调度 Tool、失败重试、断点续跑。
  - **Tools Runtime**：工具注册与调用、schema 校验、沙箱与权限控制。
  - **Local Data**：文件存储与 SQLite（可选）。

## 关键设计点

### 1) 工具契约（Schema Contract）

每个 Tool 明确声明：
- `name`：全局唯一（如 `file.read_csv`）
- `input_schema` / `output_schema`：JSON Schema
- `run(input, ctx) -> output`：确定性执行函数

Orchestrator 在调用 Tool 前后都进行 schema 校验：
- 输入不合法：立即失败（可重试由工作流策略决定）
- 输出不合法：视为 Tool 实现错误（需要修复工具）

### 2) 审计日志与回放

- `events.jsonl`：逐事件记录（step_start, tool_call, tool_result, step_end, error...）
- `state.json`：步骤输出快照（用于断点续跑与 replay）

Replay 模式：
- 不调用真实 Tool
- 直接使用 `state.json` 中记录的输出
- 用于复现结果、审计链路、回归测试

### 3) 沙箱与权限

- 默认只允许访问工作区内的 `examples/`, `out/`, `data/` 等白名单目录
- 路径必须为相对路径或白名单下的绝对路径
-（可选）资源限制：CPU/内存等限制在不同平台能力不同，运行时以 best-effort 方式启用

### 4) 工作流（YAML）

工作流定义是“流程固化”的核心：
- 支持 `steps[]` 顺序执行
- `input` 中支持 `{{ ... }}` 引用 `inputs` 与 `steps.<id>.output`
- `retries`/`timeout`（可扩展）

## 运行时数据目录

一次运行默认输出到 `out/`（也可指定）：
- `run.json`：运行元信息（run_id、workflow 名称、时间戳等）
- `state.json`：步骤结果快照
- `events.jsonl`：可审计事件流

## 未来扩展方向

- 多步并行与 DAG（依赖图）
- Tool 权限粒度（能力令牌、最小权限）
- LLM Planner 接入真实本地推理（llama.cpp/ollama）
- 更严格的资源隔离（容器/沙箱）
- Workflow DSL 版本化与迁移工具
