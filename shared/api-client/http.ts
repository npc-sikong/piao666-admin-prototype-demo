export type SecurityRealm = "portal" | "admin";

export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export interface ApiMeta {
  requestId: string;
  traceId: string;
  serverTime: string;
}

export interface ApiEnvelope<T> {
  data: T;
  meta: ApiMeta;
}

export interface ApiFieldError {
  pointer: string;
  code: string;
  message: string;
}

export interface ApiProblem {
  type: string;
  title: string;
  status: number;
  detail?: string;
  instance?: string;
  code: string;
  requestId: string;
  traceId: string;
  retryable: boolean;
  errors?: readonly ApiFieldError[];
}

export type SubmissionOutcome = "REJECTED" | "UNKNOWN" | "READ_FAILED";

export class ApiError extends Error {
  readonly problem: ApiProblem;
  readonly retryAfterSeconds: number | null;
  readonly submissionOutcome: SubmissionOutcome;

  constructor(
    problem: ApiProblem,
    retryAfterSeconds: number | null,
    submissionOutcome: SubmissionOutcome,
  ) {
    super(problem.title);
    this.name = "ApiError";
    this.problem = problem;
    this.retryAfterSeconds = retryAfterSeconds;
    this.submissionOutcome = submissionOutcome;
  }
}

export class ApiTransportError extends Error {
  readonly submissionOutcome: SubmissionOutcome;

  constructor(submissionOutcome: SubmissionOutcome, cause: unknown) {
    super("无法连接服务，请保留当前操作状态并稍后查询结果", { cause });
    this.name = "ApiTransportError";
    this.submissionOutcome = submissionOutcome;
  }
}

export interface ApiResponse<T> {
  data: T;
  meta: ApiMeta | null;
  status: number;
  etag: string | null;
  location: string | null;
  retryAfterSeconds: number | null;
}

export type QueryValue =
  | string
  | number
  | boolean
  | readonly string[]
  | null
  | undefined;

export interface ApiRequestOptions {
  method?: HttpMethod;
  query?: Readonly<Record<string, QueryValue>>;
  body?: unknown;
  idempotencyKey?: string;
  ifMatch?: string;
  actionToken?: string;
  signal?: AbortSignal;
  timeoutMs?: number;
  cache?: RequestCache;
}

export interface ApiClient {
  readonly realm: SecurityRealm;
  request<T>(path: string, options?: ApiRequestOptions): Promise<ApiResponse<T>>;
  resetSecurityContext(): void;
  /**
   * 订阅"服务端会话已经没了"，返回取消订阅函数。
   *
   * 会话是 30 分钟空闲过期。页面停在那儿不动时前端收不到任何通知，本地登录态会一直
   * 停在"已登录"，于是顶栏显示着账号、内容区却甩一个裸 UNAUTHENTICATED。会话提供方
   * 订阅这里，把本地状态翻成匿名，各页面既有的"前往登录"引导就能正常出现。
   *
   * 只认 {@link SESSION_LOST_CODES} 这两个错误码，不是所有 401 都算。MFA 验证码错误、
   * 站长操作密码错误、登录密码错误同样是 401，但那是凭证校验失败，不是会话没了——
   * 一刀切会变成"输错一次验证码就被踢出登录"。
   */
  onSessionLost(listener: () => void): () => void;
}

/**
 * 401 里真正代表"会话已经不存在"的错误码。
 * UNAUTHENTICATED：没有会话或会话已过期；SESSION_INVALIDATED：账号状态或权限版本变了。
 */
export const SESSION_LOST_CODES: ReadonlySet<string> = new Set([
  "UNAUTHENTICATED",
  "SESSION_INVALIDATED",
]);

export interface ApiClientOptions {
  realm: SecurityRealm;
  fetcher?: typeof fetch;
}

class SameOriginApiClient implements ApiClient {
  readonly realm: SecurityRealm;
  private readonly fetcher: typeof fetch;
  private csrfToken: string | null = null;
  private csrfRequest: Promise<string> | null = null;
  private readonly sessionLostListeners = new Set<() => void>();

  constructor(options: ApiClientOptions) {
    this.realm = options.realm;
    this.fetcher = options.fetcher ?? fetch;
  }

  resetSecurityContext(): void {
    this.csrfToken = null;
    this.csrfRequest = null;
  }

  onSessionLost(listener: () => void): () => void {
    this.sessionLostListeners.add(listener);
    return () => {
      this.sessionLostListeners.delete(listener);
    };
  }

