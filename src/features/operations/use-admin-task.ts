"use client";

import { foregroundPollDelayMs, isTaskTerminal } from "@piao777/api-client";
import { useEffect, useState } from "react";
import { apiErrorMessage, getAdminTask } from "./operations-api";
import type { TaskAccepted, TaskStatusSummary } from "./operations-models";

export function useAdminTask() {
  const [accepted, setAccepted] = useState<TaskAccepted | null>(null);
  const [status, setStatus] = useState<TaskStatusSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (accepted === null) {
      return undefined;
    }
    let cancelled = false;
    let timeout: ReturnType<typeof setTimeout> | null = null;

    const poll = async () => {
      try {
        const next = await getAdminTask(accepted.statusUrl);
        if (cancelled) {
          return;
        }
        setStatus(next);
        setError(null);
        if (!isTaskTerminal(next.status)) {
          timeout = setTimeout(poll, foregroundPollDelayMs(accepted.pollAfterSeconds));
        }
      } catch (cause) {
        if (!cancelled) {
          setError(apiErrorMessage(cause));
        }
      }
    };

    timeout = setTimeout(poll, foregroundPollDelayMs(accepted.pollAfterSeconds));
    return () => {
      cancelled = true;
      if (timeout !== null) {
        clearTimeout(timeout);
      }
    };
  }, [accepted]);

  return {
    accepted,
    status,
    error,
    start(next: TaskAccepted) {
      setAccepted(next);
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
