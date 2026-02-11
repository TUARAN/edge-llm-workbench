from __future__ import annotations

from dataclasses import dataclass
from typing import Any


@dataclass(frozen=True)
class Step:
    id: str
    tool: str
    input: dict[str, Any]
    retries: int = 0
    retry_backoff_s: float = 0.0


@dataclass(frozen=True)
class Workflow:
    name: str
    version: int
    steps: list[Step]
    outputs: dict[str, Any] | None = None
    inputs: dict[str, Any] | None = None
    source_path: str | None = None
