from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path

from edgewb.core.run_context import RunContext


@dataclass(frozen=True)
class PathSandbox:
    allowed_roots: tuple[Path, ...]

    @staticmethod
    def default(workspace_root: Path) -> "PathSandbox":
        roots = (
            workspace_root / "examples",
            workspace_root / "out",
            workspace_root / "data",
            workspace_root,
        )
        return PathSandbox(tuple(r.resolve() for r in roots))

    @staticmethod
    def for_run(ctx: RunContext) -> "PathSandbox":
        workspace_root = ctx.workspace_root
        roots = (
            workspace_root / "examples",
            workspace_root / "data",
            workspace_root / "out",
            ctx.out_dir,
            workspace_root,
        )
        return PathSandbox(tuple(r.resolve() for r in roots))

    def _resolve(self, user_path: str) -> Path:
        p = Path(user_path)
        if not p.is_absolute():
            # treat as workspace-relative
            p = (self.allowed_roots[-1] / p).resolve()
        else:
            p = p.resolve()

        for root in self.allowed_roots:
            try:
                p.relative_to(root)
                return p
            except ValueError:
                continue
        raise PermissionError(f"Path not allowed by sandbox: {p}")

    def resolve_read(self, user_path: str) -> Path:
        p = self._resolve(user_path)
        if not p.exists():
            raise FileNotFoundError(str(p))
        return p

    def resolve_write(self, user_path: str, *, create_parents: bool = False) -> Path:
        p = self._resolve(user_path)
        if create_parents:
            p.parent.mkdir(parents=True, exist_ok=True)
        return p
