#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use serde::{Deserialize, Serialize};
use std::collections::{HashMap, HashSet};
use std::fs;
use std::io::ErrorKind;
use std::path::{Path, PathBuf};
use std::process::Command;

#[derive(Serialize)]
struct Overview {
    version: String,
    workspace_root: String,
    workflow_count: usize,
    run_count: usize,
    tool_count: usize,
    tools: Vec<String>,
}

#[derive(Serialize)]
struct WorkflowInfo {
    name: String,
    version: i64,
    steps: usize,
    path: String,
}

#[derive(Serialize)]
struct WorkflowDetail {
    name: String,
    version: i64,
    steps: usize,
    path: String,
    inputs: serde_json::Value,
    input_schema: serde_json::Value,
}

#[derive(Serialize)]
struct RunInfo {
    run_id: String,
    workflow: String,
    replay: bool,
    dir: String,
    events_path: Option<String>,
}

#[derive(Serialize)]
struct CommandResult {
    success: bool,
    stdout: String,
    stderr: String,
}

#[derive(Deserialize)]
struct WorkflowYaml {
    name: Option<String>,
    version: Option<i64>,
    steps: Option<Vec<serde_yaml::Value>>,
    inputs: Option<serde_yaml::Value>,
    input_schema: Option<serde_yaml::Value>,
}

#[derive(Deserialize)]
struct RunMeta {
    run_id: Option<String>,
    workflow: Option<String>,
    replay: Option<bool>,
}

fn workspace_root() -> PathBuf {
    if let Ok(root) = std::env::var("EDGEWB_WORKSPACE_ROOT") {
        return PathBuf::from(root);
    }

    let mut dir = std::env::current_dir().unwrap_or_else(|_| PathBuf::from("."));
    for _ in 0..4 {
        if dir.join("workflows").exists() {
            return dir;
        }
        if let Some(parent) = dir.parent() {
            dir = parent.to_path_buf();
        } else {
            break;
        }
    }
    dir
}

fn workflows_dir() -> PathBuf {
    workspace_root().join("workflows")
}

fn out_dir() -> PathBuf {
    workspace_root().join("out")
}

fn builtin_tools() -> Vec<String> {
    vec![
        "file.read_csv",
        "file.read_text",
        "file.write_text",
        "file.write_jsonl",
        "label.apply_rules",
        "doc.extract_outline",
        "util.to_json",
        "viz.render_svg",
    ]
    .into_iter()
    .map(|s| s.to_string())
    .collect()
}

fn edgewb_bin() -> String {
    if let Ok(bin) = std::env::var("EDGEWB_BIN") {
        return bin;
    }
    "edgewb".to_string()
}

fn run_edgewb(args: Vec<String>) -> CommandResult {
    let bin = edgewb_bin();
    let cwd = workspace_root();

    let output = Command::new(&bin)
        .args(args.clone())
        .current_dir(&cwd)
        .output();

    let output = match output {
        Ok(out) => Ok(out),
        Err(e) if e.kind() == ErrorKind::NotFound => {
            let py_path = cwd.join("src");
            let py_output = Command::new("python3")
                .arg("-m")
                .arg("edgewb")
                .args(args.clone())
                .current_dir(&cwd)
                .env("PYTHONPATH", py_path.as_os_str())
                .output();
            match py_output {
                Ok(out) => Ok(out),
                Err(e) if e.kind() == ErrorKind::NotFound => Command::new("python")
                    .arg("-m")
                    .arg("edgewb")
                    .args(args)
                    .current_dir(&cwd)
                    .env("PYTHONPATH", py_path.as_os_str())
                    .output(),
                Err(e) => Err(e),
            }
        }
        Err(e) => Err(e),
    };

    match output {
        Ok(out) => CommandResult {
            success: out.status.success(),
            stdout: String::from_utf8_lossy(&out.stdout).to_string(),
            stderr: String::from_utf8_lossy(&out.stderr).to_string(),
        },
        Err(e) => CommandResult {
            success: false,
            stdout: "".into(),
            stderr: e.to_string(),
        },
    }
}

fn flatten_inputs(prefix: &str, v: &serde_json::Value, out: &mut Vec<(String, String)>) {
    match v {
        serde_json::Value::Object(map) => {
            for (k, val) in map {
                let key = if prefix.is_empty() {
                    k.to_string()
                } else {
                    format!("{}.{}", prefix, k)
                };
                flatten_inputs(&key, val, out);
            }
        }
        serde_json::Value::String(s) => out.push((prefix.to_string(), s.to_string())),
        serde_json::Value::Null => out.push((prefix.to_string(), "null".into())),
        serde_json::Value::Bool(b) => out.push((prefix.to_string(), b.to_string())),
        serde_json::Value::Number(n) => out.push((prefix.to_string(), n.to_string())),
        serde_json::Value::Array(_) => {
            out.push((prefix.to_string(), serde_json::to_string(v).unwrap_or_default()))
        }
    }
}

