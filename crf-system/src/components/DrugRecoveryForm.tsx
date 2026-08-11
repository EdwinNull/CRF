/**
 * DrugRecoveryForm — 药物回收/发放表单 (plan.md §6.10)
 * 三个 InputNumber：回收支数、应服支数、发放支数。
 * 依从性 = calcCompliance(expected, returned)，随输入实时显示百分比；
 * 依从性 < 80% 或 > 120% 时以红色 Alert 提醒。onChange 回传含 compliance 的完整 DrugRecovery。
 */
import { useState } from 'react';
import { Alert, InputNumber, Typography } from 'antd';
import { calcCompliance } from '../utils/scoring';
import type { DrugRecovery } from '../types/visit';
import type { DrugRecoveryFormProps } from './componentTypes';

const { Text } = Typography;

interface FieldDef {
  key: keyof DrugRecovery;
  label: string;
  unit: string;
}

const FIELDS: FieldDef[] = [
  { key: 'returnedCount', label: '回收支数', unit: '支' },
  { key: 'expectedCount', label: '应服支数', unit: '支' },
  { key: 'dispensedCount', label: '发放支数', unit: '支' },
];

export default function DrugRecoveryForm({ value, onChange, disabled }: DrugRecoveryFormProps) {
  const [state, setState] = useState<DrugRecovery>(() =>
    defaultState(value),
  );
  const [prev, setPrev] = useState(value);
  if (value !== prev) {
    setPrev(value);
    setState(defaultState(value));
  }

  function defaultState(v?: DrugRecovery): DrugRecovery {
    return {
      returnedCount: v?.returnedCount ?? 0,
      expectedCount: v?.expectedCount ?? 0,
      dispensedCount: v?.dispensedCount ?? 0,
      compliance: v?.compliance ?? 0,
    };
  }

  const recompute = (rec: DrugRecovery, changed: keyof DrugRecovery, v: number) => {
    const next: DrugRecovery = { ...rec, [changed]: v };
    // 依从性基于最新应服/回收算；changed 可能是其他字段，用最新的两个值重算
    const expected = changed === 'expectedCount' ? v : rec.expectedCount;
    const returned = changed === 'returnedCount' ? v : rec.returnedCount;
    next.compliance = calcCompliance(expected, returned);
    setState(next);
    onChange?.(next);
  };

  const complianceDisplay = state.expectedCount > 0 ? state.compliance : null;
  const abnormal =
    complianceDisplay !== null && (complianceDisplay < 80 || complianceDisplay > 120);

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 24, rowGap: 16 }}>
      {FIELDS.map(({ key, label, unit }) => (
        <div key={key} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <span>{label}</span>
          <InputNumber
            min={0}
            precision={0}
            disabled={disabled}
            placeholder="请输入"
            style={{ width: 140 }}
            value={state[key]}
            addonAfter={<span style={{ color: '#999', fontSize: 12 }}>{unit}</span>}
            onChange={(v) => recompute(state, key, v === null ? 0 : v)}
          />
        </div>
      ))}

      {/* 依从性实时展示（计算字段，不可编辑） */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <span>依从性（应服-回收）/应服</span>
        <Text strong style={{ fontSize: 20, color: abnormal ? '#cf1322' : '#1677ff' }}>
          {complianceDisplay === null ? '--' : `${complianceDisplay}%`}
        </Text>
      </div>

      {abnormal && (
        <Alert
          type="error"
          showIcon
          style={{ width: '100%' }}
          message="依从性异常，需评估是否退出试验"
        />
      )}
    </div>
  );
}
