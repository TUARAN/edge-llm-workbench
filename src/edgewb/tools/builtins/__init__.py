from __future__ import annotations

from edgewb.tools.builtins.doc_tools import doc_extract_outline
from edgewb.tools.builtins.file_tools import file_read_csv, file_read_text, file_write_jsonl, file_write_text
from edgewb.tools.builtins.label_tools import label_apply_rules
from edgewb.tools.builtins.util_tools import util_to_json
from edgewb.tools.builtins.viz_tools import viz_render_svg
from edgewb.tools.registry import ToolRegistry


def register_builtin_tools(registry: ToolRegistry) -> None:
    registry.register(file_read_csv())
    registry.register(file_read_text())
    registry.register(file_write_text())
    registry.register(file_write_jsonl())
    registry.register(label_apply_rules())
    registry.register(doc_extract_outline())
    registry.register(util_to_json())
    registry.register(viz_render_svg())
