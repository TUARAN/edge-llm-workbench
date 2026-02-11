from __future__ import annotations

import html
from pathlib import Path
from typing import Any

from edgewb.core.run_context import RunContext
from edgewb.tools.tool import Tool
from edgewb.util.sandbox import PathSandbox


def viz_render_svg() -> Tool:
    def run(tool_input: dict[str, Any], ctx: RunContext) -> dict[str, Any]:
        text = str(tool_input.get("text") or "")
        width = int(tool_input.get("width") or 1024)
        height = int(tool_input.get("height") or 512)
        font_size = int(tool_input.get("font_size") or 32)
        bg = str(tool_input.get("bg") or "#0b1020")
        fg = str(tool_input.get("fg") or "#e6e6e6")

        sandbox = PathSandbox.for_run(ctx)
        raw_path = Path(tool_input["path"])
        if not raw_path.is_absolute():
            if raw_path.parts and raw_path.parts[0] == "out":
                raw_path = Path(*raw_path.parts[1:])
            raw_path = (ctx.out_dir / raw_path).resolve()
        out_path = sandbox.resolve_write(str(raw_path), create_parents=True)

        safe_text = html.escape(text)
        svg = f"""<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"{width}\" height=\"{height}\" viewBox=\"0 0 {width} {height}\">\n  <rect width=\"100%\" height=\"100%\" fill=\"{bg}\"/>\n  <text x=\"50%\" y=\"50%\" fill=\"{fg}\" font-family=\"ui-sans-serif, system-ui\" font-size=\"{font_size}\" text-anchor=\"middle\" dominant-baseline=\"middle\">{safe_text}</text>\n</svg>\n"""

        out_path.write_text(svg, encoding="utf-8")
        return {"path": str(out_path), "width": width, "height": height}

    return Tool(
        name="viz.render_svg",
        description="Render a simple SVG poster from text (offline, deterministic).",
        input_schema={
            "type": "object",
            "additionalProperties": False,
            "properties": {
                "text": {"type": "string"},
                "path": {"type": "string"},
                "width": {"type": "integer", "minimum": 16},
                "height": {"type": "integer", "minimum": 16},
                "font_size": {"type": "integer", "minimum": 6},
                "bg": {"type": "string"},
                "fg": {"type": "string"},
            },
            "required": ["text", "path"],
        },
        output_schema={
            "type": "object",
            "additionalProperties": False,
            "properties": {"path": {"type": "string"}, "width": {"type": "integer"}, "height": {"type": "integer"}},
            "required": ["path", "width", "height"],
        },
        runner=run,
    )
