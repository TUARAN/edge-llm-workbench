import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";

type Lang = "zh" | "en";

const translations: Record<Lang, Record<string, string>> = {
  zh: {
    app_title: "Edge LLM Workbench 桌面端",
    app_name: "Edge LLM Workbench",
    app_subtitle: "离线 • 私有 • 可审计",
    lang_label: "语言",
    tab_overview: "概览",
    tab_workflows: "工作流",
    tab_runs: "运行记录",
    tab_architecture: "架构",
    overview_project_snapshot: "项目概览",
    overview_version: "版本",
    overview_workspace: "工作区",
    overview_workflows: "工作流",
    overview_runs: "运行",
    overview_tools: "工具",
    overview_builtin_tools: "内置工具",
    common_path: "路径",
    common_steps: "步骤",
    common_default: "默认值",
    workflows_run_workflow: "运行工作流",
    workflows_workflow: "工作流",
    workflows_output_dir: "输出目录",
    workflows_inputs: "输入",
    workflows_steps_suffix: "{count} 步",
    workflows_run: "运行",
    workflows_replay: "回放",
    workflows_idle: "空闲",
    workflows_progress: "进度：{done}/{total} {status}",
    workflows_no_inputs: "未定义输入",
    workflows_browse: "上传",
    workflows_running: "运行中...",
    workflows_replaying: "回放中...",
    workflows_ok: "成功",
    workflows_failed: "失败",
    workflows_status_last: "(最近: {type}{step}{elapsed})",
    runs_no_runs: "暂无运行记录",
    runs_no_runs_hint: "运行任意工作流以查看审计日志。",
    runs_events_timeline: "事件时间线",
    runs_load_events: "加载事件",
    runs_search_events: "搜索事件...",
    runs_all_types: "全部类型",
    runs_custom: "自定义",
    runs_export_svg: "导出 SVG",
    runs_export_png: "导出 PNG",
    runs_export_report: "导出报告",
    runs_export: "导出",
    runs_filter: "运行过滤",
    runs_filter_placeholder: "按工作流/运行ID过滤",
    runs_run_id: "运行ID",
    runs_dir: "目录",
    runs_replay: "回放",
    runs_events: "事件",
    runs_missing: "(缺失)",
    runs_no_events: "未找到事件。",
    runs_event_type_counts: "事件类型统计",
    runs_event_timeline: "事件时间线",
    runs_step_event_counts: "步骤事件统计",
    runs_event_stats: "事件统计",
    runs_events_count: "{count} 个事件",
    runs_no_step: "(无步骤)",
    runs_event: "事件",
    dialog_unavailable: "文件选择仅在桌面端可用。",
    dialog_failed: "打开文件选择失败：{message}",
    dialog_opening: "正在打开文件选择...",
    architecture_layered: "分层架构",
    architecture_ui: "界面（桌面端）",
    architecture_app_service: "应用服务",
    architecture_orchestrator: "编排器",
    architecture_llm_gateway: "LLM 网关",
    architecture_tools_runtime: "工具运行时",
    architecture_local_data: "本地数据",
    architecture_note: "Planner 负责决策与计划；Tools 负责确定性执行与审计。",
    architecture_contracts: "执行契约",
    architecture_contracts_note: "每个 Tool 有严格的 JSON Schema 输入输出，运行事件写入 events.jsonl，可回放。",
    general_error: "错误：{message}"
  },
  en: {
    app_title: "Edge LLM Workbench Desktop",
    app_name: "Edge LLM Workbench",
    app_subtitle: "Offline • Private • Auditable",
    lang_label: "Language",
    tab_overview: "Overview",
    tab_workflows: "Workflows",
    tab_runs: "Runs",
    tab_architecture: "Architecture",
    overview_project_snapshot: "Project Snapshot",
    overview_version: "Version",
    overview_workspace: "Workspace",
    overview_workflows: "Workflows",
    overview_runs: "Runs",
    overview_tools: "Tools",
    overview_builtin_tools: "Builtin Tools",
    common_path: "Path",
    common_steps: "Steps",
    common_default: "default",
    workflows_run_workflow: "Run Workflow",
    workflows_workflow: "Workflow",
    workflows_output_dir: "Output Dir",
    workflows_inputs: "Inputs",
    workflows_steps_suffix: "{count} steps",
    workflows_run: "Run",
    workflows_replay: "Replay",
    workflows_idle: "Idle",
    workflows_progress: "Progress: {done}/{total} {status}",
    workflows_no_inputs: "No inputs defined",
    workflows_browse: "Upload",
    workflows_running: "Running...",
    workflows_replaying: "Replaying...",
    workflows_ok: "OK",
    workflows_failed: "FAILED",
    workflows_status_last: "(last: {type}{step}{elapsed})",
    runs_no_runs: "No runs yet",
    runs_no_runs_hint: "Run any workflow to see audit logs.",
    runs_events_timeline: "Events Timeline",
    runs_load_events: "Load Events",
    runs_search_events: "Search events...",
    runs_all_types: "All types",
    runs_custom: "Custom",
    runs_export_svg: "Export SVG",
    runs_export_png: "Export PNG",
    runs_export_report: "Export Report",
    runs_export: "Export",
    runs_filter: "Run Filter",
    runs_filter_placeholder: "Filter by workflow/run id",
    runs_run_id: "Run ID",
    runs_dir: "Dir",
    runs_replay: "Replay",
    runs_events: "Events",
    runs_missing: "(missing)",
    runs_no_events: "No events found.",
    runs_event_type_counts: "Event Type Counts",
    runs_event_timeline: "Event Timeline",
    runs_step_event_counts: "Step Event Counts",
    runs_event_stats: "Event Stats",
    runs_events_count: "{count} events",
    runs_no_step: "(no-step)",
    runs_event: "event",
    dialog_unavailable: "File picker is only available in the desktop app.",
    dialog_failed: "Failed to open file dialog: {message}",
    dialog_opening: "Opening file dialog...",
    architecture_layered: "Layered Architecture",
    architecture_ui: "UI (Desktop)",
    architecture_app_service: "App Service",
    architecture_orchestrator: "Orchestrator",
    architecture_llm_gateway: "LLM Gateway",
    architecture_tools_runtime: "Tools Runtime",
    architecture_local_data: "Local Data",
    architecture_note: "Planner handles planning; Tools handle deterministic execution and audit.",
    architecture_contracts: "Execution Contracts",
    architecture_contracts_note: "Each Tool has strict JSON Schema I/O; events are written to events.jsonl for replay.",
    general_error: "Error: {message}"
  }
};

