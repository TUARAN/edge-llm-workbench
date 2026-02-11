from __future__ import annotations

import re
from typing import Any

from edgewb.core.run_context import RunContext
from edgewb.tools.tool import Tool


_HEADING_RE = re.compile(r"^(#{1,6})\s+(.*)$")
_BULLET_RE = re.compile(r"^\s*[-\*]\s+(.*)$")


def doc_extract_outline() -> Tool:
    def run(tool_input: dict[str, Any], ctx: RunContext) -> dict[str, Any]:
        text = tool_input["text"]
        max_headings = int(tool_input.get("max_headings") or 200)
        max_bullets = int(tool_input.get("max_bullets") or 500)

        headings = []
        bullets = []
        for line in text.splitlines():
            m = _HEADING_RE.match(line)
            if m and len(headings) < max_headings:
                headings.append({"level": len(m.group(1)), "title": m.group(2).strip()})
                continue
            b = _BULLET_RE.match(line)
            if b and len(bullets) < max_bullets:
                bullets.append(b.group(1).strip())

        words = len(re.findall(r"\w+", text))
        return {"headings": headings, "bullets": bullets, "word_count": words}

    return Tool(
        name="doc.extract_outline",
        description="Extract headings and bullet items from markdown/text.",
        input_schema={
            "type": "object",
            "additionalProperties": False,
            "properties": {
                "text": {"type": "string"},
                "max_headings": {"type": "integer", "minimum": 1},
                "max_bullets": {"type": "integer", "minimum": 1},
            },
            "required": ["text"],
        },
        output_schema={
            "type": "object",
            "additionalProperties": False,
            "properties": {
                "headings": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "additionalProperties": False,
                        "properties": {"level": {"type": "integer"}, "title": {"type": "string"}},
                        "required": ["level", "title"],
                    },
                },
                "bullets": {"type": "array", "items": {"type": "string"}},
                "word_count": {"type": "integer"},
            },
            "required": ["headings", "bullets", "word_count"],
        },
        runner=run,
    )
