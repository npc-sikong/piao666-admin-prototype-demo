import {
  formatLotteryNumber,
  numberAreaPresentation,
  type LotteryCode,
} from "@piao777/ui-tokens";
import styles from "./number-balls.module.css";

export interface NumberBallArea {
  key: string;
  chosen: readonly number[];
}

interface NumberBallsProps {
  lotteryCode: LotteryCode;
  areas: readonly NumberBallArea[];
}

export function NumberBalls({ lotteryCode, areas }: NumberBallsProps) {
  const ordered = [...areas].sort((left, right) => (
    numberAreaPresentation(lotteryCode, left.key).order
      - numberAreaPresentation(lotteryCode, right.key).order
  ));
  return (
    <div className={styles.root}>
      {ordered.map((area) => {
        const presentation = numberAreaPresentation(lotteryCode, area.key);
        const numbers = area.chosen.map((value) => (
          formatLotteryNumber(lotteryCode, area.key, value)
        ));
        return (
          <div className={styles.area} key={area.key}>
            <span className={styles.label}>{presentation.label}</span>
            <div
              className={styles.balls}
              aria-label={`${presentation.label} ${numbers.join(" ")}`}
            >
              {numbers.map((number, index) => (
                <span
                  className={styles.ball}
                  data-number-tone={presentation.tone}
                  key={`${area.key}-${number}-${index}`}
                >
                  {number}
                </span>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
