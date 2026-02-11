from pathlib import Path

from edgewb.workflows.loader import load_workflow


def test_load_workflow(tmp_path: Path):
    p = tmp_path / "wf.yaml"
    p.write_text(
        """
version: 1
name: t
steps:
  - id: s1
    tool: file.read_csv
    input: { path: x }
outputs: { ok: true }
""".strip(),
        encoding="utf-8",
    )
    wf = load_workflow(p)
    assert wf.name == "t"
    assert wf.steps[0].id == "s1"
