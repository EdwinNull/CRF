/**
 * Mock 患者数据 (plan.md §9)
 * 预置 6 个患者，覆盖不同状态与完整字段，使 Demo 真实可演示。
 * createPatients() 每次返回深拷贝，避免全局状态污染。
 */
import type { Patient, PatientStatus, CenterId } from '../types/patient';
import type { VisitData, VisitNo, VASScores, SymptomFourScale, RQLQScores, TCMScores, MedScore } from '../types/visit';
import type { ConcomitantMed } from '../types/concomitantMed';
import { refreshScores, calcBMI } from './seedHelpers';

let seq = 1;
export function uid(): string {
  return `pat_${Date.now().toString(36)}_${(seq++).toString(36)}`;
}
export function aeId(): string {
  return `ae_${Date.now().toString(36)}_${(seq++).toString(36)}`;
}
export function medId(): string {
  return `med_${Date.now().toString(36)}_${(seq++).toString(36)}`;
}

/* ---------- 空值工厂 ---------- */

const zeroVAS = (): VASScores => ({ sneeze: 0, rhinorrhea: 0, nasalItch: 0, nasalCongestion: 0, eyeItch: 0, lacrimation: 0, total: 0 });
const zeroFour = (): SymptomFourScale => ({ sneeze: 0, rhinorrhea: 0, nasalItch: 0, nasalCongestion: 0, eyeItch: 0, lacrimation: 0, nasalTotal: 0, totalScore: 0 });
const zeroRQLQ = (): RQLQScores => ({ activityLimit: [0, 0, 0], sleep: [0, 0, 0], nonNasalEye: [0, 0, 0, 0, 0, 0, 0], practicalProblems: [0, 0, 0], nasalSymptoms: [0, 0, 0, 0], eyeSymptoms: [0, 0, 0, 0], emotion: [0, 0, 0, 0], total: 0 });
const zeroTCM = (): TCMScores => ({ nasalItch: 0, sneeze: 0, rhinorrhea: 0, nasalCongestion: 0, windColdAversion: 0, bodyAche: 0, sweating: 0, cough: 0, paleFace: 0, tongueDesc: '', pulseDesc: '', total: 0 });
export const zeroMed = (): MedScore => ({
  oralAntihistamine: { selected: false, days: 0, total: 0 },
  nasalAntihistamine: { selected: false, days: 0, total: 0 },
  eyeAntihistamine: { selected: false, days: 0, total: 0 },
  nasalSteroid: { selected: false, days: 0, total: 0 },
  oralCorticosteroid: { selected: false, days: 0, total: 0 },
  grandTotal: 0,
});

export function emptyVisit(no: VisitNo, date = ''): VisitData {
  return {
    visitNo: no, visitDate: date, status: 'not_started',
    vitalSigns: { temperature: 36.5, pulse: 72, systolicBP: 118, diastolicBP: 76, respiration: 16 },
    vasScores: zeroVAS(), symptomFourScale: zeroFour(), rqlqScores: zeroRQLQ(), tcmScores: zeroTCM(),
  };
}

/* ---------- 患者草稿 ---------- */

interface DraftInput {
  centerId: CenterId; screeningNo: string; randomNo: string; nameAbbr: string; status: PatientStatus;
  enrollmentDate: string; age?: number; gender?: '男' | '女';
}

function blankPatient(d: DraftInput): Patient {
  return {
    id: uid(), centerId: d.centerId, screeningNo: d.screeningNo, randomNo: d.randomNo,
    nameAbbr: d.nameAbbr, enrollmentDate: d.enrollmentDate, status: d.status,
    consentDate: d.enrollmentDate,
    demographics: {
      gender: d.gender ?? '男', age: d.age ?? 35, household: '', weight: 0, height: 0, bmi: 0,
      occupation: '', environmentExposure: [], smokingHistory: { has: false }, drinkingHistory: { has: false },
      dietHabit: [], livingEnvironment: [], climate: [],
    },
    allergyHistory: { has: false }, respiratoryHistory: { has: false }, familyHistory: { has: false },
    priorTreatment: { has: false },
    currentIllness: { diagnosisDate: '', attackCycle: '常年性', comorbidities: [], allergenTest: { done: false }, triggerFactors: { has: false } },
    tcmFourExam: {
      nasalMucosa: '淡白肿胀', nasalDischarge: '清稀如水', tongueBody: '淡红', tongueCoating: '薄白',
      throat: '咽壁淡红、不肿', sneeze: '高频短促', worseCondition: '遇冷', stool: '正常', urine: '清', pulse: '浮缓',
    },
    inclusionCriteria: [false, false, false, false, false, false],
    exclusionCriteria: [false, false, false, false, false, false, false, false, false, false, false],
    screeningResult: 'pass', dispensedCount: 0, investigatorSignature: '', signatureDate: '',
    visits: {
      V1: emptyVisit('V1', ''), V2: emptyVisit('V2'), V3: emptyVisit('V3'),
      V4: emptyVisit('V4'), V5: emptyVisit('V5'), V6: emptyVisit('V6'),
    },
    adverseEvents: [], concomitantMeds: [], nonDrugTherapies: [],
  };
}

