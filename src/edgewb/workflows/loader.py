from __future__ import annotations

from pathlib import Path
from typing import Any

import yaml

from edgewb.workflows.models import Step, Workflow


def load_workflow(path: Path) -> Workflow:
    data = yaml.safe_load(path.read_text(encoding="utf-8"))
    if not isinstance(data, dict):
        raise ValueError("Workflow YAML must be a mapping")

    version = int(data.get("version", 1))
    name = str(data.get("name") or path.stem)

    raw_steps = data.get("steps")
    if not isinstance(raw_steps, list) or not raw_steps:
        raise ValueError("Workflow requires non-empty steps[]")

    steps: list[Step] = []
    for i, s in enumerate(raw_steps):
        if not isinstance(s, dict):
            raise ValueError(f"Invalid step at index {i}")
        step_id = str(s.get("id") or f"step_{i}")
        tool = str(s.get("tool"))
        if not tool:
            raise ValueError(f"Step {step_id} missing tool")
        step_input = s.get("input") or {}
        if not isinstance(step_input, dict):
            raise ValueError(f"Step {step_id} input must be an object")
        retries = int(s.get("retries", 0))
        retry_backoff_s = float(s.get("retry_backoff_s", 0.0))
        steps.append(Step(id=step_id, tool=tool, input=step_input, retries=retries, retry_backoff_s=retry_backoff_s))

    outputs = data.get("outputs")
    if outputs is not None and not isinstance(outputs, dict):
        raise ValueError("Workflow outputs must be an object")

    inputs = data.get("inputs")
    if inputs is not None and not isinstance(inputs, dict):
        raise ValueError("Workflow inputs must be an object")

    return Workflow(
        name=name,
        version=version,
        steps=steps,
        outputs=outputs,
        inputs=inputs,
        source_path=str(path),
    )
