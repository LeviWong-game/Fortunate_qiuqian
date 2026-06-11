export type RuntimeEnv = Record<string, string | undefined>;

export function readProcessEnv(): RuntimeEnv {
  if (typeof process === "undefined") return {};
  return process.env as RuntimeEnv;
}

export function readEnv(env?: RuntimeEnv): RuntimeEnv {
  return env || readProcessEnv();
}

