/**
 * SymptomScoreCard — 四分法鼻眼症状评分 (plan.md §5.4 模块 L / §6.3)
 *
 * 受控组件：value?: SymptomFourScale, onChange, disabled?。
 * 6 个症状各一组卡片式 Radio（0-3 分），卡片内展示分值与 CRF 原文描述，
 * 选中卡片蓝色边框高亮。底部按鼻部（前4项）与鼻眼（全6项）双总分汇总，
 * onChange 回传含 nasalTotal / totalScore 的完整对象。
 */
import { Radio, Statistic } from 'antd';
import type { SymptomFourScale } from '../types/visit';
import type { SymptomScoreCardProps } from './componentTypes';
import { FOUR_SCALE_DESC, VAS_ITEMS } from '../mock/dictionaries';
import { calcNasalTotal, calcSymptomTotal } from '../utils/scoring';

/** value 为 undefined 时的默认形态（全 0） */
const DEFAULT_SCORES: SymptomFourScale = {
  sneeze: 0,
  rhinorrhea: 0,
  nasalItch: 0,
  nasalCongestion: 0,
  eyeItch: 0,
  lacrimation: 0,
  nasalTotal: 0,
  totalScore: 0,
};

export default function SymptomScoreCard({
  value,
  onChange,
  disabled,
}: SymptomScoreCardProps) {
  const scores: SymptomFourScale = { ...DEFAULT_SCORES, ...value };

  const handleChange =
    (field: keyof SymptomFourScale) => (selected: number) => {
      const next = {
        ...scores,
        [field]: selected as SymptomFourScale[typeof field],
      };
      // calcNasalTotal / calcSymptomTotal 读取的是 numeric 字段，不受 total 字段类型影响
      onChange?.({
        ...next,
        nasalTotal: calcNasalTotal(next),
        totalScore: calcSymptomTotal(next),
      });
    };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {VAS_ITEMS.map(({ key, label }) => {
        const field = key as keyof SymptomFourScale;
        const meta = FOUR_SCALE_DESC[key];
        const current = scores[field] as number;
        return (
          <div key={key}>
            <div style={{ fontWeight: 600, marginBottom: 8 }}>
              {meta.label}
              {label === '眼痒' ? '（眼痒/异物感/眼红）' : null}
            </div>
            <Radio.Group
              value={current}
              disabled={disabled}
              onChange={(e) => handleChange(field)(e.target.value as number)}
              style={{ display: 'flex', gap: 8 }}
            >
              {meta.options.map((opt) => {
                const selected = opt.value === current;
                return (
                  <Radio
                    key={opt.value}
                    value={opt.value}
                    style={{
                      border: selected ? '1px solid #1677ff' : '1px solid #d9d9d9',
                      borderRadius: 8,
                      padding: '8px 12px',
                      marginInlineEnd: 0,
                      background: selected ? '#e6f4ff' : '#fff',
                      height: 'auto',
                      flex: 1,
                      minWidth: 0,
                    }}
                  >
                    <div style={{ fontWeight: 600, whiteSpace: 'nowrap' }}>
                      {opt.value}分
                    </div>
                    <div style={{ color: '#666', fontSize: 12, marginTop: 2 }}>
                      {opt.desc}
                    </div>
                  </Radio>
                );
              })}
            </Radio.Group>
          </div>
        );
      })}

      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          gap: 8,
          borderTop: '1px dashed #e5e5e5',
          paddingTop: 12,
        }}
      >
        <Statistic title="鼻部症状总分（前4项）" value={scores.nasalTotal} />
        <Statistic title="鼻眼症状总分（全6项）" value={scores.totalScore} />
      </div>
    </div>
  );
}
