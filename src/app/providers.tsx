"use client";

import type { ReactNode } from "react";
import { AdminSessionProvider } from "@/session/admin-session";

export function AppProviders({ children }: Readonly<{ children: ReactNode }>) {
  return <AdminSessionProvider>{children}</AdminSessionProvider>;
}
