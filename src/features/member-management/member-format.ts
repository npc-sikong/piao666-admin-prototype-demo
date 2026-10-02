export function formatPoints(value: string | null | undefined, signed = false): string {
  if (value === null || value === undefined) return "—";
  const match = /^(-?)([0-9]+)\.([0-9]{2})$/.exec(value);
  if (match === null) return value;
  const [, sign, integer, fraction] = match;
  const grouped = (integer ?? "0").replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  const prefix = sign === "-" ? "-" : signed && value !== "0.00" ? "+" : "";
  return `${prefix}${grouped}.${fraction}`;
}

export function formatCount(value: unknown): string {
  if (typeof value === "number" && Number.isInteger(value)) {
    return value.toLocaleString("zh-CN");
  }
  if (typeof value === "string" && /^[0-9]+$/.test(value)) {
    return value.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  }
  return "—";
}

export function formatRate(value: unknown): string {
  if (typeof value !== "string" || !/^-?[0-9]+(\.[0-9]{1,8})?$/.test(value)) {
    return "—";
  }
  const negative = value.startsWith("-");
  const normalized = negative ? value.slice(1) : value;
  const [whole, fraction = ""] = normalized.split(".");
  const digits = `${whole}${fraction}`;
  const scaled = BigInt(digits) * 100n;
  const decimalPlaces = fraction.length;
  const divisor = 10n ** BigInt(decimalPlaces);
  const quotient = scaled / divisor;
  const remainder = scaled % divisor;
  const decimal = remainder === 0n
    ? ""
    : `.${remainder.toString().padStart(decimalPlaces, "0").replace(/0+$/, "")}`;
  return `${negative ? "-" : ""}${quotient}${decimal}%`;
}

export function formatDateTime(value: string | null | undefined): string {
  if (value === null || value === undefined) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
    timeZone: "Asia/Shanghai",
  }).format(date);
}

export function pointsTone(value: string): "positive" | "negative" | "neutral" {
  if (value.startsWith("-")) return "negative";
  return value === "0.00" ? "neutral" : "positive";
}

export function metricText(
  source: Readonly<Record<string, unknown>>,
  key: string,
  kind: "points" | "count" | "rate" = "points",
): string {
  const value = source[key];
  if (kind === "count") return formatCount(value);
  if (kind === "rate") return formatRate(value);
  return typeof value === "string" ? formatPoints(value) : "—";
}

export function nameRef(value: unknown): { id: string; code: string; name: string } | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return null;
  const candidate = value as Record<string, unknown>;
  return typeof candidate.id === "string"
    && typeof candidate.code === "string"
    && typeof candidate.name === "string"
    ? { id: candidate.id, code: candidate.code, name: candidate.name }
    : null;
}
