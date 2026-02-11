from __future__ import annotations

import json
from typing import Any

from edgewb.core.run_context import RunContext
from edgewb.tools.tool import Tool


def util_to_json() -> Tool:
    def run(tool_input: dict[str, Any], ctx: RunContext) -> dict[str, Any]:
        value = tool_input.get("value")
        indent = tool_input.get("indent")
        sort_keys = bool(tool_input.get("sort_keys", False))
        json_text = json.dumps(value, ensure_ascii=False, indent=indent, sort_keys=sort_keys)
        return {"json": json_text}

    return Tool(
        name="util.to_json",
        description="Serialize a value to JSON text (for deterministic file output).",
        input_schema={
            "type": "object",
            "additionalProperties": False,
            "properties": {
                "value": {},
                "indent": {"type": ["integer", "null"], "minimum": 0},
                "sort_keys": {"type": "boolean"},
            },
            "required": ["value"],
        },
        output_schema={
            "type": "object",
            "additionalProperties": False,
            "properties": {"json": {"type": "string"}},
            "required": ["json"],
        },
        runner=run,
    )
