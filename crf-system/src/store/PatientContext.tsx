/**
 * 全局状态管理 (plan.md §10)：React Context + useReducer
 * 数据存内存，可选持久化 localStorage 防刷新丢失。
 */
import { createContext, useContext, useReducer, useEffect, type ReactNode, type Dispatch } from 'react';
import type { Patient, CenterId } from '../types/patient';
import type { VisitData } from '../types/visit';
import type { AdverseEvent } from '../types/adverseEvent';
import type { ConcomitantMed, NonDrugTherapy, CompletionSummary } from '../types/concomitantMed';
import { createSeedDataset } from '../mock/seedDataset';

export interface CurrentUser {
  username: string;
  centerId: CenterId;
  /** 后端角色：admin 可跨中心；doctor 仅本中心 */
  role?: 'admin' | 'doctor';
}

export interface AppState {
  currentUser: CurrentUser | null;
  patients: Patient[];
}

export type Action =
  | { type: 'LOGIN'; payload: CurrentUser }
  | { type: 'LOGOUT' }
  | { type: 'LOAD_PATIENTS'; payload: Patient[] }
  | { type: 'ADD_PATIENT'; payload: Patient }
  | { type: 'UPDATE_PATIENT'; payload: { patientId: string; patch: Partial<Patient> } }
  | { type: 'UPDATE_VISIT'; payload: { patientId: string; visitNo: string; data: Partial<VisitData>; status?: VisitData['status'] } }
  | { type: 'ADD_ADVERSE_EVENT'; payload: { patientId: string; event: AdverseEvent } }
  | { type: 'UPDATE_ADVERSE_EVENT'; payload: { patientId: string; eventId: string; event: AdverseEvent } }
  | { type: 'DELETE_ADVERSE_EVENT'; payload: { patientId: string; eventId: string } }
  | { type: 'ADD_CONCOMITANT_MED'; payload: { patientId: string; med: ConcomitantMed } }
  | { type: 'UPDATE_CONCOMITANT_MED'; payload: { patientId: string; medId: string; med: ConcomitantMed } }
  | { type: 'DELETE_CONCOMITANT_MED'; payload: { patientId: string; medId: string } }
  | { type: 'ADD_NON_DRUG'; payload: { patientId: string; therapy: NonDrugTherapy } }
  | { type: 'UPDATE_NON_DRUG'; payload: { patientId: string; therapyId: string; therapy: NonDrugTherapy } }
  | { type: 'DELETE_NON_DRUG'; payload: { patientId: string; therapyId: string } }
  | { type: 'UPDATE_COMPLETION'; payload: { patientId: string; completion: CompletionSummary } };

const STORAGE_KEY = 'crf_system_state';
/** demo 数据 schema 版本；升级结构时自增以丢弃旧缓存 */
const SCHEMA_VERSION = 2;

function init(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as AppState & { _v?: number };
      if (parsed && parsed._v === SCHEMA_VERSION && Array.isArray(parsed.patients)) {
        return parsed;
      }
    }
  } catch {
    /* ignore corrupt storage */
  }
  return { currentUser: null, patients: createSeedDataset() };
}

function reducer(state: AppState, action: Action): AppState {
  const patch = (mode: (ps: Patient[]) => Patient[]): AppState => {
    const next = { ...state, patients: mode(state.patients) };
    return next;
  };
  const mapP = (id: string, fn: (p: Patient) => Patient): AppState =>
    patch((ps) => ps.map((p) => (p.id === id ? fn(p) : p)));

  switch (action.type) {
    case 'LOGIN':
      return { ...state, currentUser: action.payload };
    case 'LOGOUT':
      return { ...state, currentUser: null };
    case 'LOAD_PATIENTS':
      // 用后端数据替换患者的本地/mock 种子（保留 currentUser，避免登录态丢失）
      return { ...state, patients: action.payload };
    case 'ADD_PATIENT':
      return { ...state, patients: [action.payload, ...state.patients] };
    case 'UPDATE_PATIENT':
      return mapP(action.payload.patientId, (p) => ({ ...p, ...action.payload.patch }));
    case 'UPDATE_VISIT': {
      const { patientId, visitNo, data, status } = action.payload;
      return mapP(patientId, (p) => {
        const prev = p.visits[visitNo] as VisitData | undefined;
        if (!prev) return p;
        // 先浅合并，再单独保留 date：data.visitDate 为空串/undefined 时不覆盖已有日期
        const merged: VisitData = { ...prev, ...data };
        if (data.visitDate != null && data.visitDate !== '') {
          merged.visitDate = data.visitDate;
        }
        if (status) merged.status = status;
        return { ...p, visits: { ...p.visits, [visitNo]: merged } };
      });
    }
    case 'ADD_ADVERSE_EVENT':
      return mapP(action.payload.patientId, (p) => ({ ...p, adverseEvents: [...p.adverseEvents, action.payload.event] }));
    case 'UPDATE_ADVERSE_EVENT':
      return mapP(action.payload.patientId, (p) => ({
        ...p,
        adverseEvents: p.adverseEvents.map((e) => (e.id === action.payload.eventId ? action.payload.event : e)),
      }));
    case 'DELETE_ADVERSE_EVENT':
      return mapP(action.payload.patientId, (p) => ({
        ...p,
        adverseEvents: p.adverseEvents.filter((e) => e.id !== action.payload.eventId),
      }));
    case 'ADD_CONCOMITANT_MED':
      return mapP(action.payload.patientId, (p) => ({ ...p, concomitantMeds: [...p.concomitantMeds, action.payload.med] }));
    case 'UPDATE_CONCOMITANT_MED':
      return mapP(action.payload.patientId, (p) => ({
        ...p,
        concomitantMeds: p.concomitantMeds.map((m) => (m.id === action.payload.medId ? action.payload.med : m)),
      }));
    case 'DELETE_CONCOMITANT_MED':
      return mapP(action.payload.patientId, (p) => ({
        ...p,
        concomitantMeds: p.concomitantMeds.filter((m) => m.id !== action.payload.medId),
      }));
    case 'ADD_NON_DRUG':
      return mapP(action.payload.patientId, (p) => ({ ...p, nonDrugTherapies: [...p.nonDrugTherapies, action.payload.therapy] }));
    case 'UPDATE_NON_DRUG':
      return mapP(action.payload.patientId, (p) => ({
        ...p,
        nonDrugTherapies: p.nonDrugTherapies.map((t) => (t.id === action.payload.therapyId ? action.payload.therapy : t)),
      }));
    case 'DELETE_NON_DRUG':
      return mapP(action.payload.patientId, (p) => ({
        ...p,
        nonDrugTherapies: p.nonDrugTherapies.filter((t) => t.id !== action.payload.therapyId),
      }));
    case 'UPDATE_COMPLETION':
      return mapP(action.payload.patientId, (p) => ({ ...p, completion: action.payload.completion }));
    default:
      return state;
  }
}

interface Ctx {
  state: AppState;
  dispatch: Dispatch<Action>;
}

const PatientContext = createContext<Ctx | null>(null);

export function PatientProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, init);

  // 持久化（防刷新丢失）
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ _v: SCHEMA_VERSION, ...state }));
    } catch {
      /* storage full / unavailable */
    }
  }, [state]);

  return <PatientContext.Provider value={{ state, dispatch }}>{children}</PatientContext.Provider>;
}

export function usePatientStore(): Ctx {
  const ctx = useContext(PatientContext);
  if (!ctx) throw new Error('usePatientStore 必须在 <PatientProvider> 内使用');
  return ctx;
}

export function useCurrentUser(): CurrentUser | null {
  return usePatientStore().state.currentUser;
}
