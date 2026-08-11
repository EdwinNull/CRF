/**
 * MedScoreForm — 药物评分表单 (plan.md §6.6)
 * 5 种用药类型：口服/鼻用/滴眼抗组胺药（每日1分）、鼻用糖皮质激素（每日2分）、口服糖皮质激素（每日3分）。
 * 受控组件，onChange 回传含各类型 total 与 grandTotal 的完整 MedScore。
 */
import { useState } from 'react';
import { Checkbox, InputNumber, Table, Typography } from 'antd';
import { drugTypeTotal, calcMedScoreTotal } from '../utils/scoring';
import type { MedScore } from '../types/visit';
import type { MedScoreFormProps } from './componentTypes';

const { Text } = Typography;

/** 五种用药类型配置（key 对应 MedScore 字段，points 为每日计分） */
const DRUG_TYPES: {
  key: keyof Omit<MedScore, 'grandTotal'>;
  label: string;
  points: number;
}[] = [
  { key: 'oralAntihistamine', label: '口服抗组胺药', points: 1 },
  { key: 'nasalAntihistamine', label: '鼻用抗组胺药', points: 1 },
  { key: 'eyeAntihistamine', label: '滴眼抗组胺药', points: 1 },
  { key: 'nasalSteroid', label: '鼻用糖皮质激素', points: 2 },
  { key: 'oralCorticosteroid', label: '口服糖皮质激素', points: 3 },
];

type DrugGroup = { selected: boolean; days: number; total: number };

const emptyGroupState = (): { [K in (typeof DRUG_TYPES)[number]['key']]: DrugGroup } => ({
  oralAntihistamine: { selected: false, days: 0, total: 0 },
  nasalAntihistamine: { selected: false, days: 0, total: 0 },
  eyeAntihistamine: { selected: false, days: 0, total: 0 },
  nasalSteroid: { selected: false, days: 0, total: 0 },
  oralCorticosteroid: { selected: false, days: 0, total: 0 },
});

/** 从外部 value 归一化为内部状态（未选中时 days 视作 0） */
function fromValue(value?: MedScore): { [K in (typeof DRUG_TYPES)[number]['key']]: DrugGroup } {
  const base = emptyGroupState();
  if (!value) return base;
  for (const { key } of DRUG_TYPES) {
    const group = value[key];
    if (!group) continue;
    base[key] = {
      selected: !!group.selected,
      days: group.selected ? group.days || 0 : 0,
      total: group.selected ? group.total || 0 : 0,
    };
  }
  return base;
}

export default function MedScoreForm({ value, onChange, disabled }: MedScoreFormProps) {
  const [groups, setGroups] = useState(() => fromValue(value));

  // 外部 value 变化（如 Form 重置/回填）时同步内部状态
  const [prevValue, setPrevValue] = useState(value);
  if (value !== prevValue) {
    setPrevValue(value);
    setGroups(fromValue(value));
  }

  /** 更新某一类，并回传完整 MedScore */
  const updateGroup = (
    key: (typeof DRUG_TYPES)[number]['key'],
    patch: { selected?: boolean; days?: number },
  ) => {
    const old = groups[key];
    const selected = patch.selected ?? old.selected;
    const days = patch.days === undefined ? old.days : patch.days;

    const next: { [K in (typeof DRUG_TYPES)[number]['key']]: DrugGroup } = { ...groups };
    const daysVal = selected ? days || 0 : 0;
    const info = DRUG_TYPES.find((d) => d.key === key)!;
    next[key] = {
      selected,
      days: daysVal,
      total: selected ? drugTypeTotal(info.points, daysVal) : 0,
    };
    setGroups(next);
    onChange?.(compose(next));
  };

  const compose = (
    g: { [K in (typeof DRUG_TYPES)[number]['key']]: DrugGroup },
  ): MedScore => ({
    oralAntihistamine: g.oralAntihistamine,
    nasalAntihistamine: g.nasalAntihistamine,
    eyeAntihistamine: g.eyeAntihistamine,
    nasalSteroid: g.nasalSteroid,
    oralCorticosteroid: g.oralCorticosteroid,
    grandTotal: calcMedScoreTotal({
      oralAntihistamine: g.oralAntihistamine,
      nasalAntihistamine: g.nasalAntihistamine,
      eyeAntihistamine: g.eyeAntihistamine,
      nasalSteroid: g.nasalSteroid,
      oralCorticosteroid: g.oralCorticosteroid,
      grandTotal: 0,
    }),
  });

  const rows = DRUG_TYPES.map(({ key, label, points }) => {
    const group = groups[key];
    return {
      key,
      name: (
        <Checkbox
          checked={group.selected}
          disabled={disabled}
          onChange={(e) => updateGroup(key, { selected: e.target.checked })}
        >
          {label}
          <Text type="secondary" style={{ fontWeight: 400 }}>
            （每日{points}分）
          </Text>
        </Checkbox>
      ),
      days: (
        <InputNumber
          min={0}
          precision={0}
          disabled={disabled || !group.selected}
          placeholder="天数"
          value={group.selected ? group.days : 0}
          onChange={(v) => updateGroup(key, { days: v === null ? 0 : v })}
          style={{ width: 140 }}
        />
      ),
      total: group.total,
    };
  });

  return (
    <div>
      <Table
        size="small"
        pagination={false}
        columns={[
          { title: '药物类别', dataIndex: 'name' },
          { title: '用药天数（天）', dataIndex: 'days', width: 200 },
          { title: '本类得分', dataIndex: 'total', width: 120 },
        ]}
        dataSource={rows}
        locale={{ emptyText: '暂无药物评分记录' }}
      />
      <div style={{ textAlign: 'right', marginTop: 12 }}>
        <Text strong>
          药物评分总分：<span style={{ color: '#1677ff' }}>{compose(groups).grandTotal}</span>
        </Text>
      </div>
    </div>
  );
}
