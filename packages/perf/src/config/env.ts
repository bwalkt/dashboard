const PERF_WORKSPACE = process.env.PERF_WORKSPACE ?? "/app/perf-dist";
const PORT = parseInt(process.env.PORT ?? "8099", 10);

export const config = {
  PERF_WORKSPACE,
  PORT,
} as const;
