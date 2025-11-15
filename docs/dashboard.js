const selectors = {
  status: document.getElementById("status"),
  totals: {
    ssh: document.getElementById("total-ssh"),
    apache: document.getElementById("total-apache"),
    alerts: document.getElementById("total-alerts"),
  },
  tables: {
    intel: document.querySelector("#intel-table tbody"),
    ssh: document.querySelector("#ssh-table tbody"),
    apache: document.querySelector("#apache-table tbody"),
    alerts: document.querySelector("#alerts-table tbody"),
  },
  buttons: {
    fetch: document.getElementById("fetch-intel"),
    parse: document.getElementById("parse-logs"),
    correlate: document.getElementById("run-correlation"),
  },
};

const state = {
  charts: {
    sshTrend: null,
    sshTopIps: null,
    apacheStatus: null,
    alertSeverity: null,
  },
  data: null,
  baseData: null,
  pending: new Set(),
};

const FALLBACK_DATA = {
  updated_at: "2025-11-14T10:00:00Z",
  kpis: {
    intel_count: 128,
    ssh_events: 240,
    apache_events: 182,
    alerts: 12,
  },
  ssh_top_ips: [
    { ip: "203.0.113.24", count: 32 },
    { ip: "198.51.100.42", count: 21 },
    { ip: "192.0.2.17", count: 16 },
    { ip: "45.33.12.8", count: 14 },
    { ip: "91.198.174.192", count: 11 },
  ],
  ssh_top_users: [
    { username: "root", count: 41 },
    { username: "deploy", count: 18 },
    { username: "analyst", count: 9 },
    { username: "ops", count: 7 },
    { username: "qa", count: 5 },
  ],
  ssh_failures_over_time: [
    { time: "2025-11-13T20:00:00Z", count: 6 },
    { time: "2025-11-13T21:00:00Z", count: 13 },
    { time: "2025-11-13T22:00:00Z", count: 18 },
    { time: "2025-11-13T23:00:00Z", count: 22 },
    { time: "2025-11-14T00:00:00Z", count: 19 },
    { time: "2025-11-14T01:00:00Z", count: 15 },
    { time: "2025-11-14T02:00:00Z", count: 11 },
  ],
  apache_top_paths: [
    { path: "/admin/login", count: 28 },
    { path: "/", count: 24 },
    { path: "/metrics", count: 19 },
    { path: "/health", count: 15 },
    { path: "/static/js/app.js", count: 12 },
  ],
  apache_status_counts: [
    { status: "200", count: 122 },
    { status: "401", count: 28 },
    { status: "404", count: 17 },
    { status: "500", count: 9 },
    { status: "302", count: 6 },
  ],
  alert_severity_counts: [
    { severity: "high", count: 4 },
    { severity: "medium", count: 6 },
    { severity: "low", count: 2 },
  ],
  intel_table: [
    {
      indicator: "203.0.113.24",
      type: "ipv4",
      source: "AbuseIPDB",
      confidence: 90,
      last_seen: "2025-11-14T02:00:00Z",
    },
    {
      indicator: "198.51.100.42",
      type: "ipv4",
      source: "AlienVault OTX",
      confidence: 80,
      last_seen: "2025-11-14T01:00:00Z",
    },
    {
      indicator: "malicious-domain.example",
      type: "domain",
      source: "Enrichment",
      confidence: 75,
      last_seen: "2025-11-13T23:30:00Z",
    },
  ],
  ssh_table: [
    {
      event_time: "2025-11-14T00:42:08Z",
      ip_address: "203.0.113.24",
      username: "root",
      result: "FAILED",
    },
    {
      event_time: "2025-11-14T00:44:26Z",
      ip_address: "198.51.100.42",
      username: "deploy",
      result: "FAILED",
    },
    {
      event_time: "2025-11-14T01:05:17Z",
      ip_address: "192.0.2.17",
      username: "ops",
      result: "FAILED",
    },
    {
      event_time: "2025-11-14T01:17:55Z",
      ip_address: "45.33.12.8",
      username: "analyst",
      result: "FAILED",
    },
  ],
  apache_table: [
    {
      event_time: "2025-11-14T00:12:01Z",
      ip_address: "45.33.12.8",
      method: "GET",
      path: "/admin/login",
      status: 401,
    },
    {
      event_time: "2025-11-14T00:29:44Z",
      ip_address: "91.198.174.192",
      method: "GET",
      path: "/metrics",
      status: 200,
    },
    {
      event_time: "2025-11-14T01:11:09Z",
      ip_address: "203.0.113.24",
      method: "POST",
      path: "/api/login",
      status: 500,
    },
    {
      event_time: "2025-11-14T01:54:12Z",
      ip_address: "198.51.100.42",
      method: "GET",
      path: "/health",
      status: 200,
    },
  ],
  alerts_table: [
    {
      created_at: "2025-11-14T00:44:30Z",
      indicator: "203.0.113.24",
      log_source: "ssh",
      severity: "high",
      message: "Brute force activity detected against root",
    },
    {
      created_at: "2025-11-14T00:29:45Z",
      indicator: "45.33.12.8",
      log_source: "apache",
      severity: "medium",
      message: "Repeated probing of /admin/login",
    },
    {
      created_at: "2025-11-14T01:18:10Z",
      indicator: "malicious-domain.example",
      log_source: "ssh",
      severity: "low",
      message: "Indicator seen in auth failure logs",
    },
  ],
};

