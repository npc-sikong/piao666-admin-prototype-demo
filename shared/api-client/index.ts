export * from "./http";
export * from "./points";
export * from "./tasks";

/**
 * 业务请求/响应类型仍由 `pnpm contracts:generate` 生成到 `./generated`。
 * P2 只建立运行时接入，P3 统一执行并核对代码生成。
 */
export const apiClientStatus = "RUNTIME_READY_CODEGEN_PENDING_P3" as const;
