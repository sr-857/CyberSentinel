const API_BASE = "http://localhost:5000";

const selectors = {
  status: document.getElementById("status"),
  intelTable: document.querySelector("#intel-table tbody"),
  sshTable: document.querySelector("#ssh-table tbody"),
  apacheTable: document.querySelector("#apache-table tbody"),
  alertsTable: document.querySelector("#alerts-table tbody"),
  totals: {
    ssh: document.getElementById("total-ssh"),
    apache: document.getElementById("total-apache"),
    alerts: document.getElementById("total-alerts"),
  },
};

const charts = {
  sshTrend: null,
  sshTopIps: null,
  apacheStatus: null,
  alertSeverity: null,
};

async function fetchJson(url, options = {}) {
  try {
    const response = await fetch(url, {
      headers: {
        "Content-Type": "application/json",
      },
      ...options,
    });
    if (!response.ok) {
      throw new Error(`${response.status}: ${response.statusText}`);
    }
    return await response.json();
  } catch (error) {
    updateStatus(`Error: ${error.message}`, true);
    throw error;
  }
}

function updateStatus(message, isError = false) {
  selectors.status.textContent = message;
  selectors.status.className = isError ? "error" : "";
}

function renderTableRows(tableBody, rows) {
  tableBody.innerHTML = "";
  if (!rows.length) {
    tableBody.innerHTML = '<tr><td colspan="5">No data.</td></tr>';
    return;
  }
  const fragment = document.createDocumentFragment();
  rows.forEach((row) => {
    const tr = document.createElement("tr");
    row.forEach((value) => {
      const td = document.createElement("td");
      td.textContent = value ?? "-";
      tr.appendChild(td);
    });
    fragment.appendChild(tr);
  });
  tableBody.appendChild(fragment);
}

function updateTotals(totals = {}) {
  const { ssh_events = 0, apache_events = 0, alerts = 0 } = totals;
  selectors.totals.ssh.textContent = ssh_events;
  selectors.totals.apache.textContent = apache_events;
  selectors.totals.alerts.textContent = alerts;
}

function upsertChart(chartRef, ctxId, config) {
  if (chartRef && typeof chartRef.destroy === "function") {
    chartRef.destroy();
  }
  const ctx = document.getElementById(ctxId);
  if (!ctx) return null;
  return new Chart(ctx, config);
}

async function loadIntel() {
  updateStatus("Fetching threat intelligence...");
  const data = await fetchJson(`${API_BASE}/api/intel`);
  renderTableRows(
    selectors.intelTable,
    data.data.map((item) => [
      item.indicator,
      item.type,
      item.source,
      item.last_seen ?? item.first_seen ?? "-",
      item.confidence ?? "-",
    ])
  );
  updateStatus(`Loaded ${data.count} indicators.`);
}

async function parseLogs() {
  updateStatus("Parsing log files...");
  const data = await fetchJson(`${API_BASE}/api/logs/parse`, {
    method: "POST",
  });
  updateStatus(`Parsed logs: ${JSON.stringify(data.sources)}`);
  await loadLogs();
}

async function loadLogs() {
  const sshData = await fetchJson(`${API_BASE}/api/logs?source=ssh`);
  renderTableRows(
    selectors.sshTable,
    sshData.data.map((item) => [
      item.event_time,
      item.ip_address,
      item.username,
      item.raw,
    ])
  );

  const apacheData = await fetchJson(`${API_BASE}/api/logs?source=apache`);
  renderTableRows(
    selectors.apacheTable,
    apacheData.data.map((item) => [
      item.event_time,
      item.ip_address,
      item.request,
      item.status_code,
    ])
  );
}

async function runCorrelation() {
  updateStatus("Running correlation analysis...");
  const data = await fetchJson(`${API_BASE}/api/correlation/run`, {
    method: "POST",
  });
  renderTableRows(
    selectors.alertsTable,
    data.alerts.map((item) => [
      item.event_time,
      item.indicator,
      item.log_source,
      item.severity,
      item.message,
    ])
  );
  updateStatus(`Generated ${data.generated} alerts.`);
}

async function loadAlerts() {
  const data = await fetchJson(`${API_BASE}/api/alerts`);
  renderTableRows(
    selectors.alertsTable,
    data.data.map((item) => [
      item.created_at,
      item.indicator,
      item.log_source,
      item.severity,
      item.message,
    ])
  );
}