const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const deepClone = (value) => JSON.parse(JSON.stringify(value));
const rotateForward = (array) => {
  if (!array?.length) return [];
  const copy = array.slice();
  copy.push(copy.shift());
  return copy;
};
const randomChoice = (array) => array[Math.floor(Math.random() * array.length)];

function setStatus(message, isError = false) {
  if (!selectors.status) return;
  selectors.status.textContent = message;
  selectors.status.classList.toggle("error", isError);
}

function setPending(key, flag, busyLabel) {
  if (flag) {
    state.pending.add(key);
  } else {
    state.pending.delete(key);
  }
  const disabled = state.pending.size > 0;
  Object.values(selectors.buttons)
    .filter(Boolean)
    .forEach((btn) => {
      btn.disabled = disabled;
      btn.setAttribute("aria-busy", String(disabled));
      if (disabled && busyLabel) {
        try {
          btn.dataset.originalLabel = btn.textContent;
        } catch (e) {
          // dataset may not exist in very old browsers
        }
        btn.textContent = busyLabel;
      } else if (!disabled) {
        const original = btn.dataset ? btn.dataset.originalLabel : null;
        if (original) {
          btn.textContent = original;
          if (btn.dataset) {
            delete btn.dataset.originalLabel;
          }
        }
      }
    });
}

function delay(ms = 600) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function formatTimestamp(iso) {
  if (!iso) return "-";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

function formatHourLabel(iso) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

function renderTable(tableBody, rows, emptyMessage = "No data available.") {
  if (!tableBody) return;
  tableBody.innerHTML = "";
  if (!rows.length) {
    const tr = document.createElement("tr");
    const td = document.createElement("td");
    td.textContent = emptyMessage;
    td.colSpan = tableBody.closest("table").querySelectorAll("th").length;
    tr.appendChild(td);
    tableBody.appendChild(tr);
    return;
  }

  const fragment = document.createDocumentFragment();
  rows.forEach((cols) => {
    const tr = document.createElement("tr");
    cols.forEach((value) => {
      const td = document.createElement("td");
      td.textContent = value ?? "-";
      tr.appendChild(td);
    });
    fragment.appendChild(tr);
  });

  tableBody.appendChild(fragment);
}

function updateTotals(kpis) {
  selectors.totals.ssh.textContent = kpis.ssh_events ?? 0;
  selectors.totals.apache.textContent = kpis.apache_events ?? 0;
  selectors.totals.alerts.textContent = kpis.alerts ?? 0;
}

function buildChartConfig(type, data, overrides = {}) {
  const base = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        labels: {
          color: "#9da6c6",
        },
      },
      tooltip: {
        backgroundColor: "rgba(10, 18, 44, 0.95)",
        borderColor: "rgba(148, 163, 184, 0.22)",
        borderWidth: 1,
        titleColor: "#f4f6ff",
        bodyColor: "#e2e8f0",
      },
    },
    scales: {
      x: {
        ticks: { color: "#9da6c6" },
        grid: { color: "rgba(148, 163, 184, 0.1)" },
      },
      y: {
        ticks: { color: "#9da6c6" },
        grid: { color: "rgba(148, 163, 184, 0.1)" },
      },
    },
  };

  return {
    type,
    data,
    options: {
      ...base,
      ...overrides,
      plugins: { ...base.plugins, ...(overrides.plugins ?? {}) },
      scales: overrides.scales ?? base.scales,
    },
  };
}

