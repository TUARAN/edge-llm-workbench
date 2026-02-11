from __future__ import annotations

import re
from typing import Any

_PATTERN = re.compile(r"\{\{\s*([a-zA-Z0-9_\.]+)\s*\}\}")


def _lookup(path: str, ctx: dict[str, Any]) -> Any:
    cur: Any = ctx
    for part in path.split("."):
        if not isinstance(cur, dict) or part not in cur:
            raise KeyError(f"Missing template key: {path}")
        cur = cur[part]
    return cur


def render_template(value: Any, ctx: dict[str, Any]) -> Any:
    if isinstance(value, dict):
        return {k: render_template(v, ctx) for k, v in value.items()}
    if isinstance(value, list):
        return [render_template(v, ctx) for v in value]
    if not isinstance(value, str):
        return value

    m = _PATTERN.fullmatch(value)
    if m:
        return _lookup(m.group(1), ctx)

    def repl(match: re.Match[str]) -> str:
        v = _lookup(match.group(1), ctx)
        return str(v)

    return _PATTERN.sub(repl, value)
