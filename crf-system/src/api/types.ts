/**
 * 后端 API 类型定义
 * 对应 crf-backend/app/schemas/schemas.py 与 models/*.py。
 * 后端 id 为 int，返回 snake_case 字段。
 */

/** 后端 PatientResponse（扁平字段） */
export interface BackendPatient {
  id: number;
  screening_no: string;
  randomization_no: string | null;
  name_abbr: string;
  center_id: string;
  gender: string;
  age: number | null;
  height: number | null;
  weight: number | null;
  enrollment_date: string;
  status: string;
  withdrawal_reason: string | null;
  withdrawal_date: string | null;
  completion_summary: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

/** 后端 VisitResponse */
export interface BackendVisit {
  id: number;
  patient_id: number;
  visit_no: string;
  visit_date: string | null;
  status: string; // draft | submitted
  data: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

/** 后端 UserResponse（login/me） */
export interface BackendUser {
  id: number;
  username: string;
  full_name: string | null;
  role: string;
  center_id: string;
  is_active: boolean;
}

/** 登录响应 */
export interface BackendToken {
  access_token: string;
  token_type: string;
}