let currentLang: Lang = (localStorage.getItem("edgewb.lang") as Lang) || "zh";

function t(key: string, vars?: Record<string, string | number>) {
  const table = translations[currentLang] || translations.en;
  const fallback = translations.en[key] || key;
  const text = table[key] || fallback;
  return text.replace(/\{(\w+)\}/g, (_, k) => String(vars?.[k] ?? ""));
}

function updateStaticText() {
  document.documentElement.lang = currentLang;
  document.title = t("app_title");
  document.querySelectorAll<HTMLElement>("[data-i18n]").forEach((el) => {
    const key = el.dataset.i18n;
    if (key) el.textContent = t(key);
  });
  document.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>("[data-i18n-placeholder]").forEach((el) => {
    const key = el.dataset.i18nPlaceholder;
    if (key) el.placeholder = t(key);
  });
}

function setLang(lang: Lang) {
  currentLang = lang;
  localStorage.setItem("edgewb.lang", lang);
  updateStaticText();
}

const tabs = document.querySelectorAll<HTMLButtonElement>(".tab");
const contents = new Map<string, HTMLElement>();
["overview", "workflows", "runs", "architecture"].forEach((id) => {
  const el = document.getElementById(id) as HTMLElement;
  contents.set(id, el);
});

let activeTab = "overview";

function setActive(tabId: string) {
  activeTab = tabId;
  tabs.forEach((tab) => {
    tab.classList.toggle("active", tab.dataset.tab === tabId);
  });
  contents.forEach((el, id) => {
    el.classList.toggle("hidden", id !== tabId);
  });
}

tabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    setActive(tab.dataset.tab || "overview");
  });
});

async function loadOverview() {
  const data = await invoke<any>("get_overview");
  const el = contents.get("overview")!;
  el.innerHTML = `
    <div class="card">
      <div class="card-title">${t("overview_project_snapshot")}</div>
      <div class="kv">
        <div>${t("overview_version")}</div><div>${data.version}</div>
        <div>${t("overview_workspace")}</div><div>${data.workspace_root}</div>
        <div>${t("overview_workflows")}</div><div>${data.workflow_count}</div>
        <div>${t("overview_runs")}</div><div>${data.run_count}</div>
        <div>${t("overview_tools")}</div><div>${data.tool_count}</div>
      </div>
    </div>
    <div class="card">
      <div class="card-title">${t("overview_builtin_tools")}</div>
      <div>${data.tools.map((t: string) => `<span class="badge">${t}</span>`).join("")}</div>
    </div>
  `;
}