#[tauri::command]
fn get_overview() -> Overview {
    let workflows = list_workflows();
    let runs = list_runs();
    let tools = builtin_tools();
    Overview {
        version: "0.1.0".into(),
        workspace_root: workspace_root().display().to_string(),
        workflow_count: workflows.len(),
        run_count: runs.len(),
        tool_count: tools.len(),
        tools,
    }
}

#[tauri::command]
fn list_workflows() -> Vec<WorkflowInfo> {
    let mut out = Vec::new();
    let dir = workflows_dir();
    let entries = match fs::read_dir(dir) {
        Ok(entries) => entries,
        Err(_) => return out,
    };
    for entry in entries.flatten() {
        let path = entry.path();
        if path.extension().and_then(|s| s.to_str()) != Some("yaml") {
            continue;
        }
        if let Ok(text) = fs::read_to_string(&path) {
            if let Ok(y) = serde_yaml::from_str::<WorkflowYaml>(&text) {
                let name = y.name.unwrap_or_else(|| {
                    path.file_stem()
                        .and_then(|s| s.to_str())
                        .unwrap_or("workflow")
                        .to_string()
                });
                let version = y.version.unwrap_or(1);
                let steps = y.steps.map(|s| s.len()).unwrap_or(0);
                out.push(WorkflowInfo {
                    name,
                    version,
                    steps,
                    path: path.display().to_string(),
                });
            }
        }
    }
    out
}

#[tauri::command]
fn get_workflow_detail(path: String) -> Option<WorkflowDetail> {
    let p = PathBuf::from(path);
    let text = fs::read_to_string(&p).ok()?;
    let y = serde_yaml::from_str::<WorkflowYaml>(&text).ok()?;
    let name = y
        .name
        .unwrap_or_else(|| p.file_stem().and_then(|s| s.to_str()).unwrap_or("workflow").to_string());
    let version = y.version.unwrap_or(1);
    let steps = y.steps.map(|s| s.len()).unwrap_or(0);
    let inputs_yaml = y.inputs.unwrap_or(serde_yaml::Value::Mapping(Default::default()));
    let inputs = serde_json::to_value(inputs_yaml).unwrap_or(serde_json::json!({}));
    let schema_yaml = y.input_schema.unwrap_or(serde_yaml::Value::Mapping(Default::default()));
    let input_schema = serde_json::to_value(schema_yaml).unwrap_or(serde_json::json!({}));
    Some(WorkflowDetail {
        name,
        version,
        steps,
        path: p.display().to_string(),
        inputs,
        input_schema,
    })
}

fn resolve_output_path(path: String) -> PathBuf {
    let p = PathBuf::from(&path);
    if p.is_absolute() {
        return p;
    }
    workspace_root().join(p)
}

