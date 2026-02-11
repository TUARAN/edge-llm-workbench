import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";

const tabs = document.querySelectorAll<HTMLButtonElement>(".tab");
const contents = new Map<string, HTMLElement>();
["overview", "workflows", "runs", "architecture"].forEach((id) => {
  const el = document.getElementById(id) as HTMLElement;
  contents.set(id, el);
});

function setActive(tabId: string) {
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
      <div class="card-title">Project Snapshot</div>
      <div class="kv">
        <div>Version</div><div>${data.version}</div>
        <div>Workspace</div><div>${data.workspace_root}</div>
        <div>Workflows</div><div>${data.workflow_count}</div>
        <div>Runs</div><div>${data.run_count}</div>
        <div>Tools</div><div>${data.tool_count}</div>
      </div>
    </div>
    <div class="card">
      <div class="card-title">Builtin Tools</div>
      <div>${data.tools.map((t: string) => `<span class="badge">${t}</span>`).join("")}</div>
    </div>
  `;
}

async function loadWorkflows() {
  const list = await invoke<any[]>("list_workflows");
  const el = contents.get("workflows")!;
  const options = list
    .map((wf) => `<option value="${wf.path}">${wf.name} (${wf.steps} steps)</option>`)
    .join("");
  el.innerHTML = `
    <div class="card">
      <div class="card-title">Run Workflow</div>
      <div class="kv">
        <div>Workflow</div>
        <div>
          <select id="wf-select">${options}</select>
        </div>
        <div>Output Dir</div>
        <div><input id="wf-out" value="out/ui" /></div>
        <div>Inputs</div>
        <div id="wf-form"></div>
      </div>
      <div class="progress">
        <div class="progress-bar" id="wf-progress"></div>
      </div>
      <div class="small" id="wf-progress-text">Idle</div>
      <div class="row">
        <button class="btn" id="wf-run">Run</button>
        <button class="btn secondary" id="wf-replay">Replay</button>
      </div>
      <pre id="wf-output"></pre>
    </div>
    ${list
      .map(
        (wf) => `
        <div class="card">
          <div class="card-title">${wf.name}</div>
          <div class="kv">
            <div>Version</div><div>${wf.version}</div>
            <div>Path</div><div>${wf.path}</div>
            <div>Steps</div><div>${wf.steps}</div>
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
    progressText.textContent = total ? `Progress: ${done}/${total} ${status || ""}` : "Idle";
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
      const title = path ? path : "Inputs";
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
    const defHint = schema.default !== undefined ? `<div class="small">default: ${schema.default}</div>` : "";
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
        const lang = (navigator.language || "en").toLowerCase();
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
      ? `<button class="btn secondary small" data-picker="${path}">Browse</button>`
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
      formEl.innerHTML = rows.join("") || `<div class="small">No inputs defined</div>`;
    }
    setProgress(0, detail?.steps || 0, "Idle");

    formEl.querySelectorAll<HTMLButtonElement>("[data-picker]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const key = btn.dataset.picker as string;
        const input = formEl.querySelector<HTMLInputElement>(`[data-key=\"${key}\"]`);
        const isDir = input?.dataset.format === "directory";
        const selected = await open({ multiple: false, directory: isDir });
        if (selected) {
          if (input) input.value = String(selected);
        }
      });
    });

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
      const status = last ? `(last: ${last.type}${last.step_id ? ` / ${last.step_id}` : ""})${elapsed}` : "";
      setProgress(completed, totalSteps, status);
      await new Promise((r) => setTimeout(r, 700));
    }
  }

  runBtn.addEventListener("click", async () => {
    outputEl.textContent = "Running...";
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
    outputEl.textContent = `${res.success ? "OK" : "FAILED"}\n${res.stdout}\n${res.stderr}`;
    await loadRuns();
  });

  replayBtn.addEventListener("click", async () => {
    outputEl.textContent = "Replaying...";
    const totalSteps = currentWorkflow?.steps || 0;
    const stopSignal = { stop: false };
    pollEvents(outEl.value, totalSteps, stopSignal);
    const res = await invoke<any>("replay_run", { outDir: outEl.value });
    stopSignal.stop = true;
    outputEl.textContent = `${res.success ? "OK" : "FAILED"}\n${res.stdout}\n${res.stderr}`;
    await loadRuns();
  });
}