/* ---------- 填充 V1 症状与实验室 -> 让 demo 真实 ---------- */

function fillV1Scores(p: Patient, enroll: string) {
  const v1 = p.visits.V1;
  v1.visitDate = enroll;
  v1.status = 'submitted'; // V1 数据已完整填充，视为已提交（筛达通过）
  Object.assign(v1.vasScores, { sneeze: 6, rhinorrhea: 5, nasalItch: 4, nasalCongestion: 6, eyeItch: 3, lacrimation: 2 });
  Object.assign(v1.symptomFourScale, { sneeze: 2, rhinorrhea: 2, nasalItch: 1, nasalCongestion: 2, eyeItch: 1, lacrimation: 1 });
  Object.assign(v1.rqlqScores, {
    activityLimit: [4, 4, 3], sleep: [3, 4, 3], nonNasalEye: [3, 2, 3, 3, 2, 3, 1],
    practicalProblems: [5, 5, 4], nasalSymptoms: [5, 4, 4, 5], eyeSymptoms: [4, 3, 2, 2], emotion: [3, 3, 2, 3],
  });
  Object.assign(v1.tcmScores, {
    nasalItch: 2, sneeze: 4, rhinorrhea: 4, nasalCongestion: 4,
    windColdAversion: 2, bodyAche: 1, sweating: 0, cough: 1, paleFace: 0,
    tongueDesc: '舌淡红，苔薄白', pulseDesc: '脉浮缓',
  });
  v1.labBlood = {
    sampleDate: enroll,
    hb: { value: 148, unit: 'g/L', status: 'normal' }, rbc: { value: 5.1, unit: '10^12/L', status: 'normal' },
    wbc: { value: 6.5, unit: '10^9/L', status: 'normal' }, neu: { value: 4.1, unit: '10^9/L', status: 'normal' },
    eos: { value: 0.4, unit: '10^9/L', status: 'normal' }, bas: { value: 0.05, unit: '10^9/L', status: 'normal' },
    lym: { value: 2.1, unit: '10^9/L', status: 'normal' }, plt: { value: 230, unit: '10^9/L', status: 'normal' },
  };
  v1.labUrine = {
    sampleDate: enroll,
    protein: { value: '-', status: 'normal' }, glucose: { value: '-', status: 'normal' },
    ketone: { value: '-', status: 'normal' }, occultBlood: { value: '阴性', status: 'normal' }, leukocyte: { value: '阴性', status: 'normal' },
  };
  v1.labBiochem = {
    sampleDate: enroll,
    alt: { value: 24, unit: 'U/L', status: 'normal' }, ast: { value: 22, unit: 'U/L', status: 'normal' },
    bun: { value: 4.8, unit: 'mmol/L', status: 'normal' }, cr: { value: 66, unit: 'μmol/L', status: 'normal' },
  };
  v1.feno = { done: true, testDate: enroll, oralValue: 22, oralStatus: '正常', nasalValue: 260, nasalStatus: '升高' };
  v1.ecg = { done: true, testDate: enroll, result: '正常' };
  return v1;
}

/** 填充某一随访药物治疗（V2-V6 共用分值） */
function fillFollowVisit(_p: Patient, no: VisitNo, date: string, symptoms: { vas: number; four: number[] }) {
  const v = emptyVisit(no, date);
  v.status = 'submitted';
  Object.assign(v.vasScores, {
    sneeze: symptoms.vas, rhinorrhea: Math.max(0, symptoms.vas - 1), nasalItch: Math.max(0, symptoms.vas - 2),
    nasalCongestion: symptoms.vas, eyeItch: Math.max(0, symptoms.vas - 3), lacrimation: Math.max(0, symptoms.vas - 4),
  });
  Object.assign(v.symptomFourScale, {
    sneeze: symptoms.four[0], rhinorrhea: symptoms.four[1], nasalItch: symptoms.four[2],
    nasalCongestion: symptoms.four[3], eyeItch: symptoms.four[4], lacrimation: symptoms.four[5],
  });
  v.medScore = zeroMed();
  v.medScore.oralAntihistamine = { selected: true, days: 7, total: 7 };
  return v;
}

