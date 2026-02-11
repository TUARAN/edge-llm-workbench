# Edge LLM Workbench

面向生产落地的离线本地 AI 应用工程蓝图：**Planner(大模型) + Tools(可审计执行) + Workflows(可版本化流程) + Local Runtime(低时延/强隐私)**。

> 目标：把“大模型聊天接口”升级为可嵌入的软件执行引擎，并通过分层架构将“智能决策”与“确定性执行”隔离。

## 特性

- **分层清晰**：UI → App Service → Orchestrator → LLM Gateway → Tools Runtime → Local Data
- **工具可审计**：每个 Tool 有明确的 input/output schema，日志可回放
- **离线优先**：本地文件、SQLite、批处理；不强依赖云服务
- **确定性执行**：工作流以 YAML 固化；支持断点续跑与重放（replay）

## 快速开始

### 1) 安装

```bash
python -m venv .venv
source .venv/bin/activate
pip install -U pip
pip install -e '.[dev]'
```

### 2) 运行示例工作流

#### A. 数据打标（规则打标，可审计/可回放）

```bash
edgewb run workflows/data_labeling.yaml \
  --set inputs.csv_path=examples/data/tickets.csv \
  --out out/label
```

#### B. 文字绘图（离线生成 SVG 海报）

```bash
edgewb run workflows/text_to_svg.yaml \
  --set inputs.prompt_path=examples/prompts/poster.txt \
  --out out/svg
```

#### C. 解析文档（提取大纲/要点并落盘 JSON）

```bash
edgewb run workflows/doc_parse_outline.yaml \
  --set inputs.doc_path=examples/docs/sample.md \
  --out out/doc
```

运行后会生成：
- `out/**/run.json`：本次运行元信息
- `out/**/state.json`：步骤状态（用于断点续跑）
- `out/**/events.jsonl`：事件日志（用于审计/回放）
- 以及各工作流自己的产物（如 `labels.jsonl` / `poster.svg` / `outline.json`）

### 3) 断点续跑

再次执行相同命令会自动跳过已完成步骤（基于 `state.json`）。

如需“从头再跑一遍”，删除对应输出目录（例如 `rm -rf out/label`）或换一个新的 `--out` 目录。

### 4) 回放（Replay）

```bash
edgewb replay out/label
```

回放会读取该目录下的 `state.json`，不再调用真实工具，用于审计与复现。

## 仓库结构

- `src/edgewb/`：运行时核心（编排器、工具注册、沙箱、日志、回放）
- `workflows/`：工作流 YAML（可版本化流程骨架）
- `examples/`：示例数据与输出
- `docs/`：架构文档与设计说明

## 架构文档

- 详见：docs/architecture.md

## 桌面端可视化（Tauri）

提供一个通用桌面端控制台，用于展示核心设计（架构分层、工作流、运行记录、工具列表）。

### 启动步骤

1) 安装依赖（需要 Node.js + Rust）

```bash
cd ui/tauri
npm install
```

2) 启动桌面端（开发模式）

```bash
npm run tauri dev
```

默认会自动向上查找包含 `workflows/` 的目录作为工作区根；必要时可显式指定：

```bash
EDGEWB_WORKSPACE_ROOT=.. npm run tauri dev
```

界面包含四个视图：Overview / Workflows / Runs / Architecture。

## 免责声明

本仓库是工程蓝图与可运行最小实现（MVP）。你可以替换/接入真实的本地模型推理引擎（例如 llama.cpp/ollama/vLLM-on-edge 等），但建议始终保留：
- Planner 与 Executor 的边界
- Tool 的 schema 与审计日志
- 可回放与可复现
