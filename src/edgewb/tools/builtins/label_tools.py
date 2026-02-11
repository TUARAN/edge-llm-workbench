from __future__ import annotations

from typing import Any

from edgewb.core.run_context import RunContext
from edgewb.tools.tool import Tool


def label_apply_rules() -> Tool:
    def run(tool_input: dict[str, Any], ctx: RunContext) -> dict[str, Any]:
        records = tool_input["records"]
        field = tool_input.get("field") or "text"
        rules = tool_input.get("rules") or []
        default_label = tool_input.get("default_label") or "other"

        labeled = []
        label_set = set()
        for rec in records:
            text = str(rec.get(field, ""))
            label = default_label
            for rule in rules:
                needle = str(rule.get("contains", ""))
                if needle and needle in text:
                    label = str(rule.get("label") or default_label)
                    break
            labeled.append({**rec, "label": label})
            label_set.add(label)

        return {
            "records": labeled,
            "count": len(labeled),
            "labels": sorted(label_set),
            "field": field,
        }

    return Tool(
        name="label.apply_rules",
        description="Apply substring rules to label records deterministically.",
        input_schema={
            "type": "object",
            "additionalProperties": False,
            "properties": {
                "records": {"type": "array", "items": {"type": "object"}},
                "field": {"type": "string"},
                "default_label": {"type": "string"},
                "rules": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "additionalProperties": False,
                        "properties": {
                            "contains": {"type": "string"},
                            "label": {"type": "string"},
                        },
                        "required": ["contains", "label"],
                    },
                },
            },
            "required": ["records", "rules"],
        },
        output_schema={
            "type": "object",
            "additionalProperties": False,
            "properties": {
                "records": {"type": "array", "items": {"type": "object"}},
                "count": {"type": "integer"},
                "labels": {"type": "array", "items": {"type": "string"}},
                "field": {"type": "string"},
            },
            "required": ["records", "count", "labels", "field"],
        },
        runner=run,
    )
