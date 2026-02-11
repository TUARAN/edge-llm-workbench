from __future__ import annotations

import json
import uuid
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


@dataclass
class RunStore:
    out_dir: Path

    @property
    def run_meta_path(self) -> Path:
        return self.out_dir / "run.json"

    @property
    def state_path(self) -> Path:
        return self.out_dir / "state.json"

    @property
    def events_path(self) -> Path:
        return self.out_dir / "events.jsonl"

    def ensure_run_id(self) -> str:
        meta = self.load_run_meta(default=None)
        if meta and meta.get("run_id"):
            return str(meta["run_id"])
        run_id = uuid.uuid4().hex
        return run_id

    def save_run_meta(self, meta: dict[str, Any]) -> None:
        self.out_dir.mkdir(parents=True, exist_ok=True)
        self.run_meta_path.write_text(json.dumps(meta, ensure_ascii=False, indent=2), encoding="utf-8")

    def load_run_meta(self, default: Any = None) -> Any:
        if not self.run_meta_path.exists():
            return default
        return json.loads(self.run_meta_path.read_text(encoding="utf-8"))

    def load_state(self) -> dict[str, Any]:
        if not self.state_path.exists():
            return {"steps": {}}
        return json.loads(self.state_path.read_text(encoding="utf-8"))

    def save_state(self, state: dict[str, Any]) -> None:
        self.state_path.write_text(json.dumps(state, ensure_ascii=False, indent=2), encoding="utf-8")

    def append_event(self, event: dict[str, Any]) -> None:
        event = {**event}
        event.setdefault("ts", datetime.now(timezone.utc).isoformat())
        self.events_path.parent.mkdir(parents=True, exist_ok=True)
        with self.events_path.open("a", encoding="utf-8") as f:
            f.write(json.dumps(event, ensure_ascii=False) + "\n")