function upsertChart(key, ctxId, config) {
  const ctx = document.getElementById(ctxId);
  if (!ctx) return;
  if (state.charts[key]) {
    state.charts[key].destroy();
  }
  state.charts[key] = new Chart(ctx, config);
}

function renderCharts(data) {
  if (!window.Chart) return;
  const sshTrendLabels = data.ssh_failures_over_time.map((entry) => formatHourLabel(entry.time));
  const sshTrendValues = data.ssh_failures_over_time.map((entry) => entry.count);
  upsertChart(
    "sshTrend",
    "ssh-trend-chart",
    buildChartConfig("line", {
      labels: sshTrendLabels,
      datasets: [
        {
          label: "SSH Failures",
          data: sshTrendValues,
          borderColor: "#38bdf8",
          backgroundColor: "rgba(56, 189, 248, 0.16)",
          tension: 0.35,
          fill: true,
        },
      ],
    })
  );

  const sshTopIpLabels = data.ssh_top_ips.map((entry) => entry.ip);
  const sshTopIpValues = data.ssh_top_ips.map((entry) => entry.count);
  upsertChart(
    "sshTopIps",
    "ssh-top-ips-chart",
    buildChartConfig("bar", {
      labels: sshTopIpLabels,
      datasets: [
        {
          label: "Attempts",
          data: sshTopIpValues,
          backgroundColor: "rgba(14, 165, 233, 0.65)",
          borderRadius: 12,
        },
      ],
    })
  );

  const apacheStatusLabels = data.apache_status_counts.map((entry) => entry.status);
  const apacheStatusValues = data.apache_status_counts.map((entry) => entry.count);
  upsertChart(
    "apacheStatus",
    "apache-status-chart",
    buildChartConfig(
      "doughnut",
      {
        labels: apacheStatusLabels,
        datasets: [
          {
            data: apacheStatusValues,
            backgroundColor: ["#38bdf8", "#f97316", "#f87171", "#22c55e", "#a855f7"],
            borderColor: "rgba(5, 10, 31, 0.9)",
            borderWidth: 2,
          },
        ],
      },
      { cutout: "60%" }
    )
  );

  const alertSeverityLabels = data.alert_severity_counts.map((entry) => entry.severity.toUpperCase());
  const alertSeverityValues = data.alert_severity_counts.map((entry) => entry.count);
  upsertChart(
    "alertSeverity",
    "alert-severity-chart",
    buildChartConfig("polarArea", {
      labels: alertSeverityLabels,
      datasets: [
        {
          data: alertSeverityValues,
          backgroundColor: ["#f87171", "#facc15", "#34d399", "#38bdf8"],
        },
      ],
    })
  );
}

function renderTables(data) {
  renderTable(
    selectors.tables.intel,
    data.intel_table.map((item) => [
      item.indicator,
      item.type,
      item.source,
      item.last_seen ?? item.first_seen ?? "-",
      item.confidence ?? "-",
    ])
  );

  renderTable(
    selectors.tables.ssh,
    data.ssh_table.map((item) => [
      formatTimestamp(item.event_time),
      item.ip_address,
      item.username,
      item.result ?? item.meta?.message ?? "Failed login",
    ])
  );

  renderTable(
    selectors.tables.apache,
    data.apache_table.map((item) => [
      formatTimestamp(item.event_time),
      item.ip_address,
      `${item.method ?? "GET"} ${item.path ?? item.request ?? ""}`.trim(),
      item.status,
    ])
  );

  renderTable(
    selectors.tables.alerts,
    data.alerts_table.map((item) => [
      formatTimestamp(item.created_at ?? item.event_time),
      item.indicator,
      item.log_source,
      item.severity,
      item.message,
    ])
  );
}

function hydrateDashboard() {
  if (!state.data) return;
  updateTotals(state.data.kpis ?? {});
  renderTables(state.data);
  renderCharts(state.data);
}

