/**
 * 患者相关类型定义
 * 对应 CRF 纸质表结构与 plan.md §3.1
 */

export type CenterId = '01' | '02' | '03' | '04';
export type PatientStatus =
  | 'screening'
  | 'treatment'
  | 'followup'
  | 'completed'
  | 'withdrawn';

export interface SmokingHistory {
  has: boolean;
  years?: number;
  packsPerDay?: number;
  quitYears?: number;
}

export interface DrinkingHistory {
  has: boolean;
  years?: number;
  mlPerDay?: number;
  quitYears?: number;
}

export interface Demographics {
  gender: '男' | '女';
  age: number;
  household: string;
  weight: number; // kg, 1位小数
  height: number; // cm, 1位小数
  bmi: number; // 自动计算, 1位小数
  occupation: string;
  environmentExposure: string[]; // ['粉尘','宠物','装修史','无'] 多选（无互斥）
  smokingHistory: SmokingHistory;
  drinkingHistory: DrinkingHistory;
  dietHabit: string[]; // ['辛辣','生冷','清淡','其他']
  livingEnvironment: string[]; // ['通风良好','霉斑','尘螨','其他']
  climate: string[]; // ['潮湿','干燥','寒冷','温热']
}

export interface AllergyHistory {
  has: boolean;
  drugAllergy?: string;
  nonDrugAllergy?: string;
}

export interface RespiratoryRecord {
  diseaseName: string;
  diagnosisDate: string;
  isOngoing: boolean;
  endDate?: string;
}

export interface RespiratoryHistory {
  has: boolean;
  records?: RespiratoryRecord[];
}

export interface FamilyHistory {
  has: boolean;
  detail?: string;
}

export interface TcmHistory {
  has: boolean;
  formulaName?: string;
  course?: string;
  efficacy?: '好' | '一般' | '差';
}

export interface Immunotherapy {
  status: '未接受' | '接受中' | '已完成';
  course?: string;
  endTime?: string;
  efficacy?: '好' | '一般' | '差';
}

export interface CurrentMedication {
  drugName: string;
  dailyDose: string;
  unit: string;
  route: string;
  startDate: string;
  isOngoing: boolean;
  endDate?: string;
}

export interface PriorTreatment {
  has: boolean;
  tcmHistory?: TcmHistory;
  immunotherapy?: Immunotherapy;
  currentMedications?: CurrentMedication[];
}

export interface AllergenTest {
  done: boolean;
  testDate?: string;
  totalIgE?: number;
  skinPrickPositive?: boolean | null;
  serumIgE?: number;
  nasalChallengePositive?: boolean | null;
}

export interface CurrentIllness {
  diagnosisDate: string;
  attackCycle: '常年性' | '季节性';
  perennialAllergen?: string[]; // ['尘螨','蟑螂','动物皮屑','不详']
  seasonalSeason?: string;
  seasonalAllergen?: string;
  comorbidities: string[]; // 多选
  allergenTest: AllergenTest;
  triggerFactors: { has: boolean; detail?: string };
}

export interface TcmFourExam {
  nasalMucosa: '淡白肿胀' | '红肿充血';
  nasalDischarge: '清稀如水' | '黄黏成缕';
  tongueBody: '淡红' | '淡白' | '红赤';
  tongueCoating: '薄白' | '薄黄';
  throat: '咽壁淡红、不肿' | '咽峡充血、微肿';
  sneeze: '低频有力' | '高频短促';
  worseCondition: '遇冷' | '遇热' | '无';
  stool: '溏' | '干' | '正常';
  urine: '清' | '黄赤';
  pulse: '浮紧' | '浮缓' | '浮数';
}

export interface Patient {
  id: string;
  centerId: CenterId;
  screeningNo: string; // 筛选号, 5位
  randomNo: string; // 随机编号, 3位
  nameAbbr: string; // 姓名拼音缩写, 4位大写字母
  enrollmentDate: string; // YYYY-MM-DD
  status: PatientStatus;

  demographics: Demographics;

  // V1 病史
  allergyHistory: AllergyHistory;
  respiratoryHistory: RespiratoryHistory;
  familyHistory: FamilyHistory;
  priorTreatment: PriorTreatment;

  // V1 现病史
  currentIllness: CurrentIllness;

  // V1 中医四诊
  tcmFourExam: TcmFourExam;

  // V1 知情同意签署日期
  consentDate: string;

  // V1 入选/排除标准
  inclusionCriteria: boolean[]; // 6项
  exclusionCriteria: boolean[]; // 11项
  screeningResult: 'pass' | 'fail';
  screeningFailReason?: string;

  // 发放研究药物 (R)
  dispensedCount: number;
  investigatorSignature: string;
  signatureDate: string;

  // 访视数据
  visits: Record<string, import('./visit').VisitData>; // key = 'V1'...'V6'

  // 跨访视数据
  adverseEvents: import('./adverseEvent').AdverseEvent[];
  concomitantMeds: import('./concomitantMed').ConcomitantMed[];
  nonDrugTherapies: import('./concomitantMed').NonDrugTherapy[];

  // 完成情况
  completion?: import('./concomitantMed').CompletionSummary;
}
