const http = require("http");
const https = require("https");
const { execFileSync, spawn } = require("child_process");

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function requestUrl(url, timeoutMs) {
  return new Promise((resolve) => {
    const transport = url.protocol === "https:" ? https : http;
    const request = transport.request(
      {
        method: "GET",
        hostname: url.hostname,
        port: url.port,
        path: url.pathname || "/",
        timeout: timeoutMs
      },
      (response) => {
        response.resume();
        resolve(true);
      }
    );

    request.on("error", () => resolve(false));
    request.on("timeout", () => {
      request.destroy();
      resolve(false);
    });
    request.end();
  });
}

async function waitForUrl(url, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (await requestUrl(url, 1_000)) {
      return true;
    }

    await delay(250);
  }

  return false;
}

function processAlive(pid) {
  if (!pid) {
    return false;
  }

  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

function getListeningPids(port) {
  if (!port || process.platform === "win32") {
    return new Set();
  }

  try {
    const output = execFileSync("lsof", ["-nP", "-ti", `tcp:${port}`, "-sTCP:LISTEN"], {
      encoding: "utf8"
    });
    const pids = output
      .split(/\s+/)
      .map((value) => Number.parseInt(value, 10))
      .filter((pid) => Number.isInteger(pid) && pid > 0);
    return new Set(pids);
  } catch {
    return new Set();
  }
}

async function stopManagedProcess(serverProcess) {
  if (!serverProcess || serverProcess.exitCode !== null) {
    return;
  }

  const exited = new Promise((resolve) => {
    serverProcess.once("exit", () => resolve(true));
  });

  serverProcess.kill("SIGINT");
  const graceful = await Promise.race([exited, delay(5_000).then(() => false)]);

  if (!graceful && serverProcess.exitCode === null) {
    serverProcess.kill("SIGKILL");
    await Promise.race([exited, delay(2_000)]);
  }
}

async function stopListeningProcesses(pids) {
  if (!pids.length) {
    return;
  }

  for (const pid of pids) {
    if (processAlive(pid)) {
      try {
        process.kill(pid, "SIGTERM");
      } catch {
        // Ignore missing or inaccessible processes.
      }
    }
  }

  await delay(500);

  for (const pid of pids) {
    if (processAlive(pid)) {
      try {
        process.kill(pid, "SIGKILL");
      } catch {
        // Ignore missing or inaccessible processes.
      }
    }
  }
}

async function withWebServer(options, action) {
  const {
    baseUrl,
    healthPath = "/table",
    startupTimeoutMs = 120_000,
    projectPath = "BlazorTables.csproj",
    launchProfile = "http"
  } = options;

  const healthUrl = new URL(healthPath, baseUrl);
  const port = Number.parseInt(
    healthUrl.port || (healthUrl.protocol === "https:" ? "443" : "80"),
    10
  );

  if (await waitForUrl(healthUrl, 1_000)) {
    return action();
  }

  const baselinePids = getListeningPids(port);
  const startupLog = [];
  const serverProcess = spawn(
    "dotnet",
    ["run", "--project", projectPath, "--launch-profile", launchProfile],
    { stdio: ["ignore", "pipe", "pipe"], env: process.env }
  );

  const captureLog = (chunk) => {
    startupLog.push(chunk.toString());
    if (startupLog.length > 50) {
      startupLog.shift();
    }
  };

  serverProcess.stdout.on("data", captureLog);
  serverProcess.stderr.on("data", captureLog);

  const exitedBeforeReady = new Promise((resolve) => {
    serverProcess.once("exit", (code, signal) => resolve({ code, signal }));
  });

  const readiness = await Promise.race([
    waitForUrl(healthUrl, startupTimeoutMs).then((ready) => ({ kind: "ready", ready })),
    exitedBeforeReady.then((result) => ({ kind: "exit", result }))
  ]);

  if (readiness.kind === "exit" || !readiness.ready) {
    await stopManagedProcess(serverProcess);
    const recentOutput = startupLog.join("").trim();
    throw new Error(
      `Failed to start web server for benchmarks.\n${recentOutput || "No server output captured."}`
    );
  }

  const activePids = getListeningPids(port);
  const managedPids = Array.from(activePids).filter((pid) => !baselinePids.has(pid));

  try {
    return await action();
  } finally {
    await stopManagedProcess(serverProcess);
    await stopListeningProcesses(managedPids);
  }
}

module.exports = {
  withWebServer
};
