import { useCallback, useEffect, useRef, useState } from "react";

const ENV_STORAGE_KEY = "perf-env";
const ENV_KEYS = ["AUTH_TOKEN"] as const;

type EnvRecord = Partial<Record<(typeof ENV_KEYS)[number], string>>;

function loadEnv(): EnvRecord {
  try {
    const raw = localStorage.getItem(ENV_STORAGE_KEY);
    if (raw) return JSON.parse(raw) as EnvRecord;
  } catch {
    /* ignore */
  }
  return {};
}

function saveEnv(env: EnvRecord) {
  try {
    localStorage.setItem(ENV_STORAGE_KEY, JSON.stringify(env));
  } catch {
    /* ignore */
  }
}

type Status = "idle" | "running" | "done" | "error";

export function TestRunner() {
  const [tests, setTests] = useState<string[]>([]);
  const [selectedTest, setSelectedTest] = useState<string>("");
  const [env, setEnv] = useState<EnvRecord>(loadEnv);
  const [logs, setLogs] = useState<string[]>([]);
  const [status, setStatus] = useState<Status>("idle");
  const [exitCode, setExitCode] = useState<number | null>(null);
  const [consoleFullscreen, setConsoleFullscreen] = useState(false);
  const eventSourceRef = useRef<EventSource | null>(null);
  const logEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  const fetchTests = useCallback(async () => {
    try {
      const res = await fetch("/api/k6/tests");
      if (!res.ok) throw new Error(res.statusText);
      const data = (await res.json()) as { tests: string[] };
      setTests(data.tests);
      if (data.tests.length > 0 && !selectedTest) setSelectedTest(data.tests[0] ?? "");
    } catch (e) {
      console.error("Failed to fetch tests", e);
      setTests([]);
    }
  }, [selectedTest]);

  useEffect(() => {
    fetchTests();
  }, [fetchTests]);

  const handleEnvChange = useCallback((key: (typeof ENV_KEYS)[number], value: string) => {
    setEnv((prev) => {
      const next = { ...prev, [key]: value };
      saveEnv(next);
      return next;
    });
  }, []);

  const startTest = useCallback(() => {
    if (status === "running") return;
    setLogs([]);
    setStatus("running");
    setExitCode(null);
    const params = new URLSearchParams();
    if (selectedTest) params.set("test", selectedTest);
    const envFiltered: Record<string, string> = {};
    for (const k of ENV_KEYS) {
      const v = env[k];
      if (v != null && v.trim() !== "") envFiltered[k] = v.trim();
    }
    if (Object.keys(envFiltered).length > 0) {
      params.set("env", btoa(JSON.stringify(envFiltered)));
    }
    const url = `/api/k6/run?${params.toString()}`;
    const es = new EventSource(url);
    eventSourceRef.current = es;

    es.addEventListener("log", (event) => {
      setLogs((prev) => [...prev, event.data]);
    });
    es.onmessage = (event) => {
      setLogs((prev) => [...prev, event.data]);
    };
    es.addEventListener("done", (event) => {
      try {
        const data = JSON.parse(event.data) as { exitCode?: number; error?: string };
        setExitCode(data.exitCode ?? null);
        setStatus(data.exitCode === 0 ? "done" : "error");
      } catch {
        setStatus("done");
      }
      es.close();
      eventSourceRef.current = null;
    });
    es.onerror = () => {
      es.close();
      eventSourceRef.current = null;
      setStatus("error");
    };
  }, [status, selectedTest, env]);

  const clearLogs = useCallback(() => {
    setLogs([]);
    if (status === "running") {
      eventSourceRef.current?.close();
      eventSourceRef.current = null;
      setStatus("idle");
    }
    setExitCode(null);
  }, [status]);

  const copyLogs = useCallback(() => {
    navigator.clipboard.writeText(logs.join("\n"));
  }, [logs]);

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-4 text-gray-900">k6 Load Test Center</h1>

      <div className="mb-4 flex flex-wrap items-center gap-4">
        <label className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-700">Test</span>
          <select
            className="rounded border border-gray-300 px-3 py-1.5 text-sm"
            value={selectedTest}
            onChange={(e) => setSelectedTest(e.target.value)}
            disabled={status === "running"}
          >
            <option value="">All tests (default)</option>
            {tests.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </label>
        <div className="flex items-center gap-2">
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${
              status === "idle"
                ? "bg-gray-200 text-gray-700"
                : status === "running"
                  ? "bg-blue-100 text-blue-800"
                  : status === "done"
                    ? "bg-green-100 text-green-800"
                    : "bg-red-100 text-red-800"
            }`}
          >
            {status === "idle" && "Idle"}
            {status === "running" && "Running..."}
            {status === "done" && `Done (exit ${exitCode ?? 0})`}
            {status === "error" && `Error (exit ${exitCode ?? "?"})`}
          </span>
        </div>
        <button
          type="button"
          onClick={startTest}
          disabled={status === "running"}
          className="rounded-lg bg-blue-600 px-6 py-2 text-white font-medium disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          {status === "running" ? "Test in progress…" : "Launch Load Test"}
        </button>
        <button
          type="button"
          onClick={clearLogs}
          className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
        >
          Clear
        </button>
      </div>

      <div className="mb-2 flex flex-wrap items-center justify-end gap-2">
        <button
          type="button"
          onClick={copyLogs}
          className="rounded border border-gray-400 bg-gray-800 px-3 py-1.5 text-xs text-gray-200 hover:bg-gray-700"
        >
          Copy logs
        </button>
        <button
          type="button"
          onClick={() => setConsoleFullscreen((prev) => !prev)}
          className="rounded border border-gray-400 bg-gray-800 px-3 py-1.5 text-xs text-gray-200 hover:bg-gray-700"
        >
          {consoleFullscreen ? "Exit fullscreen" : "Fullscreen"}
        </button>
      </div>

      <div className="mb-4 rounded-lg border border-gray-200 bg-white p-4">
        <h2 className="text-sm font-semibold text-gray-700 mb-2">AUTH_TOKEN (saved in localStorage)</h2>
        <div className="grid gap-2 sm:grid-cols-2">
          {ENV_KEYS.map((key) => (
            <label key={key} className="flex flex-col gap-1">
              <span className="text-xs text-gray-500">{key}</span>
              <input
                type={key === "AUTH_TOKEN" ? "password" : "text"}
                className="rounded border border-gray-300 px-2 py-1.5 text-sm"
                value={env[key] ?? ""}
                onChange={(e) => handleEnvChange(key, e.target.value)}
                placeholder={key}
                disabled={status === "running"}
              />
            </label>
          ))}
        </div>
      </div>

      <div
        className={
          consoleFullscreen
            ? "fixed inset-0 z-50 flex flex-col bg-black"
            : "rounded-lg bg-black text-green-400 p-4 font-mono text-sm h-96 overflow-y-auto"
        }
      >
        {consoleFullscreen && (
          <div className="shrink-0 flex justify-end p-4">
            <button
              type="button"
              onClick={() => setConsoleFullscreen(false)}
              className="rounded border border-green-400/50 px-3 py-1 text-green-400 text-sm hover:bg-green-400/10"
            >
              Exit fullscreen
            </button>
          </div>
        )}
        <div
          className={
            consoleFullscreen
              ? "flex-1 min-h-0 overflow-y-auto p-4 font-mono text-sm text-green-400"
              : ""
          }
        >
          {logs.length === 0 && (
            <div className="text-gray-500">Logs will appear here when you run a test.</div>
          )}
          {logs.map((line, i) => (
            <div key={i} className="whitespace-pre-wrap break-all">
              {line}
            </div>
          ))}
          <div ref={logEndRef} />
        </div>
      </div>
    </div>
  );
}
