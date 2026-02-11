from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path


@dataclass(frozen=True)
class RunContext:
    workspace_root: Path
    out_dir: Path
    run_id: str
    replay: bool = False