#[tauri::command]
fn export_report(run_dir: String, out_path: String, format: String) -> CommandResult {
    let run_dir = PathBuf::from(run_dir);
    let run_path = run_dir.join("run.json");
    let state_path = run_dir.join("state.json");
    let events_path = run_dir.join("events.jsonl");

    let run_json = fs::read_to_string(run_path).unwrap_or_else(|_| "{}".into());
    let state_json = fs::read_to_string(state_path).unwrap_or_else(|_| "{}".into());

    let mut events = Vec::new();
    if let Ok(text) = fs::read_to_string(events_path) {
        for line in text.lines() {
            if let Ok(v) = serde_json::from_str::<serde_json::Value>(line) {
                events.push(v);
            }
        }
    }

    let mut type_counts: HashMap<String, usize> = HashMap::new();
    let mut step_stats: HashMap<String, serde_json::Value> = HashMap::new();
    let mut step_start: HashMap<String, String> = HashMap::new();
    let mut step_order: Vec<String> = Vec::new();
    let mut step_seen: HashSet<String> = HashSet::new();
    let mut step_errors: HashMap<String, String> = HashMap::new();
    let mut last_error: Option<serde_json::Value> = None;

    for e in &events {
        if let Some(t) = e.get("type").and_then(|v| v.as_str()) {
            *type_counts.entry(t.to_string()).or_insert(0) += 1;
        }
        let step_id = e.get("step_id").and_then(|v| v.as_str()).unwrap_or("(no-step)");
        if e.get("type").and_then(|v| v.as_str()) == Some("step_start") {
            if let Some(ts) = e.get("ts").and_then(|v| v.as_str()) {
                step_start.insert(step_id.to_string(), ts.to_string());
            }
            if !step_seen.contains(step_id) {
                step_order.push(step_id.to_string());
                step_seen.insert(step_id.to_string());
            }
        }
        if e.get("type").and_then(|v| v.as_str()) == Some("error") {
            let err = e.get("error").and_then(|v| v.as_str()).unwrap_or("");
            step_errors.insert(step_id.to_string(), err.to_string());
            last_error = Some(e.clone());
        }
        if e.get("type").and_then(|v| v.as_str()) == Some("step_end") {
            let status = e.get("status").and_then(|v| v.as_str()).unwrap_or("unknown");
            let tool = e.get("tool").and_then(|v| v.as_str()).unwrap_or("");
            let mut duration_ms: Option<i64> = None;
            if let (Some(ts0), Some(ts1)) = (
                step_start.get(step_id).cloned(),
                e.get("ts").and_then(|v| v.as_str()).map(|s| s.to_string()),
            ) {
                if let (Ok(t0), Ok(t1)) = (
                    chrono::DateTime::parse_from_rfc3339(&ts0),
                    chrono::DateTime::parse_from_rfc3339(&ts1),
                ) {
                    duration_ms = Some((t1 - t0).num_milliseconds());
                }
            }
            step_stats.insert(
                step_id.to_string(),
                serde_json::json!({"status": status, "tool": tool, "duration_ms": duration_ms, "error": step_errors.get(step_id)}),
            );
        }
    }

    let mut dir_entries = Vec::new();
    if let Ok(entries) = fs::read_dir(&run_dir) {
        for entry in entries.flatten() {
            if let Ok(meta) = entry.metadata() {
                if meta.is_file() {
                    dir_entries.push(serde_json::json!({
                        "name": entry.file_name().to_string_lossy(),
                        "size": meta.len()
                    }));
                }
            }
        }
    }

    let root_cause = last_error.as_ref().map(|e| {
        serde_json::json!({
            "step_id": e.get("step_id").and_then(|v| v.as_str()),
            "tool": e.get("tool").and_then(|v| v.as_str()),
            "error": e.get("error").and_then(|v| v.as_str()),
            "ts": e.get("ts").and_then(|v| v.as_str())
        })
    });

    let mut failure_path: Vec<String> = Vec::new();
    for step in &step_order {
        failure_path.push(step.clone());
        if let Some(stat) = step_stats.get(step) {
            let status = stat.get("status").and_then(|v| v.as_str()).unwrap_or("unknown");
            let has_err = stat.get("error").and_then(|v| v.as_str()).unwrap_or("") != "";
            if status != "completed" || has_err {
                break;
            }
        }
    }

    let report = serde_json::json!({
        "run": serde_json::from_str::<serde_json::Value>(&run_json).unwrap_or(serde_json::json!({})),
        "state": serde_json::from_str::<serde_json::Value>(&state_json).unwrap_or(serde_json::json!({})),
        "events": events,
        "summary": {
            "dir": dir_entries,
            "event_types": type_counts,
            "steps": step_stats,
            "step_order": step_order,
            "root_cause": root_cause,
            "failure_path": failure_path
        }
    });
    let steps = report
        .get("summary")
        .and_then(|v| v.get("steps"))
        .and_then(|v| v.as_object())
        .cloned()
        .unwrap_or_default();

    let failure_svg = if let Some(summary) = report.get("summary") {
            let path = summary.get("failure_path").and_then(|v| v.as_array()).cloned().unwrap_or_default();
            if path.is_empty() {
                "".into()
            } else {
                let mut nodes = String::new();
                let mut edges = String::new();
                for (i, s) in path.iter().enumerate() {
                    let x = 40 + i * 160;
                    let label = s.as_str().unwrap_or("");
                    let is_last = i == path.len() - 1;
                    let color = if is_last { "#ff6b6b" } else { "#7aa7ff" };
                    let tool = steps
                        .get(label)
                        .and_then(|v| v.get("tool"))
                        .and_then(|v| v.as_str())
                        .unwrap_or("");
                    let dur = steps
                        .get(label)
                        .and_then(|v| v.get("duration_ms"))
                        .and_then(|v| v.as_i64())
                        .unwrap_or(0);
                    nodes.push_str(&format!(
                        "<rect x=\"{}\" y=\"20\" width=\"140\" height=\"60\" rx=\"8\" fill=\"#10162b\" stroke=\"{}\" stroke-width=\"1.2\"/><text x=\"{}\" y=\"42\" fill=\"#e6e8f2\" font-size=\"12\" text-anchor=\"middle\">{}</text><text x=\"{}\" y=\"58\" fill=\"#8a94b8\" font-size=\"10\" text-anchor=\"middle\">{}</text><text x=\"{}\" y=\"72\" fill=\"#8a94b8\" font-size=\"10\" text-anchor=\"middle\">{} ms</text>",
                        x,
                        color,
                        x + 70,
                        html_escape::encode_text(label),
                        x + 70,
                        html_escape::encode_text(tool),
                        x + 70,
                        dur
                    ));
                    if i > 0 {
                        edges.push_str(&format!(
                            "<line x1=\"{}\" y1=\"50\" x2=\"{}\" y2=\"50\" stroke=\"#5b8cff\" stroke-width=\"1.2\" marker-end=\"url(#arrow)\"/>",
                            x - 20,
                            x
                        ));
                    }
                }
                format!(
                    "<h2>Shortest Failure Path</h2><svg width=\"900\" height=\"90\" viewBox=\"0 0 900 90\" xmlns=\"http://www.w3.org/2000/svg\"><defs><marker id=\"arrow\" markerWidth=\"8\" markerHeight=\"8\" refX=\"6\" refY=\"4\" orient=\"auto\"><path d=\"M0,0 L0,8 L8,4 z\" fill=\"#5b8cff\"/></marker></defs>{}{}</svg>",
                    edges,
                    nodes
                )
            }
        } else {
            "".into()
        };

    let out = resolve_output_path(out_path);
    if let Some(parent) = out.parent() {
        let _ = fs::create_dir_all(parent);
    }

    if format == "html" {
        let json_pretty = serde_json::to_string_pretty(&report).unwrap_or_default();
        let summary = report.get("summary").cloned().unwrap_or(serde_json::json!({}));
        let chart = if let Some(map) = summary.get("event_types").and_then(|v| v.as_object()) {
            let max = map.values().filter_map(|v| v.as_u64()).max().unwrap_or(1);
            let bars: String = map
                .iter()
                .map(|(k, v)| {
                    let val = v.as_u64().unwrap_or(0);
                    let pct = (val as f64 / max as f64 * 100.0).round() as u64;
                    format!(
                        "<div style=\"display:grid;grid-template-columns:140px 1fr 40px;gap:8px;margin-bottom:6px;font-size:12px;\"><div style=\"color:#8a94b8\">{}</div><div style=\"background:#0c1224;border:1px solid #253057;border-radius:999px;height:10px;overflow:hidden\"><div style=\"height:100%;background:linear-gradient(90deg,#5b8cff,#7aa7ff);width:{}%\"></div></div><div>{}</div></div>",
                        k, pct, val
                    )
                })
                .collect();
            format!("<h2>Event Type Counts</h2>{}", bars)
        } else {
            "".into()
        };

        let timeline = if let Some(summary) = report.get("summary") {
            let order = summary.get("step_order").and_then(|v| v.as_array()).cloned().unwrap_or_default();
            let steps = summary.get("steps").and_then(|v| v.as_object()).cloned().unwrap_or_default();
            let mut rows = String::new();
            for s in order {
                let key = s.as_str().unwrap_or("");
                let entry = steps.get(key);
                let status = entry.and_then(|v| v.get("status")).and_then(|v| v.as_str()).unwrap_or("unknown");
                let tool = entry.and_then(|v| v.get("tool")).and_then(|v| v.as_str()).unwrap_or("");
                let dur = entry.and_then(|v| v.get("duration_ms")).and_then(|v| v.as_i64()).unwrap_or(0);
                let err = entry.and_then(|v| v.get("error")).and_then(|v| v.as_str()).unwrap_or("");
                let color = if status != "completed" { "#ff6b6b" } else { "#7aa7ff" };
                let err_html = if err.is_empty() { "".to_string() } else { format!("<div style=\"color:#ffb86c;font-size:12px\">{}</div>", html_escape::encode_text(err)) };
                rows.push_str(&format!(
                    "<div style=\"border:1px solid #253057;border-radius:10px;padding:10px;margin-bottom:8px\"><div style=\"color:{};font-weight:600\">{} • {} • {} ms</div>{}</div>",
                    color,
                    html_escape::encode_text(key),
                    html_escape::encode_text(tool),
                    dur,
                    err_html
                ));
            }
            format!("<h2>Step Timeline</h2>{}", rows)
        } else {
            "".into()
        };

        let root_html = if let Some(summary) = report.get("summary") {
            if let Some(root) = summary.get("root_cause") {
                if root.is_null() {
                    "".into()
                } else {
                    let step = root.get("step_id").and_then(|v| v.as_str()).unwrap_or("-");
                    let tool = root.get("tool").and_then(|v| v.as_str()).unwrap_or("-");
                    let err = root.get("error").and_then(|v| v.as_str()).unwrap_or("-");
                    format!(
                        "<h2>Root Cause</h2><div style=\"border:1px solid #ff6b6b;border-radius:10px;padding:12px;color:#ffb86c\">Step: {}<br/>Tool: {}<br/>Error: {}</div>",
                        html_escape::encode_text(step),
                        html_escape::encode_text(tool),
                        html_escape::encode_text(err)
                    )
                }
            } else {
                "".into()
            }
        } else {
            "".into()
        };

        let html = format!(
            "<!doctype html><html><head><meta charset=\"utf-8\"><title>EdgeWB Report</title><style>body{{font-family:ui-sans-serif,system-ui;background:#0b1020;color:#e6e8f2;padding:24px}}pre{{white-space:pre-wrap;background:#10162b;padding:16px;border-radius:12px;border:1px solid #253057}}</style></head><body><h1>Edge LLM Workbench Report</h1>{}{}{}{}<h2>Raw JSON</h2><pre>{}</pre></body></html>",
            chart,
            root_html,
            failure_svg,
            timeline,
            html_escape::encode_text(&json_pretty)
        );
        match fs::write(&out, html) {
            Ok(_) => CommandResult {
                success: true,
                stdout: format!("Report written: {}", out.display()),
                stderr: "".into(),
            },
            Err(e) => CommandResult {
                success: false,
                stdout: "".into(),
                stderr: e.to_string(),
            },
        }
    } else {
        let json = serde_json::to_string_pretty(&report).unwrap_or_default();
        match fs::write(&out, json) {
            Ok(_) => CommandResult {
                success: true,
                stdout: format!("Report written: {}", out.display()),
                stderr: "".into(),
            },
            Err(e) => CommandResult {
                success: false,
                stdout: "".into(),
                stderr: e.to_string(),
            },
        }
    }
}

