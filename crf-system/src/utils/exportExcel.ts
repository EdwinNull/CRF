/**
 * Excel 导出逻辑 (plan.md §5.14)
 * 基于 SheetJS (xlsx)。DEMO 在前端直接生成并下载。
 *
 * 工作簿 4 个 Sheet：
 *   1. 主数据表：每行一个患者，列按 基本信息 → V1 全字段 → ... → V6 全字段 展开
 *   2. 不良事件
 *   3. 合并用药
 *   4. 合并非药物治疗
 * 列名命名 `{访视}_{模块}_{字段}`
 */
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import type { CenterId, Patient } from '../types/patient';
import type { VisitData } from '../types/visit';
import { CENTER_NAME } from '../mock/dictionaries';

/** 单值 -> 单元格字符串（扁平化对象、数组） */
function cell(value: unknown): string {
  if (value == null || value === '') return '';
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (Array.isArray(value)) return value.join('、');
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

interface FlatRow {
  筛选号: string;
  随机编号: string;
  姓名缩写: string;
  研究中心: string;
  入组日期: string;
  当前状态: string;
  [k: string]: string;
}

const MODULE_MAP: Record<keyof VisitData, string> = {
  visitNo: '访视', visitDate: '访视', status: '访视',
  vitalSigns: '生命体征', vasScores: 'VAS', symptomFourScale: '四分法症状', rqlqScores: 'RQLQ', tcmScores: '中医证候',
  labBlood: '血常规', labUrine: '尿常规', labBiochem: '血生化', feno: 'FeNO', ecg: '心电图', serumIgE: '总IgE',
  medScore: '药物评分', drugRecovery: '药物回收', efficacy: '疗效评估',
  hasAdverseEvent: '访视', hasNewConcomitantMed: '访视',
};

/** 将单个字段对象铺开为若干 `模块_字段` 列 */
function flattenObj(prefix: string, obj: object, out: Record<string, string>): void {
  for (const [k, v] of Object.entries(obj)) {
    if (v == null) continue;
    if (typeof v === 'object' && !Array.isArray(v)) {
      flattenObj(`${prefix}.${k}`, v as object, out);
    } else {
      out[`${prefix}.${k}`] = cell(v);
    }
  }
}

function visitColumns(visitNo: string, v: VisitData): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, val] of Object.entries(v)) {
    if (val == null) continue;
    const mod = MODULE_MAP[key as keyof VisitData] || '其他';
    if (typeof val === 'object' && !Array.isArray(val)) {
      flattenObj(`${visitNo}_${mod}`, val as object, out);
    } else {
      out[`${visitNo}_${mod}_${key}`] = cell(val);
    }
  }
  return out;
}

export interface ExportFilter {
  centers: CenterId[];
  statuses: string[];
  dateRange: [string, string] | null;
}

export function filterPatients(all: Patient[], f: ExportFilter): Patient[] {
  return all.filter((p) => {
    if (f.centers.length && !f.centers.includes(p.centerId)) return false;
    if (f.statuses.length && !f.statuses.includes(p.status)) return false;
    if (f.dateRange && p.enrollmentDate) {
      if (p.enrollmentDate < f.dateRange[0] || p.enrollmentDate > f.dateRange[1]) return false;
    }
    return true;
  });
}

function buildMainRows(list: Patient[]): Record<string, string>[] {
  return list.map((p) => {
    const row: FlatRow = {
      筛选号: p.screeningNo,
      随机编号: p.randomNo,
      姓名缩写: p.nameAbbr,
      研究中心: CENTER_NAME[p.centerId] ?? p.centerId,
      入组日期: p.enrollmentDate,
      当前状态: p.status,
    };
    for (const no of ['V1', 'V2', 'V3', 'V4', 'V5', 'V6'] as const) {
      const v = p.visits[no];
      if (!v) continue;
      Object.assign(row, visitColumns(no, v));
    }
    return row as Record<string, string>;
  });
}

