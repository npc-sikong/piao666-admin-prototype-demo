declare const pointsBrand: unique symbol;
declare const aggregatePointsBrand: unique symbol;

export type Points = string & { readonly [pointsBrand]: "Points" };
export type AggregatePoints = string & {
  readonly [aggregatePointsBrand]: "AggregatePoints";
};

export function formatPoints(value: string | null | undefined): string {
  if (value === null || value === undefined) {
    return "—";
  }
  const match = /^(-?)([0-9]+)\.([0-9]{2})$/.exec(value);
  if (match === null) {
    return value;
  }
  const [, sign, integer, fraction] = match;
  const grouped = integer?.replace(/\B(?=(\d{3})+(?!\d))/g, ",") ?? "0";
  return `${sign ?? ""}${grouped}.${fraction ?? "00"}`;
}

/**
 * 积分金额转最小单位（0.01积分）。格式不符合预期时返回 null，
 * 由调用方按"未知"处理，不做猜测性回退。
 */
export function pointsToMinor(value: string | null | undefined): bigint | null {
  if (value === null || value === undefined) {
    return null;
  }
  const match = /^(-?)([0-9]+)\.([0-9]{2})$/.exec(value);
  if (match === null) {
    return null;
  }
  const [, sign, integer, fraction] = match;
  const minor = BigInt(integer ?? "0") * 100n + BigInt(fraction ?? "0");
  return sign === "-" ? -minor : minor;
}

/** 最小单位还原为两位小数的积分字符串。 */
export function pointsFromMinor(minor: bigint): string {
  const negative = minor < 0n;
  const absolute = negative ? -minor : minor;
  return `${negative ? "-" : ""}${absolute / 100n}.${(absolute % 100n)
    .toString()
    .padStart(2, "0")}`;
}

/**
 * 两个积分金额相减。资产金额一律按最小单位做 BigInt 整数运算，不经过浮点数。
 * 任一侧格式不符合预期时返回 null。
 */
export function subtractPoints(
  left: string | null | undefined,
  right: string | null | undefined,
): string | null {
  const leftMinor = pointsToMinor(left);
  const rightMinor = pointsToMinor(right);
  if (leftMinor === null || rightMinor === null) {
    return null;
  }
  return pointsFromMinor(leftMinor - rightMinor);
}

/**
 * 实际净收益率 =（返还 − 投入）÷ 投入，输出百分比文本（最多 4 位小数）。
 *
 * 全程 BigInt 整数运算。返还为空表示尚未结算，返回 null 由调用方显示"待开奖"；
 * 收益率为 0 是有效结果，会照常输出 "0%"，调用方不应拿目标收益率顶替。
 */
export function netReturnRateText(
  investedPoints: string | null | undefined,
  returnedPoints: string | null | undefined,
): string | null {
  const invested = pointsToMinor(investedPoints);
  const returned = pointsToMinor(returnedPoints);
  if (invested === null || returned === null || invested === 0n) {
    return null;
  }
  // 放大 10^6 后取整 = 百分比下保留 4 位小数
  const scaled = ((returned - invested) * 1_000_000n) / invested;
  const negative = scaled < 0n;
  const absolute = negative ? -scaled : scaled;
  const whole = absolute / 10_000n;
  const fraction = (absolute % 10_000n).toString().padStart(4, "0").replace(/0+$/, "");
  return `${negative ? "-" : ""}${whole}${fraction === "" ? "" : `.${fraction}`}%`;
}
