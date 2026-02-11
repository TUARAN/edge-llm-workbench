from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Protocol

from jsonschema import Draft202012Validator

from edgewb.core.run_context import RunContext


class ToolRunner(Protocol):
    def __call__(self, tool_input: dict[str, Any], ctx: RunContext) -> dict[str, Any]: ...


@dataclass(frozen=True)
class Tool:
    name: str
    description: str
    input_schema: dict[str, Any]
    output_schema: dict[str, Any]
    runner: ToolRunner

    def validate_input(self, data: dict[str, Any]) -> None:
        Draft202012Validator(self.input_schema).validate(data)

    def validate_output(self, data: dict[str, Any]) -> None:
        Draft202012Validator(self.output_schema).validate(data)

    def run(self, tool_input: dict[str, Any], ctx: RunContext) -> dict[str, Any]:
        return self.runner(tool_input, ctx)
