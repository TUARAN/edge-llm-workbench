import json
from pathlib import Path

from edgewb.core.orchestrator import Orchestrator
from edgewb.core.run_context import RunContext
from edgewb.core.run_store import RunStore
from edgewb.tools.builtins import register_builtin_tools
from edgewb.tools.registry import ToolRegistry
from edgewb.workflows.loader import load_workflow


def test_orchestrator_runs_workflow(tmp_path: Path):
    (tmp_path / "examples" / "data").mkdir(parents=True)
    tickets = tmp_path / "examples" / "data" / "tickets.csv"
    tickets.write_text("id,text\n1,申请退款，订单号 A1\n", encoding="utf-8")

    wf_path = tmp_path / "wf.yaml"
    wf_path.write_text(
        """
version: 1
name: label
inputs: { csv_path: "" }
steps:
  - id: load
    tool: file.read_csv
    input: { path: "{{ inputs.csv_path }}" }
  - id: lab
    tool: label.apply_rules
    input:
      records: "{{ steps.load.output.records }}"
      field: text
      default_label: other
      rules:
        - contains: "退款"
          label: refund
outputs: { count: "{{ steps.lab.output.count }}" }
""".strip(),
        encoding="utf-8",
    )

    wf = load_workflow(wf_path)
    registry = ToolRegistry()
    register_builtin_tools(registry)

    out_dir = tmp_path / "out"
    store = RunStore(out_dir)
    ctx = RunContext(workspace_root=tmp_path, out_dir=out_dir, run_id="r1", replay=False)

    orch = Orchestrator(registry=registry, store=store)
    result = orch.run(wf, ctx, inputs={"csv_path": str(tickets)})

    assert result["outputs"]["count"] == 1
    assert (out_dir / "state.json").exists()
    assert (out_dir / "events.jsonl").exists()
    json.loads((out_dir / "state.json").read_text(encoding="utf-8"))