async function loadWorkflows() {
  const list = await invoke<any[]>("list_workflows");
  const el = contents.get("workflows")!;
  const options = list
    .map(
      (wf) =>
        `<option value="${wf.path}">${wf.name} (${t("workflows_steps_suffix", { count: wf.steps })})</option>`
    )
    .join("");
  el.innerHTML = `
    <div class="card">
      <div class="card-title">${t("workflows_run_workflow")}</div>
      <div class="kv">
        <div>${t("workflows_workflow")}</div>
        <div>
          <select id="wf-select">${options}</select>
        </div>
        <div>${t("workflows_output_dir")}</div>
        <div><input id="wf-out" value="out/ui" /></div>
        <div>${t("workflows_inputs")}</div>
        <div id="wf-form"></div>
      </div>
      <div class="progress">
        <div class="progress-bar" id="wf-progress"></div>
      </div>
      <div class="small" id="wf-progress-text">${t("workflows_idle")}</div>
      <div class="row">
        <button class="btn" id="wf-run">${t("workflows_run")}</button>
        <button class="btn secondary" id="wf-replay">${t("workflows_replay")}</button>
      </div>
      <pre id="wf-output"></pre>
    </div>
    ${list
      .map(
        (wf) => `
        <div class="card">
          <div class="card-title">${wf.name}</div>
          <div class="kv">
            <div>${t("overview_version")}</div><div>${wf.version}</div>
            <div>${t("common_path")}</div><div>${wf.path}</div>
            <div>${t("common_steps")}</div><div>${wf.steps}</div>
          </div>
        </div>
      `
      )
      .join("")}
  `;

  const runBtn = document.getElementById("wf-run") as HTMLButtonElement;
  const replayBtn = document.getElementById("wf-replay") as HTMLButtonElement;
  const outEl = document.getElementById("wf-out") as HTMLInputElement;
  const selectEl = document.getElementById("wf-select") as HTMLSelectElement;
  const outputEl = document.getElementById("wf-output") as HTMLElement;
  const formEl = document.getElementById("wf-form") as HTMLElement;
  const progressEl = document.getElementById("wf-progress") as HTMLElement;
  const progressText = document.getElementById("wf-progress-text") as HTMLElement;

  let currentWorkflow: any | null = null;
  let currentStepStartTs: number | null = null;
  let pickerBound = false;

  function assignNested(target: Record<string, any>, path: string, value: any) {
    const parts = path.split(".");
    let cur: any = target;
    for (const p of parts.slice(0, -1)) {
      if (!cur[p] || typeof cur[p] !== "object") cur[p] = {};
      cur = cur[p];
    }
    cur[parts[parts.length - 1]] = value;
  }

  function getNested(target: Record<string, any>, path: string) {
    const parts = path.split(".");
    let cur: any = target;
    for (const p of parts) {
      if (cur == null || typeof cur !== "object") return undefined;
      cur = cur[p];
    }
    return cur;
  }

  function flattenFormValues(container: HTMLElement) {
    const inputs: Record<string, any> = {};
    container
      .querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>("[data-key]")
      .forEach((el) => {
        const key = el.dataset.key as string;
        if (el instanceof HTMLInputElement && el.dataset.multi === "1") {
          const existing = (getNested(inputs, key) as any[]) || [];
          if (el.checked) {
            existing.push(el.value);
          }
          assignNested(inputs, key, existing);
          return;
        }
        let val: any = el.value;
        if (el instanceof HTMLInputElement && el.type === "checkbox") {
          val = el.checked;
        }
        if (el instanceof HTMLInputElement && el.type === "number") {
          val = el.value === "" ? null : Number(el.value);
        }
        assignNested(inputs, key, val);
      });
    return inputs;
  }

  function setProgress(done: number, total: number, status?: string) {
    const pct = total ? Math.min(100, Math.round((done / total) * 100)) : 0;
    progressEl.style.width = `${pct}%`;
    progressText.textContent = total
      ? t("workflows_progress", { done, total, status: status || "" })
      : t("workflows_idle");
  }

  function collectRequiredPaths(schema: any, path = ""): Set<string> {
    const req = new Set<string>();
    if (!schema || typeof schema !== "object") return req;
    if (schema.type === "object" && schema.properties) {
      const required = schema.required || [];
      for (const key of required) {
        const p = path ? `${path}.${key}` : key;
        req.add(p);
      }
      for (const [key, prop] of Object.entries(schema.properties)) {
        const child = collectRequiredPaths(prop, path ? `${path}.${key}` : key);
        child.forEach((p) => req.add(p));
      }
    }
    return req;
  }

  function renderInputFromSchema(
    schema: any,
    path = "",
    defaults: Record<string, any> = {},
    requiredPaths: Set<string>
  ): string {
    if (!schema || typeof schema !== "object") return "";
    if (schema.type === "object" && schema.properties) {
      const fields = Object.entries(schema.properties)
        .map(([key, prop]) =>
          renderInputFromSchema(prop as any, path ? `${path}.${key}` : key, defaults, requiredPaths)
        )
        .join("");
      const title = path ? path : t("workflows_inputs");
      return `
        <div class="fieldset">
          <div class="fieldset-title">${title}</div>
          ${fields}
        </div>
      `;
    }

    const label = schema.title || path;
    const desc = schema.description ? `<div class="small">${schema.description}</div>` : "";
    const def = defaults[path] ?? schema.default ?? "";
    const defHint =
      schema.default !== undefined
        ? `<div class="small">${t("common_default")}: ${schema.default}</div>`
        : "";
    const isRequired = requiredPaths.has(path);
    const requiredMark = isRequired ? `<span class="req">*</span>` : "";
    const rangeAttrs = [
      schema.minimum !== undefined ? `min=\"${schema.minimum}\"` : "",
      schema.maximum !== undefined ? `max=\"${schema.maximum}\"` : "",
    ].join(" ");
    const patternAttr = schema.pattern ? `pattern=\"${schema.pattern}\" data-pattern=\"${schema.pattern}\"` : "";
    let patternMessage = "";
    if (schema.patternMessage) {
      if (typeof schema.patternMessage === "string") {
        patternMessage = schema.patternMessage;
      } else if (typeof schema.patternMessage === "object") {
        const lang = currentLang.toLowerCase();
        patternMessage =
          schema.patternMessage[lang] ||
          schema.patternMessage[lang.split("-")[0]] ||
          schema.patternMessage["en"] ||
          "";
      }
    }
    const patternMsgEl = patternMessage
      ? `<div class="small error hidden" data-error-for="${path}">${patternMessage}</div>`
      : "";

    if (schema.enum || (schema.type === "array" && schema.items && schema.items.enum)) {
      if (schema.type === "array") {
        const values = schema.enum || schema.items?.enum || [];
        const options = values
          .map(
            (v: any) =>
              `<label class=\"row\"><input type=\"checkbox\" data-key=\"${path}\" data-multi=\"1\" value=\"${v}\" ${Array.isArray(def) && def.includes(v) ? "checked" : ""}/> ${v}</label>`
          )
          .join("");
        return `
          <div class="fieldset">
            <div class="fieldset-title">${label}${requiredMark}</div>
            ${options}
            ${desc}
            ${defHint}
          </div>
        `;
      }
      const options = schema.enum
        .map((v: any) => `<option value="${v}" ${String(v) === String(def) ? "selected" : ""}>${v}</option>`)
        .join("");
      return `
        <div class="row">
          <div class="small" style="width:140px">${label}${requiredMark}</div>
          <select data-key="${path}" class="${isRequired ? "required" : ""}">${options}</select>
          ${desc}
          ${defHint}
        </div>
      `;
    }

    if (schema.type === "boolean") {
      return `<label class="row"><input type="checkbox" data-key="${path}" ${def ? "checked" : ""}/> ${label}${requiredMark}</label>`;
    }

    const isNumber = schema.type === "number" || schema.type === "integer";
    const isFile = schema.format === "path" || schema.format === "file";
    const isDir = schema.format === "directory";
    const picker = isFile || isDir
      ? `<button class="btn secondary small" data-picker="${path}">${t("workflows_browse")}</button>`
      : "";
    const formatAttr = isDir ? "data-format=\"directory\"" : isFile ? "data-format=\"file\"" : "";
    return `
      <div class="row">
        <div class="small" style="width:140px">${label}${requiredMark}</div>
        <input data-key="${path}" ${formatAttr} class="${isRequired ? "required" : ""}" ${isNumber ? "type=\"number\"" : ""} ${rangeAttrs} ${patternAttr} value="${def}" />
        ${picker}
      </div>
      ${desc}
      ${defHint}
      ${patternMsgEl}
    `;
  }

  function renderInputRow(key: string, value: any, prefix = ""): string {
    const path = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === "object" && !Array.isArray(value)) {
      const children = Object.entries(value)
        .map(([k, v]) => renderInputRow(k, v, path))
        .join("");
      return `
        <div class="fieldset">
          <div class="fieldset-title">${path}</div>
          ${children}
        </div>
      `;
    }
    if (typeof value === "boolean") {
      return `<label class="row"><input type="checkbox" data-key="${path}" ${value ? "checked" : ""}/> ${path}</label>`;
    }
    const isNumber = typeof value === "number";
    const val = value ?? "";
    return `
      <div class="row">
        <div class="small" style="width:140px">${path}</div>
        <input data-key="${path}" ${isNumber ? "type=\"number\"" : ""} value="${val}" />
      </div>
    `;
  }

  async function renderForm() {
    const detail = await invoke<any>("get_workflow_detail", { path: selectEl.value });
    currentWorkflow = detail;
    const inputs = detail?.inputs || {};
    const schema = detail?.input_schema || null;
    if (schema && Object.keys(schema).length) {
      const requiredPaths = collectRequiredPaths(schema);
      formEl.innerHTML = renderInputFromSchema(schema, "", inputs, requiredPaths);
    } else {
      const rows = Object.entries(inputs).map(([k, v]) => renderInputRow(k, v));
      formEl.innerHTML = rows.join("") || `<div class="small">${t("workflows_no_inputs")}</div>`;
    }
    setProgress(0, detail?.steps || 0, t("workflows_idle"));

    if (!pickerBound) {
      formEl.addEventListener("click", async (evt) => {
        const target = evt.target as HTMLElement | null;
        const btn = target?.closest<HTMLButtonElement>("[data-picker]");
        if (!btn) return;
        const key = btn.dataset.picker as string;
        const input = formEl.querySelector<HTMLInputElement>(`[data-key=\"${key}\"]`);
        const isDir = input?.dataset.format === "directory";
        outputEl.textContent = t("dialog_opening");
        try {
          const selected = await open({ multiple: false, directory: isDir });
          const picked = Array.isArray(selected) ? selected[0] : selected;
          if (picked) {
            let value = String(picked);
            if (value.startsWith("file://")) {
              try {
                value = decodeURIComponent(value.replace("file://", ""));
              } catch {
                value = value.replace("file://", "");
              }
            }
            if (input) input.value = value;
          }
        } catch (err) {
          const msg = err ? String(err) : "";
          const hint = msg.includes("not available") || msg.includes("tauri")
            ? t("dialog_unavailable")
            : t("dialog_failed", { message: msg });
          alert(hint);
        }
      });
      pickerBound = true;
    }

    formEl.querySelectorAll<HTMLInputElement>("[data-pattern]").forEach((input) => {
      const pattern = input.dataset.pattern;
      if (!pattern) return;
      const re = new RegExp(pattern);
      const validate = () => {
        const ok = re.test(input.value || "");
        input.classList.toggle("invalid", !ok && input.value !== "");
        const msg = formEl.querySelector<HTMLElement>(`[data-error-for=\"${input.dataset.key}\"]`);
        if (msg) msg.classList.toggle("hidden", ok || input.value === "");
      };
      input.addEventListener("input", validate);
      validate();
    });
  }

  selectEl.addEventListener("change", renderForm);
  await renderForm();

  async function pollEvents(outDir: string, totalSteps: number, stopSignal: { stop: boolean }) {
    while (!stopSignal.stop) {
      const events = await invoke<any[]>("get_events", { runDir: outDir });
      const completed = events.filter((e) => e.type === "step_end" && e.status === "completed").length;
      const last = events[events.length - 1];
      if (last?.type === "step_start") {
        currentStepStartTs = Date.parse(last.ts || "") || Date.now();
      }
      if (last?.type === "step_end") {
        currentStepStartTs = null;
      }
      const elapsed = currentStepStartTs ? ` • ${Math.max(0, Date.now() - currentStepStartTs)} ms` : "";
      const stepSuffix = last?.step_id ? ` / ${last.step_id}` : "";
      const status = last ? t("workflows_status_last", { type: last.type, step: stepSuffix, elapsed }) : "";
      setProgress(completed, totalSteps, status);
      await new Promise((r) => setTimeout(r, 700));
    }
  }

  runBtn.addEventListener("click", async () => {
    outputEl.textContent = t("workflows_running");
    const inputs = flattenFormValues(formEl);
    const totalSteps = currentWorkflow?.steps || 0;
    const stopSignal = { stop: false };
    pollEvents(outEl.value, totalSteps, stopSignal);
    const res = await invoke<any>("run_workflow", {
      workflowPath: selectEl.value,
      outDir: outEl.value,
      inputsJson: JSON.stringify(inputs)
    });
    stopSignal.stop = true;
    outputEl.textContent = `${res.success ? t("workflows_ok") : t("workflows_failed")}\n${res.stdout}\n${res.stderr}`;
    await loadRuns();
  });

  replayBtn.addEventListener("click", async () => {
    outputEl.textContent = t("workflows_replaying");
    const totalSteps = currentWorkflow?.steps || 0;
    const stopSignal = { stop: false };
    pollEvents(outEl.value, totalSteps, stopSignal);
    const res = await invoke<any>("replay_run", { outDir: outEl.value });
    stopSignal.stop = true;
    outputEl.textContent = `${res.success ? t("workflows_ok") : t("workflows_failed")}\n${res.stdout}\n${res.stderr}`;
    await loadRuns();
  });
}

