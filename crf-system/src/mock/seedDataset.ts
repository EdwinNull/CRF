/**
 * seedDataset — 为每个中心生成的"表单特征演示"患者数据集 (plan.md §9 扩展)
 *
 * 目标：让登录任一中心的医生都能看到足量、可展示 CRF 表单特征的患者：
 *  - 覆盖全部状态（screening / screening_failed / treatment / followup / completed / withdrawn）
 *  - 覆盖全部访视阶段（V1~V6 不同提交进度）
 *  - 覆盖必填/选填特征：不同患者填入不同程度的可选字段（全填 / 关键必填 / 仅必填）
 *  - 附带不良事件 / 合并用药 / 非药物治疗 / 完成情况数据
 *
 * 这些是前端富结构数据；PatientList 的 LOAD_PATIENTS 会按筛选号与后端档案合并，
 * 使患者同时具备"后端真实档案"与"前端表单特征数据"。
 */
import type { Patient, PatientStatus, CenterId } from '../types/patient';
import type { VisitData, VisitNo } from '../types/visit';
import type { AdverseEvent } from '../types/adverseEvent';
import type { ConcomitantMed, NonDrugTherapy, CompletionSummary } from '../types/concomitantMed';
import { blankPatient } from './patients';
import { refreshScores } from './seedHelpers';

/** seed 允许额外含 screening_failed（前端 PatientStatus 不含该值，生成时映射为 screening） */
type SeedStatus = PatientStatus | 'screening_failed';

/* ---------- 患者画像配置 ---------- */

interface PatientProfile {
  centerId: CenterId;
  screeningNo: string; // 完整 5 位，如 01001
  randomNo: string;
  nameAbbr: string; // 4 位拼音缩写
  status: SeedStatus;
  enrollmentDate: string;
  gender: '男' | '女';
  age: number;
  height: number; // cm
  weight: number; // kg
  /** 富表单填充密度：full=含大量选填数据；standard=必填+常用选填；minimal=仅必填 */
  fillLevel: 'full' | 'standard' | 'minimal';
  /** 已提交的访视号（V1 到该号为止状态=submitted） */
  submittedVisits: number; // 0-6，对应 V1..V6 提交到第几个
  /** 附带数据 */
  adverseEvents?: Array<Partial<AdverseEvent> & { eventName: string }>;
  concomitantMeds?: Array<Partial<ConcomitantMed> & { drugName: string }>;
  nonDrugTherapies?: Array<Partial<NonDrugTherapy> & { therapyName: string }>;
  completion?: CompletionSummary;
  screeningFailReason?: string;
}

/* ---------- 日期辅助 ---------- */

