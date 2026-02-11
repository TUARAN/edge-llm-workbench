from __future__ import annotations

import time
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from edgewb.core.run_context import RunContext
from edgewb.core.run_store import RunStore
from edgewb.tools.registry import ToolRegistry
from edgewb.util.render import render_template
from edgewb.workflows.models import Workflow


@dataclass
class Orchestrator:
    registry: ToolRegistry
    store: RunStore

    def run(self, workflow: Workflow, ctx: RunContext, inputs: dict[str, Any]) -> dict[str, Any]:
        state = self.store.load_state()
        state.setdefault("steps", {})
        state.setdefault("inputs", inputs)
        state["inputs"] = inputs

        self.store.save_run_meta(
            {
                "run_id": ctx.run_id,
                "workflow": workflow.name,
                "workflow_path": str(Path(workflow.source_path).resolve()) if workflow.source_path else None,
                "replay": False,
            }
        )

        base_context: dict[str, Any] = {
            "inputs": inputs,
            "steps": {k: {"output": v.get("output")} for k, v in state["steps"].items()},
        }

        for step in workflow.steps:
            step_state = state["steps"].get(step.id)
            if step_state and step_state.get("status") == "completed":
                continue

            self.store.append_event({"type": "step_start", "run_id": ctx.run_id, "step_id": step.id})

            tool = self.registry.get(step.tool)
            rendered_input = render_template(step.input, base_context)

            self.store.append_event(
                {
                    "type": "tool_call",
                    "run_id": ctx.run_id,
                    "step_id": step.id,
                    "tool": step.tool,
                    "input": rendered_input,
                }
            )

            attempt = 0
            last_error: str | None = None
            while True:
                attempt += 1
                try:
                    tool.validate_input(rendered_input)
                    output = tool.run(rendered_input, ctx)
                    tool.validate_output(output)

                    state["steps"][step.id] = {
                        "status": "completed",
                        "tool": step.tool,
                        "input": rendered_input,
                        "output": output,
                        "attempt": attempt,
                        "duration_ms": None,
                    }
                    self.store.save_state(state)

                    self.store.append_event(
                        {
                            "type": "tool_result",
                            "run_id": ctx.run_id,
                            "step_id": step.id,
                            "tool": step.tool,
                            "output": output,
                            "attempt": attempt,
                        }
                    )
                    self.store.append_event(
                        {"type": "step_end", "run_id": ctx.run_id, "step_id": step.id, "status": "completed"}
                    )

                    base_context["steps"][step.id] = {"output": output}
                    break
                except Exception as e:  # noqa: BLE001
                    last_error = f"{type(e).__name__}: {e}"
                    self.store.append_event(
                        {
                            "type": "error",
                            "run_id": ctx.run_id,
                            "step_id": step.id,
                            "tool": step.tool,
                            "attempt": attempt,
                            "error": last_error,
                        }
                    )
                    if attempt > step.retries:
                        self.store.append_event(
                            {
                                "type": "step_end",
                                "run_id": ctx.run_id,
                                "step_id": step.id,
                                "status": "failed",
                                "error": last_error,
                            }
                        )
                        raise
                    time.sleep(step.retry_backoff_s)

        outputs = render_template(workflow.outputs or {}, base_context)
        return {"run_id": ctx.run_id, "workflow": workflow.name, "outputs": outputs}

    def replay(self, workflow: Workflow, ctx: RunContext) -> dict[str, Any]:
        state = self.store.load_state()
        base_context: dict[str, Any] = {
            "inputs": state.get("inputs", {}),
            "steps": {k: {"output": v.get("output")} for k, v in state.get("steps", {}).items()},
        }

        missing = [s.id for s in workflow.steps if s.id not in base_context["steps"]]
        if missing:
            raise RuntimeError(f"Replay missing step outputs: {missing}")

        outputs = render_template(workflow.outputs or {}, base_context)
        self.store.append_event({"type": "replay", "run_id": ctx.run_id, "workflow": workflow.name})
        return {"run_id": ctx.run_id, "workflow": workflow.name, "outputs": outputs, "replay": True}
