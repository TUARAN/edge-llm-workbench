from __future__ import annotations

import csv
import json
from pathlib import Path
from typing import Any

from edgewb.core.run_context import RunContext
from edgewb.tools.tool import Tool
from edgewb.util.sandbox import PathSandbox


def file_read_csv() -> Tool:
    def run(tool_input: dict[str, Any], ctx: RunContext) -> dict[str, Any]:
        sandbox = PathSandbox.for_run(ctx)
        path = sandbox.resolve_read(tool_input["path"])

        with path.open("r", encoding=tool_input.get("encoding") or "utf-8") as f:
            reader = csv.DictReader(f)
            rows = list(reader)
        return {"records": rows, "count": len(rows), "path": str(path)}

    return Tool(
        name="file.read_csv",
        description="Read a CSV file into a list of dict records.",
        input_schema={
            "type": "object",
            "additionalProperties": False,
            "properties": {
                "path": {"type": "string"},
                "encoding": {"type": "string"},
            },
            "required": ["path"],
        },
        output_schema={
            "type": "object",
            "additionalProperties": False,
            "properties": {
                "records": {"type": "array", "items": {"type": "object"}},
                "count": {"type": "integer"},
                "path": {"type": "string"},
            },
            "required": ["records", "count", "path"],
        },
        runner=run,
    )


def file_read_text() -> Tool:
    def run(tool_input: dict[str, Any], ctx: RunContext) -> dict[str, Any]:
        sandbox = PathSandbox.for_run(ctx)
        path = sandbox.resolve_read(tool_input["path"])
        encoding = tool_input.get("encoding") or "utf-8"
        text = path.read_text(encoding=encoding)
        return {"text": text, "path": str(path), "encoding": encoding, "chars": len(text)}

    return Tool(
        name="file.read_text",
        description="Read a text/markdown file into a single string.",
        input_schema={
            "type": "object",
            "additionalProperties": False,
            "properties": {
                "path": {"type": "string"},
                "encoding": {"type": "string"},
            },
            "required": ["path"],
        },
        output_schema={
            "type": "object",
            "additionalProperties": False,
            "properties": {
                "text": {"type": "string"},
                "path": {"type": "string"},
                "encoding": {"type": "string"},
                "chars": {"type": "integer"},
            },
            "required": ["text", "path", "encoding", "chars"],
        },
        runner=run,
    )


def file_write_text() -> Tool:
    def run(tool_input: dict[str, Any], ctx: RunContext) -> dict[str, Any]:
        sandbox = PathSandbox.for_run(ctx)
        raw_path = Path(tool_input["path"])
        if not raw_path.is_absolute():
            if raw_path.parts and raw_path.parts[0] == "out":
                raw_path = Path(*raw_path.parts[1:])
            raw_path = (ctx.out_dir / raw_path).resolve()
        out_path = sandbox.resolve_write(str(raw_path), create_parents=True)

        encoding = tool_input.get("encoding") or "utf-8"
        text = tool_input["text"]
        out_path.write_text(text, encoding=encoding)
        return {"path": str(out_path), "encoding": encoding, "chars": len(text)}

    return Tool(
        name="file.write_text",
        description="Write plain text to a file.",
        input_schema={
            "type": "object",
            "additionalProperties": False,
            "properties": {
                "path": {"type": "string"},
                "text": {"type": "string"},
                "encoding": {"type": "string"},
            },
            "required": ["path", "text"],
        },
        output_schema={
            "type": "object",
            "additionalProperties": False,
            "properties": {
                "path": {"type": "string"},
                "encoding": {"type": "string"},
                "chars": {"type": "integer"},
            },
            "required": ["path", "encoding", "chars"],
        },
        runner=run,
    )


def file_write_jsonl() -> Tool:
    def run(tool_input: dict[str, Any], ctx: RunContext) -> dict[str, Any]:
        sandbox = PathSandbox.for_run(ctx)
        raw_path = Path(tool_input["path"])
        if not raw_path.is_absolute():
            if raw_path.parts and raw_path.parts[0] == "out":
                raw_path = Path(*raw_path.parts[1:])
            raw_path = (ctx.out_dir / raw_path).resolve()
        out_path = sandbox.resolve_write(str(raw_path), create_parents=True)

        records = tool_input["records"]
        with out_path.open("w", encoding=tool_input.get("encoding") or "utf-8") as f:
            for rec in records:
                f.write(json.dumps(rec, ensure_ascii=False) + "\n")

        return {"path": str(out_path), "count": len(records)}

    return Tool(
        name="file.write_jsonl",
        description="Write records to JSONL.",
        input_schema={
            "type": "object",
            "additionalProperties": False,
            "properties": {
                "path": {"type": "string"},
                "records": {"type": "array", "items": {}},
                "encoding": {"type": "string"},
            },
            "required": ["path", "records"],
        },
        output_schema={
            "type": "object",
            "additionalProperties": False,
            "properties": {"path": {"type": "string"}, "count": {"type": "integer"}},
            "required": ["path", "count"],
        },
        runner=run,
    )
