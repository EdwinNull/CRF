/**
 * 访视数据类型定义
 * 对应 plan.md §3.2。各访视节点使用字段的子集。
 */

export type VisitNo = 'V1' | 'V2' | 'V3' | 'V4' | 'V5' | 'V6';

export interface VitalSigns {
  temperature: number; // ℃ 1位小数
  pulse: number; // 次/分
  systolicBP: number;
  diastolicBP: number;
  respiration: number; // 次/分
}

export interface VASScores {
  sneeze: number;
  rhinorrhea: number;
  nasalItch: number;
  nasalCongestion: number;
  eyeItch: number;
  lacrimation: number;
  total: number; // 自动求和
}

export interface SymptomFourScale {
  sneeze: 0 | 1 | 2 | 3;
  rhinorrhea: 0 | 1 | 2 | 3;
  nasalItch: 0 | 1 | 2 | 3;
  nasalCongestion: 0 | 1 | 2 | 3;
  eyeItch: 0 | 1 | 2 | 3;
  lacrimation: 0 | 1 | 2 | 3;
  nasalTotal: number; // 前4项求和
  totalScore: number; // 6项求和
}

export interface RQLQScores {
  activityLimit: [number, number, number];
  sleep: [number, number, number];
  nonNasalEye: [number, number, number, number, number, number, number];
  practicalProblems: [number, number, number];
  nasalSymptoms: [number, number, number, number];
  eyeSymptoms: [number, number, number, number];
  emotion: [number, number, number, number];
  total: number; // 28项求和
}

export interface TCMScores {
  // 主症 0/2/4/6
  nasalItch: 0 | 2 | 4 | 6;
  sneeze: 0 | 2 | 4 | 6;
  rhinorrhea: 0 | 2 | 4 | 6;
  nasalCongestion: 0 | 2 | 4 | 6;
  // 次症 0/1/2/3
  windColdAversion: 0 | 1 | 2 | 3; // 恶风畏寒
  bodyAche: 0 | 1 | 2 | 3;
  sweating: 0 | 1 | 2 | 3;
  cough: 0 | 1 | 2 | 3;
  paleFace: 0 | 1 | 2 | 3;
  tongueDesc: string;
  pulseDesc: string;
  total: number; // 主症+次症求和
}

export interface MedScoreItem {
  selected: boolean;
  days: number;
  total: number;
}

export interface MedScore {
  oralAntihistamine: MedScoreItem; // 每日1分
  nasalAntihistamine: MedScoreItem; // 每日1分
  eyeAntihistamine: MedScoreItem; // 每日1分
  nasalSteroid: MedScoreItem; // 每日2分
  oralCorticosteroid: MedScoreItem; // 每日3分
  grandTotal: number;
}

export type LabStatus =
  | 'not_done'
  | 'normal'
  | 'abnormal_no_significance'
  | 'abnormal_significant';

export interface LabItem<T> {
  value: T;
  status: LabStatus;
}

export interface LabBloodRoutine {
  sampleDate: string;
  hb: LabItem<number | null> & { unit: 'g/L' };
  rbc: LabItem<number | null> & { unit: '10^12/L' };
  wbc: LabItem<number | null> & { unit: '10^9/L' };
  neu: LabItem<number | null> & { unit: '10^9/L' };
  eos: LabItem<number | null> & { unit: '10^9/L' };
  bas: LabItem<number | null> & { unit: '10^9/L' };
  lym: LabItem<number | null> & { unit: '10^9/L' };
  plt: LabItem<number | null> & { unit: '10^9/L' };
}

export interface LabUrinalysis {
  sampleDate: string;
  protein: LabItem<string>;
  glucose: LabItem<string>;
  ketone: LabItem<string>;
  occultBlood: LabItem<string>;
  leukocyte: LabItem<string>;
}

export interface LabBiochemistry {
  sampleDate: string;
  alt: LabItem<number | null> & { unit: 'U/L' };
  ast: LabItem<number | null> & { unit: 'U/L' };
  bun: LabItem<number | null> & { unit: 'mmol/L' };
  cr: LabItem<number | null> & { unit: 'μmol/L' };
}

export interface FeNO {
  done: boolean;
  testDate?: string;
  oralValue?: number; // ppb
  oralStatus?: '正常' | '升高';
  nasalValue?: number; // ppb
  nasalStatus?: '正常' | '升高';
}

export interface ECG {
  done: boolean;
  testDate?: string;
  result?: '正常' | '异常无临床意义' | '异常有临床意义';
  detail?: string;
}

export interface SerumIgE {
  done: boolean;
  testDate?: string;
  value?: number;
}

export interface EfficacyAssessment {
  efficacyIndex: number | null; // 百分比 自动计算
  efficacyLevel: '临床控制' | '显效' | '有效' | '无效' | null;
  allSymptomsRelieved: boolean;
  reliefDate?: string;
  currentSymptoms?: string;
  worsened: boolean;
  worsenedDetail?: string;
  newComplication: boolean;
  newComplicationDetail?: string;
}

export interface DrugRecovery {
  returnedCount: number;
  expectedCount: number;
  compliance: number; // 自动计算
  dispensedCount: number;
}

export type VisitStatus = 'not_started' | 'draft' | 'submitted';

export interface VisitData {
  visitNo: VisitNo;
  visitDate: string;
  status: VisitStatus;

  vitalSigns: VitalSigns;
  vasScores: VASScores;
  symptomFourScale: SymptomFourScale;
  rqlqScores: RQLQScores;
  tcmScores: TCMScores;

  // 按访视节点有无而定
  labBlood?: LabBloodRoutine; // V1, V3, V4
  labUrine?: LabUrinalysis; // V1, V3, V4
  labBiochem?: LabBiochemistry; // V1, V3, V4
  feno?: FeNO; // V1, V4
  ecg?: ECG; // V1, V4
  serumIgE?: SerumIgE; // V4

  medScore?: MedScore; // V2-V6
  drugRecovery?: DrugRecovery; // V2-V4
  efficacy?: EfficacyAssessment; // V2-V6

  // V2-V4 特有
  hasAdverseEvent?: boolean;
  hasNewConcomitantMed?: boolean;
}

/** 访视阶段定义（含是否到访视时间逻辑） */
export const VISIT_LABEL: Record<VisitNo, string> = {
  V1: 'V1 筛查期',
  V2: 'V2 D7',
  V3: 'V3 D14',
  V4: 'V4 D28',
  V5: 'V5 M2',
  V6: 'V6 M3',
};
