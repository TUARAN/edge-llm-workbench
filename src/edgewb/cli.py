from __future__ import annotations

import argparse
import json
import os
from pathlib import Path
from typing import Any

from edgewb.core.orchestrator import Orchestrator
from edgewb.core.run_context import RunContext
from edgewb.core.run_store import RunStore
from edgewb.tools.builtins import register_builtin_tools
from edgewb.tools.registry import ToolRegistry
from edgewb.util.kv import apply_kv_overrides
from edgewb.workflows.loader import load_workflow


def _parse_set_kv(values: list[str]) -> dict[str, Any]:
    data: dict[str, Any] = {}
    for item in values:
        if "=" not in item:
            raise SystemExit(f"Invalid --set value: {item!r}. Expected key=value")
        key, raw = item.split("=", 1)
        key = key.strip()
        raw = raw.strip()
        if raw.startswith("{") or raw.startswith("[") or raw in {"true", "false", "null"} or raw.isdigit():
            try:
                value = json.loads(raw)
            except json.JSONDecodeError:
                value = raw
        else:
            value = raw
        apply_kv_overrides(data, key, value)
    return data


def cmd_run(args: argparse.Namespace) -> int:
    workflow = load_workflow(Path(args.workflow))

    out_dir = Path(args.out).resolve()
    out_dir.mkdir(parents=True, exist_ok=True)

    registry = ToolRegistry()
    register_builtin_tools(registry)

    store = RunStore(out_dir)
    ctx = RunContext(
        workspace_root=Path(os.getcwd()).resolve(),
        out_dir=out_dir,
        run_id=store.ensure_run_id(),
        replay=False,
    )

    overrides = _parse_set_kv(args.set or [])
    inputs = workflow.inputs.copy() if workflow.inputs else {}
    inputs.update(overrides.get("inputs", {}))

    orch = Orchestrator(registry=registry, store=store)
    result = orch.run(workflow=workflow, ctx=ctx, inputs=inputs)

    (out_dir / "result.json").write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps(result, ensure_ascii=False, indent=2))
    return 0


def cmd_replay(args: argparse.Namespace) -> int:
    out_dir = Path(args.out).resolve()

    registry = ToolRegistry()
    register_builtin_tools(registry)

    store = RunStore(out_dir)
    meta = store.load_run_meta()
    workflow_path = meta.get("workflow_path")
    if not workflow_path:
        raise SystemExit("Missing workflow_path in run.json")

    workflow = load_workflow(Path(workflow_path))

    ctx = RunContext(
        workspace_root=Path(os.getcwd()).resolve(),
        out_dir=out_dir,
        run_id=meta.get("run_id", store.ensure_run_id()),
        replay=True,
    )

    orch = Orchestrator(registry=registry, store=store)
    result = orch.replay(workflow=workflow, ctx=ctx)

    print(json.dumps(result, ensure_ascii=False, indent=2))
    return 0


def build_parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(prog="edgewb", description="Edge LLM Workbench runtime")
    sub = p.add_subparsers(dest="cmd", required=True)

    run = sub.add_parser("run", help="Run a workflow YAML")
    run.add_argument("workflow", help="Path to workflow YAML")
    run.add_argument("--out", default="out", help="Output directory (default: out)")
    run.add_argument(
        "--set",
        action="append",
        default=[],
        help="Override inputs/params via key=value (supports JSON). Example: --set inputs.sms_file=examples/data/sms.csv",
    )
    run.set_defaults(func=cmd_run)

    replay = sub.add_parser("replay", help="Replay from an out/ directory (no tool execution)")
    replay.add_argument("out", nargs="?", default="out", help="Output directory to replay")
    replay.set_defaults(func=cmd_replay)

    return p


def main(argv: list[str] | None = None) -> None:
    parser = build_parser()
    args = parser.parse_args(argv)
    raise SystemExit(args.func(args))