async function loadRuns() {
  const list = await invoke<any[]>("list_runs");
  const el = contents.get("runs")!;
  if (!list.length) {
    el.innerHTML = `<div class="card"><div class="card-title">${t("runs_no_runs")}</div><div class="small">${t("runs_no_runs_hint")}</div></div>`;
    return;
  }
  const options = list.map((r) => `<option value="${r.dir}">${r.workflow}</option>`).join("");
  el.innerHTML = `
    <div class="card">
      <div class="card-title">${t("runs_events_timeline")}</div>
      <div class="row">
        <select id="run-select">${options}</select>
        <button class="btn" id="run-load">${t("runs_load_events")}</button>
      </div>
      <div class="row">
        <input id="run-search" placeholder="${t("runs_search_events")}" />
        <select id="event-type">
          <option value="">${t("runs_all_types")}</option>
          <option value="step_start">step_start</option>
          <option value="tool_call">tool_call</option>
          <option value="tool_result">tool_result</option>
          <option value="step_end">step_end</option>
          <option value="error">error</option>
          <option value="replay">replay</option>
        </select>
        <select id="time-window">
          <option value="5000">5s</option>
          <option value="60000">1m</option>
          <option value="300000">5m</option>
          <option value="custom">${t("runs_custom")}</option>
        </select>
        <input id="time-custom" type="number" min="1000" step="1000" value="5000" />
      </div>
      <div class="row">
        <button class="btn secondary" id="export-svg">${t("runs_export_svg")}</button>
        <button class="btn secondary" id="export-png">${t("runs_export_png")}</button>
      </div>
      <div id="stats"></div>
      <div id="events"></div>
    </div>
    <div class="card">
      <div class="card-title">${t("runs_export_report")}</div>
      <div class="row">
        <input id="report-path" value="out/report.json" />
        <select id="report-format">
          <option value="json">json</option>
          <option value="html">html</option>
        </select>
        <button class="btn" id="report-export">${t("runs_export")}</button>
      </div>
      <pre id="report-output"></pre>
    </div>
    <div class="card">
      <div class="card-title">${t("runs_filter")}</div>
      <div class="row">
        <input id="runs-filter" placeholder="${t("runs_filter_placeholder")}" />
      </div>
    </div>
    ${list
      .map(
        (run) => `
        <div class="card">
          <div class="card-title">${run.workflow}</div>
          <div class="kv">
            <div>${t("runs_run_id")}</div><div>${run.run_id}</div>
            <div>${t("runs_dir")}</div><div>${run.dir}</div>
            <div>${t("runs_replay")}</div><div>${run.replay}</div>
          </div>
          <div class="small">${t("runs_events")}: ${run.events_path || t("runs_missing")}</div>
        </div>
      `
      )
      .join("")}
  `;

  const runSelect = document.getElementById("run-select") as HTMLSelectElement;
  const runLoad = document.getElementById("run-load") as HTMLButtonElement;
  const eventsEl = document.getElementById("events") as HTMLElement;
  const statsEl = document.getElementById("stats") as HTMLElement;
  const runSearch = document.getElementById("run-search") as HTMLInputElement;
  const eventType = document.getElementById("event-type") as HTMLSelectElement;
  const timeWindow = document.getElementById("time-window") as HTMLSelectElement;
  const timeCustom = document.getElementById("time-custom") as HTMLInputElement;
  const runsFilter = document.getElementById("runs-filter") as HTMLInputElement;
  const reportPath = document.getElementById("report-path") as HTMLInputElement;
  const reportFormat = document.getElementById("report-format") as HTMLSelectElement;
  const reportExport = document.getElementById("report-export") as HTMLButtonElement;
  const reportOutput = document.getElementById("report-output") as HTMLElement;
  const exportSvgBtn = document.getElementById("export-svg") as HTMLButtonElement;
  const exportPngBtn = document.getElementById("export-png") as HTMLButtonElement;

  let lastEvents: any[] = [];
  function groupByStep(events: any[]) {
    const groups: Record<string, any[]> = {};
    events.forEach((e) => {
      const key = e.step_id || t("runs_no_step");
      if (!groups[key]) groups[key] = [];
      groups[key].push(e);
    });
    return groups;
  }

  function computeDurations(events: any[]) {
    const start: Record<string, string> = {};
    const duration: Record<string, string> = {};
    events.forEach((e) => {
      if (e.type === "step_start") start[e.step_id] = e.ts;
      if (e.type === "step_end" && start[e.step_id]) {
        const t0 = Date.parse(start[e.step_id]);
        const t1 = Date.parse(e.ts || "");
        if (!Number.isNaN(t0) && !Number.isNaN(t1)) {
          duration[e.step_id] = `${Math.max(0, t1 - t0)} ms`;
        }
      }
    });
    return duration;
  }

  function renderStats(events: any[]) {
    const typeCounts: Record<string, number> = {};
    const stepCounts: Record<string, number> = {};
    events.forEach((e) => {
      const typeName = e.type || "event";
      typeCounts[typeName] = (typeCounts[typeName] || 0) + 1;
      const s = e.step_id || t("runs_no_step");
      stepCounts[s] = (stepCounts[s] || 0) + 1;
    });
    const renderBars = (data: Record<string, number>) => {
      const max = Math.max(1, ...Object.values(data));
      const bars = Object.entries(data)
        .map(
          ([k, v], i) => `
          <div class="bar">
            <div class="bar-label">${k}</div>
            <div class="bar-track">
              <div class="bar-fill" style="width:${Math.round((v / max) * 100)}%"></div>
            </div>
            <div class="bar-value">${v}</div>
          </div>
        `
        )
        .join("");
      return bars;
    };
    const renderTimeline = () => {
      const windowMs = timeWindow.value === "custom" ? Number(timeCustom.value) || 5000 : Number(timeWindow.value) || 5000;
      const buckets: Record<string, number> = {};
      events.forEach((e) => {
        if (!e.ts) return;
        const ts = Date.parse(e.ts);
        if (Number.isNaN(ts)) return;
        const bucket = Math.floor(ts / windowMs) * windowMs;
        buckets[bucket] = (buckets[bucket] || 0) + 1;
      });
      const keys = Object.keys(buckets).map(Number).sort((a, b) => a - b);
      if (!keys.length) return "";
      const max = Math.max(...Object.values(buckets));
      const width = 720;
      const height = 120;
      const minT = keys[0];
      const maxT = keys[keys.length - 1];
      const span = Math.max(1, maxT - minT);
      const points = keys
        .map((k) => {
          const x = ((k - minT) / span) * (width - 20) + 10;
          const y = height - (buckets[k] / max) * (height - 20) - 10;
          return `${x.toFixed(1)},${y.toFixed(1)}`;
        })
        .join(" ");
      return `
        <svg class="spark" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
          <polyline points="${points}" fill="none" stroke="#5b8cff" stroke-width="2" />
        </svg>
      `;
    };

    statsEl.innerHTML = `
      <div class="card">
        <div class="card-title">${t("runs_event_type_counts")}</div>
        ${renderBars(typeCounts)}
      </div>
      <div class="card">
        <div class="card-title">${t("runs_event_timeline")}</div>
        ${renderTimeline()}
      </div>
      <div class="card">
        <div class="card-title">${t("runs_step_event_counts")}</div>
        ${renderBars(stepCounts)}
      </div>
    `;
  }

  async function loadEvents() {
    const events = await invoke<any[]>("get_events", { runDir: runSelect.value });
    lastEvents = events;
    if (!events.length) {
      eventsEl.innerHTML = `<div class="small">${t("runs_no_events")}</div>`;
      return;
    }
    const q = runSearch.value.trim().toLowerCase();
    const type = eventType.value;
    const filtered = events.filter((e) => {
      if (type && e.type !== type) return false;
      if (!q) return true;
      return JSON.stringify(e).toLowerCase().includes(q);
    });
    const durations = computeDurations(events);
    renderStats(events);
    const groups = groupByStep(filtered);
    eventsEl.innerHTML = Object.entries(groups)
      .map(([step, es]) => {
        const header = `${step} ${durations[step] ? `• ${durations[step]}` : ""}`;
        const items = es
          .map(
            (e) => `
          <div class="timeline-item">
            <div class="small">${e.ts || "-"} • ${e.type || t("runs_event")} ${e.tool ? `• ${e.tool}` : ""}</div>
            <pre>${JSON.stringify(e, null, 2)}</pre>
          </div>
        `
          )
          .join("");
        return `
        <details class="card" open>
          <summary class="card-title">${header} <span class="small">(${t("runs_events_count", { count: es.length })})</span></summary>
          ${items}
        </details>
      `;
      })
      .join("");
  }

  runLoad.addEventListener("click", loadEvents);
  runSearch.addEventListener("input", loadEvents);
  eventType.addEventListener("change", loadEvents);
  timeWindow.addEventListener("change", loadEvents);
  timeCustom.addEventListener("input", () => {
    if (timeWindow.value === "custom") loadEvents();
  });

  runsFilter.addEventListener("input", () => {
    const q = runsFilter.value.trim().toLowerCase();
    const cards = Array.from(el.querySelectorAll<HTMLElement>(".card"));
    cards.forEach((card) => {
      if (card.querySelector("#run-select") || card.querySelector("#runs-filter")) {
        return;
      }
      const text = card.textContent?.toLowerCase() || "";
      card.style.display = q && !text.includes(q) ? "none" : "block";
    });
  });

  reportExport.addEventListener("click", async () => {
    reportOutput.textContent = "Exporting...";
    const res = await invoke<any>("export_report", {
      runDir: runSelect.value,
      outPath: reportPath.value,
      format: reportFormat.value
    });
    reportOutput.textContent = `${res.success ? "OK" : "FAILED"}\n${res.stdout}\n${res.stderr}`;
  });

  function exportChartSvg() {
    const style = `
      <style>
        body { font-family: system-ui; color: #e6e8f2; background: #0b1020; }
        .card { border: 1px solid #253057; border-radius: 12px; padding: 12px 14px; margin-bottom: 10px; background: #10162b; }
        .card-title { font-weight: 600; margin-bottom: 6px; }
        .bar { display: grid; grid-template-columns: 140px 1fr 40px; gap: 10px; align-items: center; margin-bottom: 6px; font-size: 12px; }
        .bar-track { background: #0c1224; border: 1px solid #253057; border-radius: 999px; height: 10px; overflow: hidden; }
        .bar-fill { height: 100%; background: linear-gradient(90deg, #5b8cff, #7aa7ff); }
        .bar-label { color: #8a94b8; }
      </style>
    `;
    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" width="960" height="540">
        <foreignObject x="0" y="0" width="960" height="540">
          <div xmlns="http://www.w3.org/1999/xhtml" style="padding:16px;">
            ${style}
            <h2>${t("runs_event_stats")}</h2>
            ${statsEl.innerHTML}
          </div>
        </foreignObject>
      </svg>
    `;
    const blob = new Blob([svg], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "event-stats.svg";
    a.click();
    URL.revokeObjectURL(url);
  }

  function exportChartPng() {
    const style = `
      <style>
        body { font-family: system-ui; color: #e6e8f2; background: #0b1020; }
        .card { border: 1px solid #253057; border-radius: 12px; padding: 12px 14px; margin-bottom: 10px; background: #10162b; }
        .card-title { font-weight: 600; margin-bottom: 6px; }
        .bar { display: grid; grid-template-columns: 140px 1fr 40px; gap: 10px; align-items: center; margin-bottom: 6px; font-size: 12px; }
        .bar-track { background: #0c1224; border: 1px solid #253057; border-radius: 999px; height: 10px; overflow: hidden; }
        .bar-fill { height: 100%; background: linear-gradient(90deg, #5b8cff, #7aa7ff); }
        .bar-label { color: #8a94b8; }
      </style>
    `;
    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" width="960" height="540">
        <foreignObject x="0" y="0" width="960" height="540">
          <div xmlns="http://www.w3.org/1999/xhtml" style="padding:16px;">
            ${style}
            <h2>${t("runs_event_stats")}</h2>
            ${statsEl.innerHTML}
          </div>
        </foreignObject>
      </svg>
    `;
    const svgBlob = new Blob([svg], { type: "image/svg+xml" });
    const url = URL.createObjectURL(svgBlob);
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = 960;
      canvas.height = 540;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(img, 0, 0);
        canvas.toBlob((blob) => {
          if (!blob) return;
          const a = document.createElement("a");
          a.href = URL.createObjectURL(blob);
          a.download = "event-stats.png";
          a.click();
        }, "image/png");
      }
      URL.revokeObjectURL(url);
    };
    img.src = url;
  }

  exportSvgBtn.addEventListener("click", exportChartSvg);
  exportPngBtn.addEventListener("click", exportChartPng);
  await loadEvents();
}

function loadArchitecture() {
  const el = contents.get("architecture")!;
  el.innerHTML = `
    <div class="card">
      <div class="card-title">${t("architecture_layered")}</div>
      <svg class="graph" viewBox="0 0 960 420" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <marker id="arrow" markerWidth="10" markerHeight="10" refX="6" refY="3" orient="auto">
            <path d="M0,0 L0,6 L6,3 z" fill="#5b8cff" />
          </marker>
        </defs>
        <rect x="40" y="40" width="200" height="60" rx="12" class="node" />
        <text x="140" y="76" text-anchor="middle" class="label">${t("architecture_ui")}</text>

        <rect x="280" y="40" width="200" height="60" rx="12" class="node" />
        <text x="380" y="76" text-anchor="middle" class="label">${t("architecture_app_service")}</text>

        <rect x="520" y="40" width="200" height="60" rx="12" class="node" />
        <text x="620" y="76" text-anchor="middle" class="label">${t("architecture_orchestrator")}</text>

        <rect x="760" y="40" width="180" height="60" rx="12" class="node" />
        <text x="850" y="76" text-anchor="middle" class="label">${t("architecture_llm_gateway")}</text>

        <rect x="520" y="160" width="200" height="60" rx="12" class="node" />
        <text x="620" y="196" text-anchor="middle" class="label">${t("architecture_tools_runtime")}</text>

        <rect x="520" y="280" width="200" height="60" rx="12" class="node" />
        <text x="620" y="316" text-anchor="middle" class="label">${t("architecture_local_data")}</text>

        <line x1="240" y1="70" x2="280" y2="70" class="edge" marker-end="url(#arrow)" />
        <line x1="480" y1="70" x2="520" y2="70" class="edge" marker-end="url(#arrow)" />
        <line x1="720" y1="70" x2="760" y2="70" class="edge" marker-end="url(#arrow)" />
        <line x1="620" y1="100" x2="620" y2="160" class="edge" marker-end="url(#arrow)" />
        <line x1="620" y1="220" x2="620" y2="280" class="edge" marker-end="url(#arrow)" />
      </svg>
      <div class="small">${t("architecture_note")}</div>
    </div>
    <div class="card">
      <div class="card-title">${t("architecture_contracts")}</div>
      <div class="small">${t("architecture_contracts_note")}</div>
    </div>
  `;
}

async function init() {
  const langSelect = document.getElementById("lang-select") as HTMLSelectElement | null;
  if (langSelect) {
    langSelect.value = currentLang;
    langSelect.addEventListener("change", async () => {
      setLang((langSelect.value as Lang) || "zh");
      await loadOverview();
      await loadWorkflows();
      await loadRuns();
      loadArchitecture();
      setActive(activeTab);
    });
  }
  updateStaticText();
  setActive("overview");
  await loadOverview();
  await loadWorkflows();
  await loadRuns();
  loadArchitecture();
}

init().catch((err) => {
  const el = contents.get("overview")!;
  el.innerHTML = `<div class="card">${t("general_error", { message: String(err) })}</div>`;
});