async function loadRuns() {
  const list = await invoke<any[]>("list_runs");
  const el = contents.get("runs")!;
  if (!list.length) {
    el.innerHTML = `<div class="card"><div class="card-title">No runs yet</div><div class="small">Run any workflow to see audit logs.</div></div>`;
    return;
  }
  const options = list.map((r) => `<option value="${r.dir}">${r.workflow}</option>`).join("");
  el.innerHTML = `
    <div class="card">
      <div class="card-title">Events Timeline</div>
      <div class="row">
        <select id="run-select">${options}</select>
        <button class="btn" id="run-load">Load Events</button>
      </div>
      <div class="row">
        <input id="run-search" placeholder="Search events..." />
        <select id="event-type">
          <option value="">All types</option>
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
          <option value="custom">Custom</option>
        </select>
        <input id="time-custom" type="number" min="1000" step="1000" value="5000" />
      </div>
      <div class="row">
        <button class="btn secondary" id="export-svg">Export SVG</button>
        <button class="btn secondary" id="export-png">Export PNG</button>
      </div>
      <div id="stats"></div>
      <div id="events"></div>
    </div>
    <div class="card">
      <div class="card-title">Export Report</div>
      <div class="row">
        <input id="report-path" value="out/report.json" />
        <select id="report-format">
          <option value="json">json</option>
          <option value="html">html</option>
        </select>
        <button class="btn" id="report-export">Export</button>
      </div>
      <pre id="report-output"></pre>
    </div>
    <div class="card">
      <div class="card-title">Run Filter</div>
      <div class="row">
        <input id="runs-filter" placeholder="Filter by workflow/run id" />
      </div>
    </div>
    ${list
      .map(
        (run) => `
        <div class="card">
          <div class="card-title">${run.workflow}</div>
          <div class="kv">
            <div>Run ID</div><div>${run.run_id}</div>
            <div>Dir</div><div>${run.dir}</div>
            <div>Replay</div><div>${run.replay}</div>
          </div>
          <div class="small">Events: ${run.events_path || "(missing)"}</div>
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
      const key = e.step_id || "(no-step)";
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
      const t = e.type || "event";
      typeCounts[t] = (typeCounts[t] || 0) + 1;
      const s = e.step_id || "(no-step)";
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
        const t = Date.parse(e.ts);
        if (Number.isNaN(t)) return;
        const bucket = Math.floor(t / windowMs) * windowMs;
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
        <div class="card-title">Event Type Counts</div>
        ${renderBars(typeCounts)}
      </div>
      <div class="card">
        <div class="card-title">Event Timeline</div>
        ${renderTimeline()}
      </div>
      <div class="card">
        <div class="card-title">Step Event Counts</div>
        ${renderBars(stepCounts)}
      </div>
    `;
  }

  async function loadEvents() {
    const events = await invoke<any[]>("get_events", { runDir: runSelect.value });
    lastEvents = events;
    if (!events.length) {
      eventsEl.innerHTML = `<div class="small">No events found.</div>`;
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
            <div class="small">${e.ts || "-"} • ${e.type || "event"} ${e.tool ? `• ${e.tool}` : ""}</div>
            <pre>${JSON.stringify(e, null, 2)}</pre>
          </div>
        `
          )
          .join("");
        return `
        <details class="card" open>
          <summary class="card-title">${header} <span class="small">(${es.length} events)</span></summary>
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
            <h2>Event Stats</h2>
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
            <h2>Event Stats</h2>
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
      <div class="card-title">Layered Architecture</div>
      <svg class="graph" viewBox="0 0 960 420" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <marker id="arrow" markerWidth="10" markerHeight="10" refX="6" refY="3" orient="auto">
            <path d="M0,0 L0,6 L6,3 z" fill="#5b8cff" />
          </marker>
        </defs>
        <rect x="40" y="40" width="200" height="60" rx="12" class="node" />
        <text x="140" y="76" text-anchor="middle" class="label">UI (Desktop)</text>

        <rect x="280" y="40" width="200" height="60" rx="12" class="node" />
        <text x="380" y="76" text-anchor="middle" class="label">App Service</text>

        <rect x="520" y="40" width="200" height="60" rx="12" class="node" />
        <text x="620" y="76" text-anchor="middle" class="label">Orchestrator</text>

        <rect x="760" y="40" width="180" height="60" rx="12" class="node" />
        <text x="850" y="76" text-anchor="middle" class="label">LLM Gateway</text>

        <rect x="520" y="160" width="200" height="60" rx="12" class="node" />
        <text x="620" y="196" text-anchor="middle" class="label">Tools Runtime</text>

        <rect x="520" y="280" width="200" height="60" rx="12" class="node" />
        <text x="620" y="316" text-anchor="middle" class="label">Local Data</text>

        <line x1="240" y1="70" x2="280" y2="70" class="edge" marker-end="url(#arrow)" />
        <line x1="480" y1="70" x2="520" y2="70" class="edge" marker-end="url(#arrow)" />
        <line x1="720" y1="70" x2="760" y2="70" class="edge" marker-end="url(#arrow)" />
        <line x1="620" y1="100" x2="620" y2="160" class="edge" marker-end="url(#arrow)" />
        <line x1="620" y1="220" x2="620" y2="280" class="edge" marker-end="url(#arrow)" />
      </svg>
      <div class="small">Planner 负责决策与计划；Tools 负责确定性执行与审计。</div>
    </div>
    <div class="card">
      <div class="card-title">Execution Contracts</div>
      <div class="small">每个 Tool 有严格的 JSON Schema 输入输出，运行事件写入 events.jsonl，可回放。</div>
    </div>
  `;
}

async function init() {
  setActive("overview");
  await loadOverview();
  await loadWorkflows();
  await loadRuns();
  loadArchitecture();
}

init().catch((err) => {
  const el = contents.get("overview")!;
  el.innerHTML = `<div class="card">Error: ${String(err)}</div>`;
});
