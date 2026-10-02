"use client";

import { ApiError } from "@piao777/api-client";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { adminApi } from "@/lib/api";

export interface AdminIdentity {
  employeeId: string;
  account: string;
  permissions: readonly string[];
  scopeStationIds: readonly string[];
  expiresAt: string;
  mfaVerifiedAt: string | null;
  mfaEnrolled: boolean;
}

export type AdminSessionStatus =
  | "loading"
  | "anonymous"
  | "password-change-required"
  | "authenticated"
  | "error";

interface AdminSessionContextValue {
  status: AdminSessionStatus;
  identity: AdminIdentity | null;
  errorCode: string | null;
  refresh(): Promise<void>;
  clear(): void;
}

const AdminSessionContext = createContext<AdminSessionContextValue | null>(null);

export function AdminSessionProvider({
  children,
}: Readonly<{ children: ReactNode }>) {
  const [status, setStatus] = useState<AdminSessionStatus>("loading");
  const [identity, setIdentity] = useState<AdminIdentity | null>(null);
  const [errorCode, setErrorCode] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    adminApi.resetSecurityContext();
    setStatus("loading");
    setErrorCode(null);
    try {
      const response = await adminApi.request<unknown>("/api/admin/v1/auth/me");
      if (!isAdminIdentity(response.data)) {
        throw new TypeError("ADMIN_SESSION_RESPONSE_MISMATCH");
      }
      setIdentity(response.data);
      setStatus("authenticated");
    } catch (error) {
      setIdentity(null);
      if (error instanceof ApiError && error.problem.status === 401) {
        setStatus("anonymous");
        return;
      }
      if (error instanceof ApiError && error.problem.code === "PASSWORD_CHANGE_REQUIRED") {
        setStatus("password-change-required");
        return;
      }
      setErrorCode(error instanceof ApiError ? error.problem.code : "SESSION_UNAVAILABLE");
      setStatus("error");
    }
  }, []);

  const clear = useCallback(() => {
    adminApi.resetSecurityContext();
    setIdentity(null);
    setErrorCode(null);
    setStatus("anonymous");
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  // 同 portal：会话 30 分钟空闲过期，但页面本地状态不会自己变。任一请求报出会话已失效
  // 就翻成匿名，各页面既有的登录引导才会出现，而不是整页甩一个 UNAUTHENTICATED。
  // 只认 UNAUTHENTICATED / SESSION_INVALIDATED，不认 MFA_CODE_INVALID 这类同为 401
  // 的凭证校验失败——否则后台输错一次 MFA 验证码就会被踢出登录。
  // 同 portal：同一浏览器换账号登录会轮换 CSRF 令牌并顶掉上一个会话，其他标签页会卡在
  // "显示着旧账号、写操作全是 403 ACCESS_DENIED" 的状态。标签页重新获得焦点时重新核对身份。
  useEffect(() => {
    let last = 0;
    const revalidate = () => {
      if (document.visibilityState !== "visible") return;
      const now = Date.now();
      if (now - last < 5_000) return;
      last = now;
      void refresh();
    };
    window.addEventListener("focus", revalidate);
    document.addEventListener("visibilitychange", revalidate);
    return () => {
      window.removeEventListener("focus", revalidate);
      document.removeEventListener("visibilitychange", revalidate);
    };
  }, [refresh]);

  useEffect(() => adminApi.onSessionLost(() => {
    adminApi.resetSecurityContext();
    setIdentity(null);
    setErrorCode(null);
    setStatus("anonymous");
  }), []);

  const value = useMemo<AdminSessionContextValue>(() => ({
    status,
    identity,
    errorCode,
    refresh,
    clear,
  }), [clear, errorCode, identity, refresh, status]);

  return (
    <AdminSessionContext.Provider value={value}>
      {children}
    </AdminSessionContext.Provider>
  );
}

export function useAdminSession(): AdminSessionContextValue {
  const value = useContext(AdminSessionContext);
  if (value === null) {
    throw new Error("useAdminSession必须在AdminSessionProvider内使用");
  }
  return value;
}

function isAdminIdentity(value: unknown): value is AdminIdentity {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const candidate = value as Record<string, unknown>;
  return typeof candidate.employeeId === "string"
    && typeof candidate.account === "string"
    && isStringArray(candidate.permissions)
    && isStringArray(candidate.scopeStationIds)
    && typeof candidate.expiresAt === "string"
    && (candidate.mfaVerifiedAt === null || typeof candidate.mfaVerifiedAt === "string")
    && typeof candidate.mfaEnrolled === "boolean";
}

function isStringArray(value: unknown): value is readonly string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}