#[tauri::command]
fn list_runs() -> Vec<RunInfo> {
    let mut out = Vec::new();
    let dir = out_dir();
    if !dir.exists() {
        return out;
    }

    let mut candidates: Vec<PathBuf> = vec![dir.clone()];
    if let Ok(entries) = fs::read_dir(&dir) {
        for entry in entries.flatten() {
            if entry.path().is_dir() {
                candidates.push(entry.path());
            }
        }
    }

    for run_dir in candidates {
        let meta_path = run_dir.join("run.json");
        if !meta_path.exists() {
            continue;
        }
        if let Ok(text) = fs::read_to_string(&meta_path) {
            if let Ok(meta) = serde_json::from_str::<RunMeta>(&text) {
                let events_path = run_dir.join("events.jsonl");
                out.push(RunInfo {
                    run_id: meta.run_id.unwrap_or_default(),
                    workflow: meta.workflow.unwrap_or_default(),
                    replay: meta.replay.unwrap_or(false),
                    dir: run_dir.display().to_string(),
                    events_path: if events_path.exists() {
                        Some(events_path.display().to_string())
                    } else {
                        None
                    },
                });
            }
        }
    }

    out
}

#[tauri::command]
fn run_workflow(workflow_path: String, out_dir: String, inputs_json: String) -> CommandResult {
    let mut args = vec!["run".to_string(), workflow_path, "--out".to_string(), out_dir];

    if let Ok(v) = serde_json::from_str::<serde_json::Value>(&inputs_json) {
        let mut flat = Vec::new();
        flatten_inputs("inputs", &v, &mut flat);
        for (k, val) in flat {
            let encoded = if val.starts_with('{') || val.starts_with('[') {
                val
            } else {
                val
            };
            args.push("--set".to_string());
            args.push(format!("{}={}", k, encoded));
        }
    }

    run_edgewb(args)
}

#[tauri::command]
fn replay_run(out_dir: String) -> CommandResult {
    run_edgewb(vec!["replay".to_string(), out_dir])
}

#[tauri::command]
fn get_events(run_dir: String) -> Vec<serde_json::Value> {
    let path = Path::new(&run_dir).join("events.jsonl");
    let mut out = Vec::new();
    if let Ok(text) = fs::read_to_string(path) {
        for line in text.lines() {
            if let Ok(v) = serde_json::from_str::<serde_json::Value>(line) {
                out.push(v);
            }
        }
    }
    out
}

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            get_overview,
            list_workflows,
            get_workflow_detail,
            list_runs,
            run_workflow,
            replay_run,
            get_events,
            export_report
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
