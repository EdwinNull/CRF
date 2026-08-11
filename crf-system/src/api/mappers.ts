/**
 * 前后端数据映射层
 * - 后端 → 前端：将扁平 BackendPatient 展开为前端富 Patient 结构（缺失的嵌套字段用 mock 空值补全）
 * - 前端 → 后端：提取后端需要的扁平字段（更新时）
 */
import type { Patient, PatientStatus, CenterId } from '../types/patient';
import type { BackendPatient } from './types';
import { emptyVisit } from '../mock/patients';

/** 后端状态码 → 前端 PatientStatus（后端多一个 screening_failed，前端没有则映射为 screening） */
const STATUS_MAP: Record<string, PatientStatus> = {
  screening: 'screening',
  treatment: 'treatment',
  followup: 'followup',
  completed: 'completed',
  withdrawn: 'withdrawn',
  screening_failed: 'screening',
};

/** 后端 int id → 前端字符串 id（前端组件需字符串 key） */
export const toFrontId = (backendId: number): string => `pid_${backendId}`;
/** 前端字符串 id → 后端 int id；非后端生成的返回 null */
export const toBackendId = (frontId: string): number | null => {
  const m = /^pid_(\d+)$/.exec(frontId);
  return m ? Number(m[1]) : null;
};

/** 后端 → 前端：完整展开为富 Patient，供现有表单/列表直接消费 */
export function backendToPatient(bp: BackendPatient): Patient {
  const frontId = toFrontId(bp.id);
  const gender = bp.gender === '女' ? '女' : '男';

  return {
    id: frontId,
    centerId: (bp.center_id as CenterId) || '01',
    screeningNo: bp.screening_no,
    randomNo: bp.randomization_no || '',
    nameAbbr: bp.name_abbr,
    enrollmentDate: bp.enrollment_date,
    status: STATUS_MAP[bp.status] ?? 'screening',

    demographics: {
      gender,
      age: bp.age ?? 35,
      household: '',
      weight: bp.weight ?? 0,
      height: bp.height ?? 0,
      bmi: 0,
      occupation: '',
      environmentExposure: [],
      smokingHistory: { has: false },
      drinkingHistory: { has: false },
      dietHabit: [],
      livingEnvironment: [],
      climate: [],
    },

    allergyHistory: { has: false },
    respiratoryHistory: { has: false },
    familyHistory: { has: false },
    priorTreatment: { has: false },

    currentIllness: {
      diagnosisDate: '',
      attackCycle: '常年性',
      comorbidities: [],
      allergenTest: { done: false },
      triggerFactors: { has: false },
    },
    tcmFourExam: {
      nasalMucosa: '淡白肿胀',
      nasalDischarge: '清稀如水',
      tongueBody: '淡红',
      tongueCoating: '薄白',
      throat: '咽壁淡红、不肿',
      sneeze: '高频短促',
      worseCondition: '遇冷',
      stool: '正常',
      urine: '清',
      pulse: '浮缓',
    },

    inclusionCriteria: [false, false, false, false, false, false],
    exclusionCriteria: Array(11).fill(false),
    screeningResult: bp.status === 'screening_failed' ? 'fail' : 'pass',
    consentDate: bp.enrollment_date,
    dispensedCount: 0,
    investigatorSignature: bp.name_abbr,
    signatureDate: bp.enrollment_date,

    visits: {
      V1: emptyVisit('V1', bp.enrollment_date),
      V2: emptyVisit('V2'),
      V3: emptyVisit('V3'),
      V4: emptyVisit('V4'),
      V5: emptyVisit('V5'),
      V6: emptyVisit('V6'),
    },
    adverseEvents: [],
    concomitantMeds: [],
    nonDrugTherapies: [],
  };
}

/** 前端 Patient → 后端创建/更新所需的扁平字段 */
export function patientToBackend(p: Patient): { nameAbbr: string; gender: string; age: number; height: number; weight: number } {
  return {
    nameAbbr: p.nameAbbr,
    gender: p.demographics.gender,
    age: p.demographics.age,
    height: p.demographics.height,
    weight: p.demographics.weight,
  };
}

/** 前端 Patient 富结构合并进后端已有的富层（保留前端病案编辑，若为后端患者则新字段叠加到 demographics） */
export function mergeBackendIntoPatient(existing: Patient, bp: BackendPatient): Patient {
  return {
    ...existing,
    id: toFrontId(bp.id),
    centerId: (bp.center_id as CenterId) || existing.centerId,
    screeningNo: bp.screening_no,
    randomNo: bp.randomization_no || existing.randomNo,
    nameAbbr: bp.name_abbr,
    enrollmentDate: bp.enrollment_date,
    status: STATUS_MAP[bp.status] ?? existing.status,
  };
}

/**
 * 后端患者档案 + 本地 seed 富数据合并：
 * 以本地 seed（含富表单特征数据）为基底，用后端档案更新基础字段与 id，
 * 使列表中的患者既具备后端真实身份（可判定/导出/隔离），又保留完整的前端表单特征数据。
 */
export function mergeSeedIntoBackend(seedPatients: Patient[], backendList: BackendPatient[]): Patient[] {
  // 后端返回的患者优先（带 pid_ id 用于后续交互）
  return backendList.map((bp) => {
    const seed = seedPatients.find((s) => s.screeningNo === bp.screening_no);
    if (seed) {
      return mergeBackendIntoPatient(seed, bp);
    }
    return backendToPatient(bp);
  });
}
