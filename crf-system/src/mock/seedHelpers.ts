/**
 * Mock 数据内部工具：计算派生总分。复用 utils/scoring 的纯函数。
 */
import type { VisitData } from '../types/visit';
import { calcVASTotal, calcNasalTotal, calcSymptomTotal, calcRQLQTotal, calcTCMTotal } from '../utils/scoring';

export function calcBMI(weight: number, height: number): number {
  if (!weight || !height) return 0;
  const m = height / 100;
  return Math.round((weight / (m * m)) * 10) / 10;
}

/** 就地刷新某一访视的全部派生总分（total 字段） */
export function refreshScores(v: VisitData): void {
  v.vasScores.total = calcVASTotal(v.vasScores);
  v.symptomFourScale.nasalTotal = calcNasalTotal(v.symptomFourScale);
  v.symptomFourScale.totalScore = calcSymptomTotal(v.symptomFourScale);
  v.rqlqScores.total = calcRQLQTotal(v.rqlqScores);
  v.tcmScores.total = calcTCMTotal(v.tcmScores);
  if (v.medScore) {
    v.medScore.grandTotal =
      v.medScore.oralAntihistamine.total +
      v.medScore.nasalAntihistamine.total +
      v.medScore.eyeAntihistamine.total +
      v.medScore.nasalSteroid.total +
      v.medScore.oralCorticosteroid.total;
  }
}