  async request<T>(
    path: string,
    options: ApiRequestOptions = {},
  ): Promise<ApiResponse<T>> {
    const method = options.method ?? "GET";
    const requestPath = appendQuery(requireRealmPath(this.realm, path), options.query);
    const signal = createRequestSignal(options.signal, options.timeoutMs);
    const headers = new Headers({
      Accept: "application/json, application/problem+json",
      "X-Request-Id": createRequestId(),
    });

    if (options.body !== undefined) {
      headers.set("Content-Type", "application/json");
    }
    if (options.idempotencyKey !== undefined) {
      headers.set("Idempotency-Key", options.idempotencyKey);
    }
    if (options.ifMatch !== undefined) {
      headers.set("If-Match", options.ifMatch);
    }
    if (options.actionToken !== undefined) {
      headers.set("X-Action-Token", options.actionToken);
    }
    if (isMutation(method)) {
      headers.set("X-CSRF-Token", await this.requireCsrf(signal));
    }

    const init: RequestInit = {
      method,
      headers,
      credentials: "same-origin",
      cache: options.cache ?? "no-store",
    };
    if (options.body !== undefined) {
      init.body = JSON.stringify(options.body);
    }
    init.signal = signal;

    let response: Response;
    try {
      response = await this.fetcher(requestPath, init);
    } catch (error) {
      throw new ApiTransportError(outcomeForTransport(method), error);
    }

    const retryAfterSeconds = readRetryAfter(response.headers);
    if (!response.ok) {
      if (response.status === 401) {
        this.resetSecurityContext();
      }
      const problem = await readProblem(response);
      if (response.status === 401 && SESSION_LOST_CODES.has(problem.code)) {
        // 复制一份再遍历：监听器里取消订阅不应影响本次分发。
        for (const listener of [...this.sessionLostListeners]) {
          listener();
        }
      }
      throw new ApiError(
        problem,
        retryAfterSeconds,
        outcomeForResponse(method, response.status),
      );
    }
    if (isSecurityContextMutation(method, requestPath)) {
      this.resetSecurityContext();
    }

    if (response.status === 204) {
      return responseDetails(response, undefined as T, null, retryAfterSeconds);
    }

    const payload: unknown = await response.json();
    if (!isEnvelope(payload)) {
      throw new ApiTransportError(outcomeForTransport(method), "INVALID_API_ENVELOPE");
    }
    return responseDetails(
      response,
      payload.data as T,
      payload.meta,
      retryAfterSeconds,
    );
  }

  private requireCsrf(signal?: AbortSignal): Promise<string> {
    if (this.csrfToken !== null) {
      return Promise.resolve(this.csrfToken);
    }
    if (this.csrfRequest !== null) {
      return this.csrfRequest;
    }
    this.csrfRequest = this.loadCsrf(signal).finally(() => {
      this.csrfRequest = null;
    });
    return this.csrfRequest;
  }

  private async loadCsrf(signal?: AbortSignal): Promise<string> {
    const path = this.realm === "portal"
      ? "/api/v1/auth/csrf"
      : "/api/admin/v1/auth/csrf";
    const headers = new Headers({
      Accept: "application/json, application/problem+json",
      "X-Request-Id": createRequestId(),
    });
    const init: RequestInit = {
      method: "GET",
      headers,
      credentials: "same-origin",
      cache: "no-store",
    };
    if (signal !== undefined) {
      init.signal = signal;
    }

    let response: Response;
    try {
      response = await this.fetcher(path, init);
    } catch (error) {
      throw new ApiTransportError("READ_FAILED", error);
    }
    if (!response.ok) {
      throw new ApiError(
        await readProblem(response),
        readRetryAfter(response.headers),
        "READ_FAILED",
      );
    }
    const payload: unknown = await response.json();
    if (!isEnvelope(payload) || !isCsrfData(payload.data)) {
      throw new ApiTransportError("READ_FAILED", "INVALID_CSRF_ENVELOPE");
    }
    this.csrfToken = payload.data.csrfToken;
    return this.csrfToken;
  }
}

export function createApiClient(options: ApiClientOptions): ApiClient {
  return new SameOriginApiClient(options);
}

/** 每次用户意图只生成一次；超时和原请求重试必须复用返回值。 */
export function createIdempotencyKey(operationId: string): string {
  const normalized = operationId.replace(/[^A-Za-z0-9._:-]/g, "-").slice(0, 72);
  return `${normalized}:${crypto.randomUUID()}`;
}

function createRequestId(): string {
  return `web:${crypto.randomUUID()}`;
}