async function fetchSampleData() {
  const config = window.__CYBERSENTINEL_DEMO__ || {};
  const samplePath = config.sampleData;
  if (!samplePath) {
    throw new Error("Sample data path not provided.");
  }
  if (typeof fetch !== "function") {
    throw new Error("Fetch API unavailable in this browser.");
  }
  const response = await fetch(samplePath, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Failed to load sample data (${response.status})`);
  }
  return response.json();
}

function configureChartDefaults() {
  if (!window.Chart || !Chart.defaults) {
    return;
  }
  Chart.defaults.color = "#e2e8f0";
  const fontFamily = getComputedStyle(document.documentElement).getPropertyValue("font-family") || "Inter, sans-serif";
  Chart.defaults.font.family = fontFamily.replace(/^["']|["']$/g, "");
}

function stampFooterYear() {
  const footerYear = document.getElementById("footer-year");
  if (footerYear) {
    footerYear.textContent = String(new Date().getFullYear());
  }
}

function mutateIntel(current) {
  const next = deepClone(current);
  const previousCount = current.kpis.intel_count ?? 0;
  const delta = randomInt(-3, 6);
  next.kpis.intel_count = Math.max(80, previousCount + delta);
  next.intel_table = rotateForward(current.intel_table).map((entry, idx) =>
    idx === 0
      ? {
          ...entry,
          confidence: Math.min(100, (entry.confidence ?? 60) + randomInt(2, 10)),
        }
      : entry
  );
  return { data: next, delta: next.kpis.intel_count - previousCount };
}

function mutateLogs(current) {
  const next = deepClone(current);
  const sshDelta = randomInt(4, 12);
  const apacheDelta = randomInt(3, 9);
  next.kpis.ssh_events = (current.kpis.ssh_events ?? 0) + sshDelta;
  next.kpis.apache_events = (current.kpis.apache_events ?? 0) + apacheDelta;

  const nowIso = new Date().toISOString();
  const sshIps = next.ssh_top_ips.map((entry) => entry.ip);
  const newSshEntry = {
    event_time: nowIso,
    ip_address: randomChoice(sshIps.length ? sshIps : ["198.51.100.42", "203.0.113.24"]),
    username: randomChoice(["root", "deploy", "ops", "analyst", "qa"]),
    result: "FAILED",
  };
  next.ssh_table = [newSshEntry, ...current.ssh_table].slice(0, Math.max(5, current.ssh_table.length));

  const trend = current.ssh_failures_over_time.slice(1);
  const lastEntry = current.ssh_failures_over_time[current.ssh_failures_over_time.length - 1];
  const lastCount = lastEntry ? lastEntry.count : 12;
  trend.push({ time: nowIso, count: Math.max(6, lastCount) + randomInt(-4, 5) });
  next.ssh_failures_over_time = trend;

  const ipBucket = next.ssh_top_ips.find((entry) => entry.ip === newSshEntry.ip_address);
  if (ipBucket) {
    ipBucket.count += Math.max(1, Math.round(sshDelta / 3));
  }

  const apacheCatalog = [
    { path: "/api/login", status: 401, method: "POST" },
    { path: "/metrics", status: 200, method: "GET" },
    { path: "/admin", status: 302, method: "GET" },
    { path: "/static/js/app.js", status: 200, method: "GET" },
    { path: "/admin/login", status: 401, method: "GET" },
  ];
  const apacheSample = randomChoice(apacheCatalog);
  const newApacheEntry = {
    event_time: nowIso,
    ip_address: randomChoice(["45.33.12.8", "91.198.174.192", "203.0.113.24", "198.51.100.42"]),
    method: apacheSample.method,
    path: apacheSample.path,
    status: apacheSample.status,
  };
  next.apache_table = [newApacheEntry, ...current.apache_table].slice(0, Math.max(5, current.apache_table.length));

  const statusBucket = next.apache_status_counts.find((entry) => String(entry.status) === String(newApacheEntry.status));
  if (statusBucket) {
    statusBucket.count += Math.max(1, Math.round(apacheDelta / 2));
  }

  return { data: next, delta: { ssh: sshDelta, apache: apacheDelta } };
}

function mutateCorrelation(current) {
  const next = deepClone(current);
  const severityOptions = [
    { severity: "high", message: "Brute force escalation detected on privileged account." },
    { severity: "medium", message: "Repeated probing of sensitive web endpoint." },
    { severity: "low", message: "IOC observed with limited activity." },
  ];
  const chosen = randomChoice(severityOptions);
  const intelIndicators = next.intel_table.map((entry) => entry.indicator);
  const newAlert = {
    created_at: new Date().toISOString(),
    indicator: randomChoice(intelIndicators.length ? intelIndicators : ["203.0.113.24"]),
    log_source: chosen.severity === "high" ? "ssh" : randomChoice(["apache", "ssh"]),
    severity: chosen.severity,
    message: chosen.message,
  };
  next.alerts_table = [newAlert, ...current.alerts_table].slice(0, Math.max(6, current.alerts_table.length));
  next.kpis.alerts = (current.kpis.alerts ?? next.alerts_table.length) + 1;

  const bucket = next.alert_severity_counts.find((entry) => entry.severity === chosen.severity);
  if (bucket) {
    bucket.count += 1;
  } else {
    next.alert_severity_counts.push({ severity: chosen.severity, count: 1 });
  }

  return { data: next, alert: newAlert };
}

async function simulateIntelFetch() {
  if (!state.data) return;
  setPending("fetch", true, "Fetching…");
  setStatus("Contacting threat feeds (demo)...");
  await delay(randomInt(500, 900));
  const { data, delta } = mutateIntel(state.data);
  state.data = data;
  hydrateDashboard();
  const change = delta >= 0 ? `+${delta}` : `${delta}`;
  setStatus(`Fetched threat intel: ${state.data.kpis.intel_count} indicators (${change})`);
  setPending("fetch", false);
}

async function simulateLogParse() {
  if (!state.data) return;
  setPending("parse", true, "Parsing…");
  setStatus("Parsing SSH and Apache logs...");
  await delay(randomInt(600, 1000));
  const { data, delta } = mutateLogs(state.data);
  state.data = data;
  hydrateDashboard();
  setStatus(
    `Parsed logs: SSH +${delta.ssh} events, Apache +${delta.apache} requests (synthetic demo)`
  );
  setPending("parse", false);
}

async function simulateCorrelation() {
  if (!state.data) return;
  setPending("correlate", true, "Correlating…");
  setStatus("Running correlation and refreshing analytics...");
  await delay(randomInt(650, 1100));
  const { data, alert } = mutateCorrelation(state.data);
  state.data = data;
  hydrateDashboard();
  setStatus(
    `Generated alert: ${alert.indicator} (${alert.severity.toUpperCase()}) — ${alert.message}`
  );
  setPending("correlate", false);
}

function registerEventHandlers() {
  selectors.buttons.fetch?.addEventListener("click", () => {
    simulateIntelFetch().catch((error) => console.error(error));
  });
  selectors.buttons.parse?.addEventListener("click", () => {
    simulateLogParse().catch((error) => console.error(error));
  });
  selectors.buttons.correlate?.addEventListener("click", () => {
    simulateCorrelation().catch((error) => console.error(error));
  });
}

async function bootstrap() {
  setPending("bootstrap", true, "Loading…");
  setStatus("Loading curated SOC telemetry...");
  try {
    configureChartDefaults();
    const config = window.__CYBERSENTINEL_DEMO__ || {};
    const embedded = config.embeddedData ? deepClone(config.embeddedData) : null;
    let data = embedded ? embedded : deepClone(FALLBACK_DATA);

    if (typeof fetch === "function") {
      try {
        const remote = await fetchSampleData();
        if (remote) {
          data = remote;
        }
      } catch (networkError) {
        console.warn("Falling back to embedded demo payload", networkError);
      }
    } else {
      console.warn("Fetch API unavailable; using embedded demo data only.");
    }

    if (!data) {
      throw new Error("No demo dataset available.");
    }

    state.baseData = deepClone(data);
    state.data = deepClone(data);
    hydrateDashboard();
    setStatus("Dashboard ready. Explore the workflow controls →");
  } catch (error) {
    console.error(error);
    const message = error && error.message ? error.message : String(error);
    setStatus(`Failed to initialise demo data: ${message}`, true);
  } finally {
    setPending("bootstrap", false);
  }
}

document.addEventListener("DOMContentLoaded", () => {
  stampFooterYear();
  registerEventHandlers();
  bootstrap().catch((error) => console.error(error));
});