/** 在入组日期上偏移若干天，返回 YYYY-MM-DD */
function shiftDate(enroll: string, days: number): string {
  const d = new Date(enroll + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/* ---------- 空评分工厂（与 mock 一致） ---------- */

const zeroScores = () => ({
  vas: { sneeze: 0, rhinorrhea: 0, nasalItch: 0, nasalCongestion: 0, eyeItch: 0, lacrimation: 0, total: 0 },
  four: { sneeze: 0, rhinorrhea: 0, nasalItch: 0, nasalCongestion: 0, eyeItch: 0, lacrimation: 0, nasalTotal: 0, totalScore: 0 },
  rqlq: {
    activityLimit: [0, 0, 0], sleep: [0, 0, 0], nonNasalEye: [0, 0, 0, 0, 0, 0, 0],
    practicalProblems: [0, 0, 0], nasalSymptoms: [0, 0, 0, 0], eyeSymptoms: [0, 0, 0, 0], emotion: [0, 0, 0, 0], total: 0,
  },
  tcm: {
    nasalItch: 0, sneeze: 0, rhinorrhea: 0, nasalCongestion: 0,
    windColdAversion: 0, bodyAche: 0, sweating: 0, cough: 0, paleFace: 0, tongueDesc: '', pulseDesc: '', total: 0,
  },
});

/** 按难度回填 V1 的典型评分数据 */
function fillV1Scores(p: Patient, enroll: string, level: 'full' | 'standard' | 'minimal') {
  const v1 = p.visits.V1;
  v1.visitDate = enroll;
  v1.status = 'submitted';
  if (level === 'minimal') return; // 仅必填，评分留空更明显展示"选填可省"

  const s = zeroScores();
  v1.vasScores = { ...s.vas, sneeze: 6, rhinorrhea: 5, nasalItch: 4, nasalCongestion: 6, eyeItch: 3, lacrimation: 2 };
  v1.symptomFourScale = { ...s.four, sneeze: 2, rhinorrhea: 2, nasalItch: 1, nasalCongestion: 2, eyeItch: 1, lacrimation: 1 };
  v1.rqlqScores = {
    ...s.rqlq,
    activityLimit: [4, 4, 3], sleep: [3, 4, 3], nonNasalEye: [3, 2, 3, 3, 2, 3, 1],
    practicalProblems: [5, 5, 4], nasalSymptoms: [5, 4, 4, 5], eyeSymptoms: [4, 3, 2, 2], emotion: [3, 3, 2, 3],
  };
  v1.tcmScores = {
    ...s.tcm,
    nasalItch: 2, sneeze: 4, rhinorrhea: 4, nasalCongestion: 4,
    windColdAversion: 2, bodyAche: 1, sweating: 0, cough: 1, paleFace: 0,
    tongueDesc: '舌淡红，苔薄白', pulseDesc: '脉浮缓',
  };

  if (level === 'full') {
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
  }
}

/** 填一个随访访视（V2+），按难度填评分，medScore 必含 */
function fillVisit(p: Patient, no: VisitNo, date: string, level: 'full' | 'standard' | 'minimal', symptoms: { vas: number; four: (0 | 1 | 2 | 3)[] }) {
  const v = p.visits[no] as VisitData;
  v.visitDate = date;
  v.status = 'submitted';
  if (level === 'minimal') return;
  const s = zeroScores();
  v.vasScores = { ...s.vas, sneeze: symptoms.vas, rhinorrhea: Math.max(0, symptoms.vas - 1), nasalItch: Math.max(0, symptoms.vas - 2), nasalCongestion: symptoms.vas, eyeItch: Math.max(0, symptoms.vas - 3), lacrimation: Math.max(0, symptoms.vas - 4) };
  v.symptomFourScale = { ...s.four, sneeze: symptoms.four[0], rhinorrhea: symptoms.four[1], nasalItch: symptoms.four[2], nasalCongestion: symptoms.four[3], eyeItch: symptoms.four[4], lacrimation: symptoms.four[5] };
  v.medScore = {
    oralAntihistamine: { selected: true, days: 7, total: 7 },
    nasalAntihistamine: { selected: false, days: 0, total: 0 },
    eyeAntihistamine: { selected: false, days: 0, total: 0 },
    nasalSteroid: { selected: true, days: 7, total: 14 },
    oralCorticosteroid: { selected: false, days: 0, total: 0 },
    grandTotal: 21,
  };
  if (level === 'full') {
    v.drugRecovery = { returnedCount: 4, expectedCount: 8, compliance: 50, dispensedCount: 8 };
    v.efficacy = { efficacyIndex: 60, efficacyLevel: '有效', allSymptomsRelieved: false, worsened: false, newComplication: false };
  }
}

/* ---------- 具名的 4 中心患者画像 ---------- */

function buildProfiles(): PatientProfile[] {
  const P: PatientProfile[] = [];
  const e = (m: string) => `2026-${m}`;

  // ===== 中心 01 广安门呼吸（doctor01）=====
  P.push(
    {
      centerId: '01', screeningNo: '01001', randomNo: '001', nameAbbr: 'ZHLS', status: 'completed',
      enrollmentDate: e('05-20'), gender: '男', age: 41, height: 175, weight: 72, fillLevel: 'full', submittedVisits: 6,
      adverseEvents: [
        { seqNo: 1, eventName: '轻度鼻衄', description: '晨起轻微流鼻血，自行缓解', startDate: e('06-08'), isOngoing: false, endDate: e('06-10'), severity: 1, drugMeasure: 1, otherMeasure: 1, drugRelation: 3, outcome: 3, isSAE: false },
      ],
      completion: { completedTreatment: true, completionDate: e('06-17'), lastDoseDate: e('06-17'), hadFinalVisit: true },
    },
    {
      centerId: '01', screeningNo: '01002', randomNo: '002', nameAbbr: 'LRY', status: 'treatment',
      enrollmentDate: e('06-02'), gender: '女', age: 28, height: 163, weight: 56, fillLevel: 'standard', submittedVisits: 2,
      adverseEvents: [
        { seqNo: 1, eventName: '轻度头晕', description: '偶发，无需处理', startDate: e('06-09'), isOngoing: true, severity: 1, drugMeasure: 1, otherMeasure: 1, drugRelation: 4, outcome: 1, isSAE: false },
      ],
    },
    {
      centerId: '01', screeningNo: '01003', randomNo: '', nameAbbr: 'WXY', status: 'screening',
      enrollmentDate: e('07-28'), gender: '男', age: 39, height: 171, weight: 65, fillLevel: 'minimal', submittedVisits: 0,
    },
  );

  // ===== 中心 02 广安门耳鼻喉（doctor02）=====
  P.push(
    {
      centerId: '02', screeningNo: '02001', randomNo: '003', nameAbbr: 'WXH', status: 'followup',
      enrollmentDate: e('05-18'), gender: '男', age: 45, height: 178, weight: 78, fillLevel: 'standard', submittedVisits: 4,
      concomitantMeds: [
        { seqNo: 1, drugName: '氯雷他定片', indication: '过敏性鼻炎', dosageForm: '片剂', dosageAmount: '10mg 每日1次', startDate: e('05-19'), isOngoing: true, drugRelation: '合并用药', remark: '备用' },
      ],
    },
    {
      centerId: '02', screeningNo: '02002', randomNo: '004', nameAbbr: 'FMC', status: 'completed',
      enrollmentDate: e('04-11'), gender: '女', age: 36, height: 160, weight: 52, fillLevel: 'full', submittedVisits: 6,
      completion: { completedTreatment: true, completionDate: e('05-09'), lastDoseDate: e('05-09'), hadFinalVisit: true },
    },
    {
      centerId: '02', screeningNo: '02003', randomNo: '', nameAbbr: 'TDH', status: 'screening',
      enrollmentDate: e('08-05'), gender: '男', age: 52, height: 170, weight: 68, fillLevel: 'minimal', submittedVisits: 0,
    },
  );

  // ===== 中心 03 西苑（doctor03）=====
  P.push(
    {
      centerId: '03', screeningNo: '03001', randomNo: '005', nameAbbr: 'CLX', status: 'withdrawn',
      enrollmentDate: e('03-10'), gender: '女', age: 33, height: 165, weight: 60, fillLevel: 'standard', submittedVisits: 2,
      adverseEvents: [
        { seqNo: 1, eventName: '皮疹', description: '躯干散在红斑丘疹伴瘙痒', startDate: e('03-16'), isOngoing: true, severity: 2, drugMeasure: 2, otherMeasure: 3, otherMeasureDetail: '氯雷他定', drugRelation: 2, outcome: 2, isSAE: false },
      ],
      completion: { completedTreatment: false, hadFinalVisit: false, withdrawalReason: 5, aeSeqNo: 1 },
    },
    {
      centerId: '03', screeningNo: '03002', randomNo: '', nameAbbr: 'MHG', status: 'screening_failed',
      enrollmentDate: e('06-15'), gender: '男', age: 48, height: 176, weight: 80, fillLevel: 'standard', submittedVisits: 1,
      screeningFailReason: '鼻部症状四分法评分未达中度',
    },
    {
      centerId: '03', screeningNo: '03003', randomNo: '006', nameAbbr: 'QYY', status: 'treatment',
      enrollmentDate: e('07-01'), gender: '女', age: 26, height: 158, weight: 48, fillLevel: 'minimal', submittedVisits: 1,
    },
  );

  // ===== 中心 04 东直门（doctor04）=====
  P.push(
    {
      centerId: '04', screeningNo: '04001', randomNo: '008', nameAbbr: 'HYQ', status: 'followup',
      enrollmentDate: e('06-22'), gender: '男', age: 36, height: 180, weight: 82, fillLevel: 'full', submittedVisits: 3,
      adverseEvents: [
        { seqNo: 1, eventName: '咽喉干燥', description: '用药后咽部干涩感', startDate: e('06-27'), isOngoing: true, severity: 1, drugMeasure: 1, otherMeasure: 1, drugRelation: 3, outcome: 1, isSAE: false },
        { seqNo: 2, eventName: '轻微腹泻', description: '每日1-2次稀便', startDate: e('07-03'), isOngoing: false, endDate: e('07-05'), severity: 1, drugMeasure: 1, otherMeasure: 1, drugRelation: 4, outcome: 3, isSAE: false },
      ],
      nonDrugTherapies: [
        { seqNo: 1, therapyName: '生理盐水鼻腔冲洗', therapyType: '鼻腔冲洗', methodFrequency: '每日早晚各1次', location: '双侧鼻腔', startDate: e('06-23'), isOngoing: true, drugRelation: '协同治疗' },
      ],
    },
    {
      centerId: '04', screeningNo: '04002', randomNo: '009', nameAbbr: 'SLF', status: 'completed',
      enrollmentDate: e('04-28'), gender: '男', age: 43, height: 173, weight: 74, fillLevel: 'full', submittedVisits: 6,
      completion: { completedTreatment: true, completionDate: e('05-26'), lastDoseDate: e('05-26'), hadFinalVisit: true },
    },
    {
      centerId: '04', screeningNo: '04003', randomNo: '', nameAbbr: 'JXB', status: 'screening',
      enrollmentDate: e('08-09'), gender: '女', age: 31, height: 162, weight: 55, fillLevel: 'minimal', submittedVisits: 0,
    },
  );

  return P;
}

/* ---------- 生成器主函数 ---------- */

/** 生成全部中心的演示患者（富结构，含表单特征） */
export function createSeedDataset(): Patient[] {
  const out: Patient[] = [];
  for (const prof of buildProfiles()) {
    const p = blankPatient({
      centerId: prof.centerId,
      screeningNo: prof.screeningNo,
      randomNo: prof.randomNo,
      nameAbbr: prof.nameAbbr,
      status: prof.status === 'screening_failed' ? 'screening' : prof.status,
      enrollmentDate: prof.enrollmentDate,
      age: prof.age,
      gender: prof.gender,
    });
    // 人口学（basis）
    p.demographics.age = prof.age;
    p.demographics.gender = prof.gender;
    p.demographics.height = prof.height;
    p.demographics.weight = prof.weight;
    p.demographics.bmi = Math.round((prof.weight / ((prof.height / 100) * (prof.height / 100))) * 10) / 10;
    p.demographics.smokingHistory = prof.fillLevel === 'full' ? { has: true, years: 15, packsPerDay: 1, quitYears: 2 } : { has: false };
    p.consentDate = prof.enrollmentDate;

    // 入选/排除：默认通过；screening_failed 视为未通过筛选
    const passed = prof.status !== 'screening_failed';
    p.inclusionCriteria = Array(6).fill(passed);
    p.exclusionCriteria = Array(11).fill(false);
    p.screeningResult = passed ? 'pass' : 'fail';
    if (prof.screeningFailReason) p.screeningFailReason = prof.screeningFailReason;

    // 访视：提交 V1..V{submittedVisits}
    const symptomsByVisit: Record<number, { vas: number; four: (0 | 1 | 2 | 3)[] }> = {
      1: { vas: 6, four: [2, 2, 1, 2, 1, 1] },
      2: { vas: 4, four: [2, 1, 1, 2, 1, 0] },
      3: { vas: 3, four: [1, 1, 1, 1, 0, 0] },
      4: { vas: 2, four: [1, 0, 0, 1, 0, 0] },
      5: { vas: 1, four: [0, 0, 0, 1, 0, 0] },
      6: { vas: 0, four: [0, 0, 0, 0, 0, 0] },
    };
    const visitNos: VisitNo[] = ['V1', 'V2', 'V3', 'V4', 'V5', 'V6'];
    const visitOffsetDays: Record<VisitNo, number> = { V1: 0, V2: 7, V3: 14, V4: 28, V5: 56, V6: 84 };

    for (let i = 0; i < prof.submittedVisits; i++) {
      const no = visitNos[i];
      const date = shiftDate(prof.enrollmentDate, visitOffsetDays[no]);
      if (no === 'V1') fillV1Scores(p, date, prof.fillLevel);
      else fillVisit(p, no, date, prof.fillLevel, symptomsByVisit[i + 1] ?? { vas: 1, four: [1, 0, 0, 1, 0, 0] });
    }
    // 附带数据：AE / 合并用药 / 非药物
    if (prof.adverseEvents) {
      p.adverseEvents = prof.adverseEvents.map((ae, i) => ({
        id: `ae_${prof.screeningNo}_${i + 1}`,
        seqNo: ae.seqNo ?? i + 1,
        eventName: ae.eventName!,
        description: ae.description ?? '',
        startDate: ae.startDate!,
        isOngoing: ae.isOngoing ?? false,
        endDate: ae.endDate,
        severity: ae.severity ?? 1,
        drugMeasure: ae.drugMeasure ?? 1,
        otherMeasure: ae.otherMeasure ?? 1,
        otherMeasureDetail: ae.otherMeasureDetail,
        drugRelation: ae.drugRelation ?? 3,
        outcome: ae.outcome ?? 1,
        isSAE: ae.isSAE ?? false,
        saeType: ae.saeType,
      }));
    }
    if (prof.concomitantMeds) {
      p.concomitantMeds = prof.concomitantMeds.map((m, i) => ({
        id: `med_${prof.screeningNo}_${i + 1}`,
        seqNo: m.seqNo ?? i + 1,
        drugName: m.drugName!,
        indication: m.indication ?? '',
        dosageForm: m.dosageForm ?? '',
        dosageAmount: m.dosageAmount ?? '',
        startDate: m.startDate!,
        isOngoing: m.isOngoing ?? false,
        endDate: m.endDate,
        drugRelation: m.drugRelation ?? '',
        remark: m.remark,
      }));
    }
    if (prof.nonDrugTherapies) {
      p.nonDrugTherapies = prof.nonDrugTherapies.map((t, i) => ({
        id: `ndt_${prof.screeningNo}_${i + 1}`,
        seqNo: t.seqNo ?? i + 1,
        therapyName: t.therapyName!,
        therapyType: t.therapyType ?? '',
        methodFrequency: t.methodFrequency ?? '',
        location: t.location ?? '',
        startDate: t.startDate!,
        isOngoing: t.isOngoing ?? false,
        endDate: t.endDate,
        drugRelation: t.drugRelation ?? '',
        remark: t.remark,
      }));
    }
    if (prof.completion) p.completion = prof.completion;

    // 刷新派生总分
    for (const k of Object.keys(p.visits) as VisitNo[]) {
      refreshScores(p.visits[k]);
    }
    out.push(p);
  }
  return out;
}

/** 按筛选号查找种子数据（供合并用） */
export function findSeedByScreeningNo(list: Patient[], screeningNo: string): Patient | undefined {
  return list.find((p) => p.screeningNo === screeningNo);
}
