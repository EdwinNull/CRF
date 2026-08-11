/**
 * 后端 API 封装：登录 / 患者 / 访视 / 导出
 * 面向后端的 snake_case 结构；前端层负责映射（见 mappers.ts）。
 */
import http, { getToken } from './http';
import type { BackendPatient, BackendVisit, BackendToken, BackendUser } from './types';

/* ============ 认证 ============ */

export async function apiLogin(username: string, password: string, centerId: string): Promise<{ token: BackendToken; user: BackendUser }> {
  const { data: token } = await http.post<BackendToken>('/auth/login', { username, password, center_id: centerId });
  const { data: user } = await http.get<BackendUser>('/auth/me', {
    headers: { Authorization: `Bearer ${token.access_token}` },
  });
  return { token, user };
}

/* ============ 患者 ============ */

export interface PatientListQuery {
  center_id?: string;
  status?: string;
  search?: string;
  skip?: number;
  limit?: number;
}

export async function apiListPatients(q: PatientListQuery = {}): Promise<BackendPatient[]> {
  const { data } = await http.get<BackendPatient[]>('/patients', { params: q });
  return data;
}

export async function apiGetPatient(id: number): Promise<BackendPatient> {
  const { data } = await http.get<BackendPatient>(`/patients/${id}`);
  return data;
}

export interface PatientCreatePayload {
  screening_no: string;
  name_abbr: string;
  gender: string;
  age: number;
  height: number;
  weight: number;
  enrollment_date: string;
}

export async function apiCreatePatient(p: PatientCreatePayload): Promise<BackendPatient> {
  const { data } = await http.post<BackendPatient>('/patients', p);
  return data;
}

export async function apiUpdatePatient(
  id: number,
  patch: Partial<Pick<BackendPatient, 'status' | 'randomization_no' | 'withdrawal_reason' | 'withdrawal_date' | 'completion_summary'>>,
): Promise<BackendPatient> {
  const { data } = await http.patch<BackendPatient>(`/patients/${id}`, patch);
  return data;
}

/* ============ 访视 ============ */

export async function apiListVisits(patientId: number): Promise<BackendVisit[]> {
  const { data } = await http.get<BackendVisit[]>(`/patients/${patientId}/visits`);
  return data;
}

export async function apiUpdateVisit(
  patientId: number,
  visitNo: string,
  payload: { visit_date?: string; data?: Record<string, unknown>; status?: string },
): Promise<BackendVisit> {
  const { data } = await http.patch<BackendVisit>(`/patients/${patientId}/visits/${visitNo}`, payload);
  return data;
}

/* ============ 导出 ============ */

/** 调用后端导出接口，返回浏览器可下载的 Blob */
export async function apiExport(mode: 'full' | 'safety', params: Record<string, string> = {}): Promise<Blob> {
  const token = getToken();
  const res = await fetch(`/api/v1/export?mode=${mode}&` + new URLSearchParams(params), {
    headers: { Authorization: token ? `Bearer ${token}` : '' },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(text || `导出失败（HTTP ${res.status}）`);
  }
  return res.blob();
}