/* ---------- 6 个预置患者 ---------- */

export function createPatients(): Patient[] {
  const e1 = '2026-05-20', e2 = '2026-06-02', e3 = '2026-05-18', e4 = '2026-04-15', e5 = '2026-03-10', e6 = '2026-05-21';

  // p1: completed 完整 V1-V6
  const p1 = blankPatient({ centerId: '01', screeningNo: '01001', randomNo: '001', nameAbbr: 'ZHLS', status: 'completed', enrollmentDate: e1, age: 41, gender: '男' });
  p1.demographics.household = '北京市西城区'; p1.demographics.weight = 72.3; p1.demographics.height = 175;
  p1.demographics.bmi = calcBMI(72.3, 175); p1.demographics.occupation = '教师';
  p1.demographics.environmentExposure = ['粉尘']; p1.demographics.dietHabit = ['清淡', '辛辣'];
  p1.demographics.livingEnvironment = ['通风良好']; p1.demographics.climate = ['干燥'];
  p1.demographics.smokingHistory = { has: true, years: 15, packsPerDay: 1, quitYears: 2 };
  p1.inclusionCriteria = [true, true, true, true, true, true];
  fillV1Scores(p1, e1);
  p1.visits.V2 = fillFollowVisit(p1, 'V2', '2026-05-27', { vas: 4, four: [2, 1, 1, 2, 1, 0] });
  p1.visits.V3 = fillFollowVisit(p1, 'V3', '2026-06-03', { vas: 3, four: [1, 1, 1, 1, 0, 0] });
  p1.visits.V4 = fillFollowVisit(p1, 'V4', '2026-06-17', { vas: 1, four: [1, 0, 0, 1, 0, 0] });
  p1.visits.V5 = fillFollowVisit(p1, 'V5', '2026-07-17', { vas: 1, four: [0, 0, 0, 1, 0, 0] });
  p1.visits.V6 = fillFollowVisit(p1, 'V6', '2026-08-17', { vas: 0, four: [0, 0, 0, 0, 0, 0] });
  p1.completion = { completedTreatment: true, completionDate: '2026-06-17', hadFinalVisit: true };

  // p2: treatment  V1-V2 已提交, V3 草稿
  const p2 = blankPatient({ centerId: '01', screeningNo: '01002', randomNo: '002', nameAbbr: 'LRY', status: 'treatment', enrollmentDate: e2, age: 28, gender: '女' });
  p2.demographics.household = '北京市朝阳区'; p2.demographics.weight = 56.0; p2.demographics.height = 163;
  p2.demographics.bmi = calcBMI(56, 163); p2.demographics.occupation = '医生';
  p2.demographics.environmentExposure = ['宠物']; p2.demographics.livingEnvironment = ['通风良好'];
  fillV1Scores(p2, e2);
  p2.visits.V2 = fillFollowVisit(p2, 'V2', '2026-06-09', { vas: 5, four: [2, 2, 1, 2, 1, 1] });
  const v3 = emptyVisit('V3', '2026-06-16'); draft(v3); v3.vasScores.sneeze = 4;
  p2.visits.V3 = v3;
  // 已有 1 个 AE 导致 p2 随访动态
  p2.adverseEvents = [
    { id: aeId(), seqNo: 1, eventName: '轻度鼻衄', description: '晨起轻微流鼻血', startDate: '2026-06-08', isOngoing: false, endDate: '2026-06-10', severity: 1, drugMeasure: 1, otherMeasure: 1, drugRelation: 3, outcome: 3, isSAE: false },
  ];

  // p3: followup V1-V4 已提交, V5 草稿
  const p3 = blankPatient({ centerId: '02', screeningNo: '02001', randomNo: '003', nameAbbr: 'WXH', status: 'followup', enrollmentDate: e3, age: 45, gender: '男' });
  p3.demographics.household = '北京市海淀区'; p3.demographics.weight = 78.0; p3.demographics.height = 178;
  p3.demographics.bmi = calcBMI(78, 178); p3.demographics.occupation = '工程师';
  fillV1Scores(p3, e3);
  p3.visits.V2 = fillFollowVisit(p3, 'V2', '2026-05-25', { vas: 5, four: [2, 2, 1, 2, 1, 1] });
  p3.visits.V3 = fillFollowVisit(p3, 'V3', '2026-06-01', { vas: 4, four: [2, 1, 1, 2, 1, 0] });
  p3.visits.V4 = fillFollowVisit(p3, 'V4', '2026-06-15', { vas: 3, four: [1, 1, 1, 1, 0, 0] });
  const v5 = emptyVisit('V5', '2026-07-15'); v5.vasScores.nasalCongestion = 2; draft(v5);
  p3.visits.V5 = v5;
  p3.concomitantMeds = [
    { id: medId(), seqNo: 1, drugName: '氯雷他定片', indication: '过敏性鼻炎', dosageForm: '片剂', dosageAmount: '10mg 每日1次', startDate: '2026-05-19', isOngoing: true, drugRelation: '合并用药', remark: '备用' },
  ];

  // p4: screening 仅 V1 草稿，筛选失败
  const p4 = blankPatient({ centerId: '03', screeningNo: '03001', randomNo: '', nameAbbr: 'CLX', status: 'screening', enrollmentDate: e4, age: 33, gender: '女' });
  p4.demographics.household = '北京市丰台区'; p4.demographics.weight = 60.0; p4.demographics.height = 165;
  p4.demographics.bmi = calcBMI(60, 165); p4.demographics.occupation = '财务';
  p4.inclusionCriteria = [true, true, true, true, false, true]; // 第5项不符
  p4.screeningResult = 'fail'; p4.screeningFailReason = '鼻部症状四分法评分未达中度';
  const v14 = emptyVisit('V1', e4); draft(v14);
  p4.visits.V1 = v14;

  // p5: withdrawn 因 AE 退出
  const p5 = blankPatient({ centerId: '03', screeningNo: '03002', randomNo: '004', nameAbbr: 'ZJM', status: 'withdrawn', enrollmentDate: e5, age: 52, gender: '男' });
  p5.demographics.household = '北京市东城区'; p5.demographics.weight = 70.0; p5.demographics.height = 173;
  p5.demographics.bmi = calcBMI(70, 173); p5.demographics.occupation = '退休';
  fillV1Scores(p5, e5);
  p5.visits.V2 = fillFollowVisit(p5, 'V2', '2026-03-17', { vas: 6, four: [2, 2, 2, 2, 1, 1] });
  p5.adverseEvents = [
    { id: aeId(), seqNo: 1, eventName: '皮疹', description: '躯干散在红斑丘疹伴瘙痒', startDate: '2026-03-16', isOngoing: true, severity: 2, drugMeasure: 2, otherMeasure: 3, otherMeasureDetail: '氯雷他定', drugRelation: 2, outcome: 2, isSAE: false },
    { id: aeId(), seqNo: 2, eventName: '恶心', description: '用药后轻度恶心', startDate: '2026-03-13', isOngoing: false, endDate: '2026-03-15', severity: 1, drugMeasure: 1, otherMeasure: 1, drugRelation: 3, outcome: 3, isSAE: false },
  ];
  p5.completion = { completedTreatment: false, hadFinalVisit: false, withdrawalReason: 5, aeSeqNo: 1 };

  // p6: treatment V1-V3 已提交，有 2 个 AE
  const p6 = blankPatient({ centerId: '04', screeningNo: '04001', randomNo: '005', nameAbbr: 'HYQ', status: 'treatment', enrollmentDate: e6, age: 36, gender: '男' });
  p6.demographics.household = '北京市大兴区'; p6.demographics.weight = 82.0; p6.demographics.height = 180;
  p6.demographics.bmi = calcBMI(82, 180); p6.demographics.occupation = '销售';
  p6.demographics.environmentExposure = ['粉尘', '装修史'];
  fillV1Scores(p6, e6);
  p6.visits.V2 = fillFollowVisit(p6, 'V2', '2026-05-28', { vas: 5, four: [2, 2, 1, 2, 1, 0] });
  p6.visits.V3 = fillFollowVisit(p6, 'V3', '2026-06-04', { vas: 4, four: [2, 1, 1, 2, 1, 0] });
  p6.adverseEvents = [
    { id: aeId(), seqNo: 1, eventName: '咽喉干燥', description: '用药后咽部干涩感', startDate: '2026-05-27', isOngoing: true, severity: 1, drugMeasure: 1, otherMeasure: 1, drugRelation: 3, outcome: 1, isSAE: false },
    { id: aeId(), seqNo: 2, eventName: '轻微头晕', description: '偶发，无需处理', startDate: '2026-05-30', isOngoing: true, severity: 1, drugMeasure: 1, otherMeasure: 1, drugRelation: 4, outcome: 1, isSAE: false },
  ];

  const all = [p1, p2, p3, p4, p5, p6];
  // 统一刷新派生总分
  for (const p of all) {
    for (const k of Object.keys(p.visits) as VisitNo[]) {
      refreshScores(p.visits[k]);
    }
  }
  return all;
}

/** 暂存 / 草稿状态辅助 */
function draft(v: VisitData): VisitData {
  v.status = 'draft';
  return v;
}

export type { ConcomitantMed };