/** 主 Sheet 的完整列顺序（以第一条记录为准） */
function mainSheet(list: Patient[]): XLSX.WorkSheet {
  const rows = buildMainRows(list);
  const ws = XLSX.utils.json_to_sheet(rows.length ? rows : [{ 提示: '无匹配数据' }], { header: [] });
  return ws;
}

function buildSheet<T extends { seqNo: number }>(
  list: Patient[],
  pick: (p: Patient) => T[],
  fields: { key: string; label: string }[],
): XLSX.WorkSheet {
  const rows: Record<string, string>[] = [];
  for (const p of list) {
    for (const item of pick(p)) {
      const row: Record<string, string> = { 筛选号: `${p.screeningNo}` };
      for (const f of fields) {
        const v = (item as unknown as Record<string, unknown>)[f.key];
        row[f.label] = typeof v === 'object' && v != null && !Array.isArray(v)
          ? JSON.stringify(v)
          : cell(v);
      }
      rows.push(row);
    }
  }
  const ws = XLSX.utils.json_to_sheet(rows.length ? rows : [{ 提示: '无匹配数据' }]);
  return ws;
}

const AE_FIELDS = [
  { key: 'seqNo', label: '编号' }, { key: 'eventName', label: '事件名称' }, { key: 'description', label: '描述' },
  { key: 'startDate', label: '开始日期' }, { key: 'endDate', label: '结束日期' }, { key: 'severity', label: '严重程度' },
  { key: 'drugRelation', label: '与研究药物关系' }, { key: 'outcome', label: '转归' }, { key: 'isSAE', label: '是否SAE' },
  { key: 'saeType', label: 'SAE类型' },
];
const MED_FIELDS = [
  { key: 'seqNo', label: '编号' }, { key: 'drugName', label: '药名' }, { key: 'indication', label: '适应症' },
  { key: 'dosageForm', label: '剂型' }, { key: 'dosageAmount', label: '剂量' }, { key: 'startDate', label: '开始日期' },
  { key: 'endDate', label: '结束日期' }, { key: 'drugRelation', label: '与研究药物关系' },
];
const NONDRUG_FIELDS = [
  { key: 'seqNo', label: '编号' }, { key: 'therapyName', label: '治疗名称' }, { key: 'therapyType', label: '类型' },
  { key: 'methodFrequency', label: '方法/频率' }, { key: 'startDate', label: '开始日期' }, { key: 'endDate', label: '结束日期' },
];

export function exportAll(list: Patient[]): void {
  const wb = XLSX.utils.book_new();
  const main = mainSheet(list);
  main['!cols'] = [];
  XLSX.utils.book_append_sheet(wb, main, '主数据表');
  XLSX.utils.book_append_sheet(wb, buildSheet(list, (p) => p.adverseEvents, AE_FIELDS), '不良事件');
  XLSX.utils.book_append_sheet(wb, buildSheet(list, (p) => p.concomitantMeds, MED_FIELDS), '合并用药');
  XLSX.utils.book_append_sheet(wb, buildSheet(list, (p) => p.nonDrugTherapies, NONDRUG_FIELDS), '合并非药物治疗');
  const out = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  saveAs(new Blob([out], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), `CRF数据导出_${dateStamp()}.xlsx`);
}

/** 安全性数据：仅 AE + 合并用药 + 非药物 */
export function exportSafety(list: Patient[]): void {
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, buildSheet(list, (p) => p.adverseEvents, AE_FIELDS), '不良事件');
  XLSX.utils.book_append_sheet(wb, buildSheet(list, (p) => p.concomitantMeds, MED_FIELDS), '合并用药');
  XLSX.utils.book_append_sheet(wb, buildSheet(list, (p) => p.nonDrugTherapies, NONDRUG_FIELDS), '合并非药物治疗');
  const out = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  saveAs(new Blob([out], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), `CRF安全性数据_${dateStamp()}.xlsx`);
}

function dateStamp(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}`;
}