function createRequestSignal(
  externalSignal: AbortSignal | undefined,
  timeoutMs = 20_000,
): AbortSignal {
  const timeoutSignal = AbortSignal.timeout(timeoutMs);
  return externalSignal === undefined
    ? timeoutSignal
    : AbortSignal.any([externalSignal, timeoutSignal]);
}

/** 两个安全域共用的会话级端点：登录态不区分 realm，两边客户端都允许调用。 */
const SHARED_SESSION_PATHS = ["/api/v1/me/password"] as const;

function requireRealmPath(realm: SecurityRealm, path: string): string {
  if (!path.startsWith("/") || path.startsWith("//") || path.includes("#")) {
    throw new TypeError("API路径必须是同源绝对路径");
  }
  const normalized = new URL(path, "https://same-origin.invalid");
  if (SHARED_SESSION_PATHS.some((shared) => normalized.pathname === shared)) {
    return `${normalized.pathname}${normalized.search}`;
  }
  const prefix = realm === "portal" ? "/api/v1/" : "/api/admin/v1/";
  if (!normalized.pathname.startsWith(prefix)) {
    throw new TypeError(`API路径不属于${realm}安全域`);
  }
  return `${normalized.pathname}${normalized.search}`;
}

function appendQuery(
  path: string,
  query: Readonly<Record<string, QueryValue>> | undefined,
): string {
  if (query === undefined) {
    return path;
  }
  const separator = path.indexOf("?");
  const pathname = separator < 0 ? path : path.slice(0, separator);
  const current = separator < 0 ? "" : path.slice(separator + 1);
  const parameters = new URLSearchParams(current);
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null) {
      continue;
    }
    parameters.delete(key);
    if (Array.isArray(value)) {
      value.forEach((item) => parameters.append(key, item));
    } else {
      parameters.set(key, String(value));
    }
  }
  const serialized = parameters.toString();
  return serialized.length === 0 ? pathname : `${pathname}?${serialized}`;
}

function isMutation(method: HttpMethod): boolean {
  return method !== "GET";
}

function isSecurityContextMutation(method: HttpMethod, path: string): boolean {
  return isMutation(method) && (
    path.startsWith("/api/v1/auth/")
      || path.startsWith("/api/admin/v1/auth/")
      || path.startsWith("/api/v1/me/password")
  );
}

function outcomeForTransport(method: HttpMethod): SubmissionOutcome {
  return isMutation(method) ? "UNKNOWN" : "READ_FAILED";
}

function outcomeForResponse(method: HttpMethod, status: number): SubmissionOutcome {
  if (!isMutation(method)) {
    return "READ_FAILED";
  }
  return status >= 500 ? "UNKNOWN" : "REJECTED";
}

function responseDetails<T>(
  response: Response,
  data: T,
  meta: ApiMeta | null,
  retryAfterSeconds: number | null,
): ApiResponse<T> {
  return {
    data,
    meta,
    status: response.status,
    etag: response.headers.get("ETag"),
    location: response.headers.get("Location"),
    retryAfterSeconds,
  };
}

function isEnvelope(value: unknown): value is ApiEnvelope<unknown> {
  if (!isRecord(value) || !("data" in value) || !isRecord(value.meta)) {
    return false;
  }
  return typeof value.meta.requestId === "string"
    && typeof value.meta.traceId === "string"
    && typeof value.meta.serverTime === "string";
}

function isCsrfData(value: unknown): value is { csrfToken: string } {
  return isRecord(value) && typeof value.csrfToken === "string";
}

async function readProblem(response: Response): Promise<ApiProblem> {
  let payload: unknown = null;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }
  if (isProblem(payload)) {
    return payload;
  }
  const requestId = response.headers.get("X-Request-Id") ?? "unknown-request";
  return {
    type: "urn:lottery-platform:problem:INVALID_ERROR_RESPONSE",
    title: "服务返回了无法识别的错误",
    status: response.status,
    code: "INVALID_ERROR_RESPONSE",
    requestId,
    traceId: "00000000000000000000000000000000",
    retryable: response.status >= 500,
  };
}

function isProblem(value: unknown): value is ApiProblem {
  return isRecord(value)
    && typeof value.type === "string"
    && typeof value.title === "string"
    && typeof value.status === "number"
    && typeof value.code === "string"
    && typeof value.requestId === "string"
    && typeof value.traceId === "string"
    && typeof value.retryable === "boolean";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function readRetryAfter(headers: Headers): number | null {
  const value = headers.get("Retry-After");
  if (value === null || !/^[0-9]+$/.test(value)) {
    return null;
  }
  return Number(value);
}
