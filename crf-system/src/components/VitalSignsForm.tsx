/**
 * VitalSignsForm — 生命体征表单 (plan.md §6.7)
 * 5 个 InputNumber 横向排列，min/max 取自 dictionaries.VITAL_RANGES。
 * 受控组件，value 可空（有默认值），onChange 回传完整 VitalSigns。
 */
import { useState } from 'react';
import { InputNumber, Typography } from 'antd';
import { VITAL_RANGES } from '../mock/dictionaries';
import type { VitalSigns } from '../types/visit';
import type { VitalSignsFormProps } from './componentTypes';

const { Text } = Typography;

const DEFAULT_VITALS: VitalSigns = {
  temperature: 36.5,
  pulse: 72,
  systolicBP: 118,
  diastolicBP: 76,
  respiration: 16,
};

type Key = keyof VitalSigns;

const FIELDS: {
  key: Key;
  label: string;
  unit: string;
  precision: number;
  step?: number;
}[] = [
  { key: 'temperature', label: '体温', unit: '℃', precision: 1, step: 0.1 },
  { key: 'pulse', label: '脉搏', unit: '次/分', precision: 0 },
  { key: 'systolicBP', label: '收缩压', unit: 'mmHg', precision: 0 },
  { key: 'diastolicBP', label: '舒张压', unit: 'mmHg', precision: 0 },
  { key: 'respiration', label: '呼吸', unit: '次/分', precision: 0 },
];

export default function VitalSignsForm({ value, onChange, disabled }: VitalSignsFormProps) {
  const [vitals, setVitals] = useState<VitalSigns>(() => ({
    ...DEFAULT_VITALS,
    ...(value ?? {}),
  }));
  const [prev, setPrev] = useState(value);
  if (value !== prev) {
    setPrev(value);
    setVitals({ ...DEFAULT_VITALS, ...(value ?? {}) });
  }

  const update = (key: Key, v: number | null) => {
    const next: VitalSigns = { ...vitals, [key]: v === null ? 0 : v };
    setVitals(next);
    onChange?.(next);
  };

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 24, rowGap: 16 }}>
      {FIELDS.map(({ key, label, unit, precision, step }) => {
        const [min, max] = VITAL_RANGES[key] as readonly [number, number];
        return (
          <div key={key} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span>
              {label}
              <Text type="secondary" style={{ marginLeft: 4, fontSize: 12 }}>
                {unit}
              </Text>
            </span>
            <InputNumber
              min={min}
              max={max}
              precision={precision}
              step={step}
              disabled={disabled}
              placeholder="请输入"
              style={{ width: 120 }}
              value={vitals[key]}
              onChange={(v) => update(key, v ?? null)}
              addonAfter={<span style={{ color: '#999', fontSize: 12 }}>{unit}</span>}
            />
            <Text type="secondary" style={{ fontSize: 12 }}>
              {min}~{max}
            </Text>
          </div>
        );
      })}
    </div>
  );
}
