"use client";

import { foregroundPollDelayMs, isTaskTerminal } from "@piao777/api-client";
import { useEffect, useState } from "react";
import { errorView, getTask } from "./ai-management-api";
import type { TaskAccepted, TaskStatus } from "./ai-management-models";

export function useAiTask() {
  const [accepted, setAccepted] = useState<TaskAccepted | null>(null);
  const [status, setStatus] = useState<TaskStatus | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (accepted === null) return undefined;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const poll = async () => {
      try {
        const next = await getTask(accepted.taskId);
        if (cancelled) return;
        setStatus(next);
        setError(null);
        if (!isTaskTerminal(next.status)) {
          timer = setTimeout(poll, foregroundPollDelayMs(accepted.pollAfterSeconds));
        }
      } catch (cause) {
        if (!cancelled) setError(errorView(cause).message);
      }
    };

    timer = setTimeout(poll, foregroundPollDelayMs(accepted.pollAfterSeconds));
    return () => {
      cancelled = true;
      if (timer !== null) clearTimeout(timer);
    };
  }, [accepted]);

  return {
    accepted,
    status,
    error,
    start(value: TaskAccepted) {
      setAccepted(value);
      setStatus(null);
      setError(null);
    },
    clear() {
      setAccepted(null);
      setStatus(null);
      setError(null);
    },
  };
}
