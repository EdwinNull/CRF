/**
 * 自动计算逻辑 (plan.md §7)
 * 所有计算均在调用侧实时触发，纯函数。
 */
import type {
  VASScores,
  SymptomFourScale,
  RQLQScores,
  TCMScores,
  MedScore,
} from '../types/visit';

/** BMI = 体重(kg) / (身高(m))^2，保留 1 位小数 */
export function calcBMI(weight: number, height: number): number {
  if (!weight || !height) return 0;
  const m = height / 100;
  return round1(weight / (m * m));
}

/** VAS 总分 = 6 项之和 */
export function calcVASTotal(s: Omit<VASScores, 'total'>): number {
  return round1(
    s.sneeze +
      s.rhinorrhea +
      s.nasalItch +
      s.nasalCongestion +
      s.eyeItch +
      s.lacrimation,
  );
}

/** 四分法鼻部总分 = 前 4 项之和 */
export function calcNasalTotal(s: SymptomFourScale): number {
  return s.sneeze + s.rhinorrhea + s.nasalItch + s.nasalCongestion;
}

/** 四分法鼻眼总分 = 全 6 项之和 */
export function calcSymptomTotal(s: SymptomFourScale): number {
  return (
    s.sneeze + s.rhinorrhea + s.nasalItch + s.nasalCongestion + s.eyeItch + s.lacrimation
  );
}

/** 任意 numeric 数组求和 */
export function sumNumbers(arr: number[]): number {
  return arr.reduce((a, b) => a + (Number.isFinite(b) ? b : 0), 0);
}

/** RQLQ 总分 = 27 项之和 */
export function calcRQLQTotal(s: Omit<RQLQScores, 'total'>): number {
  return sumNumbers([
    ...s.activityLimit,
    ...s.sleep,
    ...s.nonNasalEye,
    ...s.practicalProblems,
    ...s.nasalSymptoms,
    ...s.eyeSymptoms,
    ...s.emotion,
  ]);
}

/** 中医证候积分 = 主症4项 + 次症5项（不含 text 字段） */
export function calcTCMTotal(
  s: Pick<TCMScores, 'nasalItch' | 'sneeze' | 'rhinorrhea' | 'nasalCongestion' | 'windColdAversion' | 'bodyAche' | 'sweating' | 'cough' | 'paleFace'>,
): number {
  return (
    s.nasalItch +
    s.sneeze +
    s.rhinorrhea +
    s.nasalCongestion +
    s.windColdAversion +
    s.bodyAche +
    s.sweating +
    s.cough +
    s.paleFace
  );
}

/** 单类用药计分 = 每日计分 × 天数 */
export function drugTypeTotal(pointsPerDay: number, days: number): number {
  return pointsPerDay * days;
}

/** 药物评分总分 */
export function calcMedScoreTotal(score: MedScore): number {
  return (
    drugTypeTotal(1, score.oralAntihistamine.days) +
    drugTypeTotal(1, score.nasalAntihistamine.days) +
    drugTypeTotal(1, score.eyeAntihistamine.days) +
    drugTypeTotal(2, score.nasalSteroid.days) +
    drugTypeTotal(3, score.oralCorticosteroid.days)
  );
}

/** 依从性 = (应服 - 剩余)/应服 × 100%，越界返回 null 让调用方处理 */
export function calcCompliance(expected: number, returned: number): number {
  if (!expected) return 0;
  return round1(((expected - returned) / expected) * 100);
}

/** 疗效指数 = (治疗前 - 治疗后)/治疗前 × 100% */
export function calcEfficacyIndex(baseline: number, current: number): number | null {
  if (!baseline) return null; // 治疗前积分为 0 无法计算
  return round1(((baseline - current) / baseline) * 100);
}

/** 疗效等级判定 */
export function getEfficacyLevel(index: number): '临床控制' | '显效' | '有效' | '无效' {
  if (index >= 90) return '临床控制';
  if (index >= 70) return '显效';
  if (index >= 30) return '有效';
  return '无效';
}

/** VAS 严重程度文字 (1-3轻度 4-7中度 8-10重度) */
export function vasSeverity(n: number): '轻度' | '中度' | '重度' {
  if (n <= 3) return '轻度';
  if (n <= 7) return '中度';
  return '重度';
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}
