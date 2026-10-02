export type LotteryCode = "SSQ" | "DLT" | "FC3D" | "PL3" | "PL5" | "QLC" | "KL8" | "QXC";

export type NumberTone =
  | "red" | "blue" | "cyan" | "yellow" | "amber" | "orange"
  | "vermilion" | "purple" | "indigo" | "gold" | "neutral";

export interface NumberAreaPresentation {
  key: string;
  label: string;
  tone: NumberTone;
  minimumDigits: number;
  order: number;
}

// 官方首页开奖球配色（2026-09-29 核对）：
// https://www.cwl.gov.cn/ · https://www.lottery.gov.cn/
const presentation: Readonly<Record<LotteryCode, readonly NumberAreaPresentation[]>> = {
  SSQ: [
    area("RED", "红球", "red", 2, 0),
    area("BLUE", "蓝球", "blue", 2, 1),
  ],
  DLT: [
    area("FRONT", "前区", "blue", 2, 0),
    area("BACK", "后区", "yellow", 2, 1),
  ],
  FC3D: positional(3, "cyan"),
  PL3: positional(3, "purple"),
  PL5: positional(5, "purple"),
  QLC: [
    area("BASIC", "基本号", "amber", 2, 0),
    area("SPECIAL", "特别号", "orange", 2, 1),
  ],
  KL8: [area("MAIN", "开奖号码", "vermilion", 2, 0)],
  QXC: [
    ...positional(6, "indigo"),
    area("LAST", "末位", "gold", 1, 6),
  ],
};

export function numberAreaPresentations(
  lotteryCode: LotteryCode,
): readonly NumberAreaPresentation[] {
  return presentation[lotteryCode];
}

export function numberAreaPresentation(
  lotteryCode: LotteryCode,
  areaKey: string,
): NumberAreaPresentation {
  return presentation[lotteryCode].find((item) => item.key === areaKey)
    ?? area(areaKey, areaKey, "neutral", 1, 99);
}

export function formatLotteryNumber(
  lotteryCode: LotteryCode,
  areaKey: string,
  value: number,
): string {
  const area = numberAreaPresentation(lotteryCode, areaKey);
  return value.toString().padStart(area.minimumDigits, "0");
}

function positional(count: number, tone: NumberTone): readonly NumberAreaPresentation[] {
  return Array.from({ length: count }, (_, index) => (
    area(`P${index + 1}`, `第${index + 1}位`, tone, 1, index)
  ));
}

function area(
  key: string,
  label: string,
  tone: NumberTone,
  minimumDigits: number,
  order: number,
): NumberAreaPresentation {
  return { key, label, tone, minimumDigits, order };
}
