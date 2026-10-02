import type { ApiClient } from "./http";

export function isTaskTerminal(status: string): boolean {
  return status === "SUCCEEDED" || status === "FAILED" || status === "CANCELLED";
}

export function foregroundPollDelayMs(pollAfterSeconds: number): number {
  return Math.min(5, Math.max(2, pollAfterSeconds)) * 1_000;
}

export async function readTaskStatus<T>(
  client: ApiClient,
  statusUrl: string,
  signal?: AbortSignal,
): Promise<T> {
  const options = signal === undefined ? undefined : { signal };
  const response = await client.request<T>(statusUrl, options);
  return response.data;
}