async function loadAnalytics() {
  try {
    const data = await fetchJson(`${API_BASE}/api/analytics/summary`);
    updateTotals(data.totals);

    const sshTrendLabels = data.ssh_failures_over_time.map((entry) => entry.time);
    const sshTrendValues = data.ssh_failures_over_time.map((entry) => entry.count);
    charts.sshTrend = upsertChart(charts.sshTrend, "ssh-trend-chart", {
      type: "line",
      data: {
        labels: sshTrendLabels,
        datasets: [
          {
            label: "SSH Failures",
            data: sshTrendValues,
            fill: false,
            borderColor: "#63b3ff",
            tension: 0.3,
          },
        ],
      },
      options: {
        responsive: true,
        plugins: { legend: { display: false } },
        scales: {
          x: { ticks: { color: "#9ac6ff" } },
          y: { ticks: { color: "#9ac6ff" } },
        },
      },
    });

    const sshTopIpLabels = data.ssh_top_ips.map((entry) => entry.ip);
    const sshTopIpValues = data.ssh_top_ips.map((entry) => entry.count);
    charts.sshTopIps = upsertChart(charts.sshTopIps, "ssh-top-ips-chart", {
      type: "bar",
      data: {
        labels: sshTopIpLabels,
        datasets: [
          {
            label: "Attempts",
            data: sshTopIpValues,
            backgroundColor: "rgba(99, 179, 255, 0.7)",
          },
        ],
      },
      options: {
        responsive: true,
        plugins: { legend: { display: false } },
        scales: {
          x: { ticks: { color: "#9ac6ff" } },
          y: { ticks: { color: "#9ac6ff" } },
        },
      },
    });

    const apacheStatusLabels = data.apache_status_counts.map((entry) => entry.status);
    const apacheStatusValues = data.apache_status_counts.map((entry) => entry.count);
    charts.apacheStatus = upsertChart(charts.apacheStatus, "apache-status-chart", {
      type: "doughnut",
      data: {
        labels: apacheStatusLabels,
        datasets: [
          {
            data: apacheStatusValues,
            backgroundColor: [
              "rgba(99, 179, 255, 0.7)",
              "rgba(255, 159, 64, 0.7)",
              "rgba(255, 99, 132, 0.7)",
              "rgba(75, 192, 192, 0.7)",
              "rgba(153, 102, 255, 0.7)",
            ],
          },
        ],
      },
      options: {
        responsive: true,
        plugins: {
          legend: {
            labels: { color: "#9ac6ff" },
          },
        },
      },
    });

    const alertSeverityLabels = data.alert_severity_counts.map((entry) => entry.severity);
    const alertSeverityValues = data.alert_severity_counts.map((entry) => entry.count);
    charts.alertSeverity = upsertChart(charts.alertSeverity, "alert-severity-chart", {
      type: "polarArea",
      data: {
        labels: alertSeverityLabels,
        datasets: [
          {
            data: alertSeverityValues,
            backgroundColor: [
              "rgba(255, 99, 132, 0.7)",
              "rgba(255, 205, 86, 0.7)",
              "rgba(75, 192, 192, 0.7)",
            ],
          },
        ],
      },
      options: {
        responsive: true,
        plugins: { legend: { labels: { color: "#9ac6ff" } } },
      },
    });
  } catch (error) {
    console.error(error);
  }
}

function registerEventHandlers() {
  document.getElementById("fetch-intel").addEventListener("click", () => {
    fetchJson(`${API_BASE}/api/intel/fetch`, { method: "POST" })
      .then((data) => {
        updateStatus(`Fetched ${data.fetched} indicators; stored ${data.stored}.`);
        return loadIntel();
      })
      .catch(() => {});
  });

  document.getElementById("parse-logs").addEventListener("click", () => {
    parseLogs().catch(() => {});
  });

  document.getElementById("run-correlation").addEventListener("click", () => {
    runCorrelation()
      .then(() => Promise.all([loadAlerts(), loadAnalytics()]))
      .catch(() => {});
  });
}

async function initialize() {
  registerEventHandlers();
  updateStatus("Loading data...");
  try {
    await Promise.all([loadIntel(), loadLogs(), loadAlerts(), loadAnalytics()]);
    updateStatus("Dashboard ready.");
  } catch (error) {
    console.error(error);
  }
}

window.addEventListener("DOMContentLoaded", initialize);
