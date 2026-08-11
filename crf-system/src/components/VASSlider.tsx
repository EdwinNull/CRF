/**
 * VASSlider — VAS 评分滑条组件 (plan.md §5.4 模块 K / §6.2)
 *
 * 受控组件：value?: VASScores, onChange, disabled?。
 * 6 个症状各一行（标签 + Slider 0-10 + 当前值/严重程度 Tag），
 * 底部用 Statistic 汇总 VAS 总分，onChange 回传含 total 的完整对象。
 */
import { Statistic, Slider, Tag } from 'antd';
import type { VASScores } from '../types/visit';
import type { VASSliderProps } from './componentTypes';
import { VAS_ITEMS } from '../mock/dictionaries';
import { calcVASTotal, vasSeverity } from '../utils/scoring';

/** value 为 undefined 时的默认形态（0 分，total 自动计算） */
const DEFAULT_VAS: VASScores = {
  sneeze: 0,
  rhinorrhea: 0,
  nasalItch: 0,
  nasalCongestion: 0,
  eyeItch: 0,
  lacrimation: 0,
  total: 0,
};

/** 严重程度 → Tag 配色 */
const SEVERITY_COLOR: Record<'轻度' | '中度' | '重度', string> = {
  轻度: 'success',
  中度: 'warning',
  重度: 'error',
};

export default function VASSlider({ value, onChange, disabled }: VASSliderProps) {
  const scores: VASScores = { ...DEFAULT_VAS, ...value };

  const total = calcVASTotal(scores);

  const handleChange = (field: keyof VASScores) => (n: number) => {
    const next = { ...scores, [field]: n };
    onChange?.({ ...next, total: calcVASTotal(next) });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {VAS_ITEMS.map(({ key, label }) => {
        const v = scores[key as keyof VASScores] as number;
        const sev = vasSeverity(v);
        return (
          <div
            key={key}
            style={{ display: 'flex', alignItems: 'center', gap: 16 }}
          >
            <span style={{ width: 60, flexShrink: 0 }}>{label}</span>
            <Slider
              min={0}
              max={10}
              step={1}
              value={v}
              disabled={disabled}
              onChange={handleChange(key as keyof VASScores)}
              style={{ flex: 1 }}
              marks={{
                0: '0',
                10: '10',
              }}
            />
            <div
              style={{
                width: 84,
                flexShrink: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-end',
                gap: 6,
              }}
            >
              <b>{v}</b>
              <Tag color={SEVERITY_COLOR[sev]} style={{ marginInlineEnd: 0 }}>
                {sev}
              </Tag>
            </div>
          </div>
        );
      })}
      <Statistic
        title="VAS 总分"
        value={total}
        style={{ textAlign: 'right', paddingTop: 4 }}
      />
    </div>
  );
}
