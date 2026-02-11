from edgewb.util.render import render_template


def test_render_lookup_fullmatch_preserves_type():
    ctx = {"inputs": {"n": 1}, "steps": {"a": {"output": {"x": [1, 2]}}}}
    assert render_template("{{ inputs.n }}", ctx) == 1
    assert render_template("{{ steps.a.output.x }}", ctx) == [1, 2]


def test_render_interpolate_into_string():
    ctx = {"inputs": {"name": "alice"}}
    assert render_template("hello {{ inputs.name }}", ctx) == "hello alice"
