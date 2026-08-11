import React, { useMemo } from 'react';
import { Radio, Space, Typography } from 'antd';
import type { TCMScores } from '../types/visit';
import type { TCMScoreFormProps } from './componentTypes';
import { TCM_MAIN_SYMPTOMS, TCM_SUB_SYMPTOMS } from '../mock/dictionaries';
import { calcTCMTotal } from '../utils/scoring';

/** value 缺省时的 0 默认形态（含空文本与 0 total） */
const EMPTY: TCMScores = {
  nasalItch: 0,
  sneeze: 0,
  rhinorrhea: 0,
  nasalCongestion: 0,
  windColdAversion: 0,
  bodyAche: 0,
  sweating: 0,
  cough: 0,
  paleFace: 0,
  tongueDesc: '',
  pulseDesc: '',
  total: 0,
};

/** 卡片式 Radio 单项：选中态蓝色高亮边框与底纹 */
const ScoreCard: React.FC<{
  value: number;
  desc: string;
  checked: boolean;
  disabled?: boolean;
}> = ({ value, desc, checked, disabled }) => (
  <label
    className="tcm-score-card"
    style={{
      flex: 1,
      minWidth: 120,
      padding: '10px 12px',
      borderRadius: 8,
      border: checked ? '2px solid #1677ff' : '1px solid #d9d9d9',
      background: checked ? '#e6f4ff' : '#fff',
      cursor: disabled ? 'not-allowed' : 'pointer',
      opacity: disabled ? 0.5 : 1,
      boxSizing: 'border-box',
    }}
  >
    <Radio
      value={value}
      disabled={disabled}
      style={{ fontSize: 14 }}
    />
    <div style={{ fontWeight: 600, color: '#1677ff' }}>{value} 分</div>
    <div style={{ fontSize: 13, color: '#595959', lineHeight: 1.5 }}>{desc}</div>
  </label>
);

const TCMScoreForm: React.FC<TCMScoreFormProps> = ({ value, onChange, disabled }) => {
  const current: TCMScores = useMemo(() => ({ ...EMPTY, ...value }), [value]);

  const total = useMemo(() => calcTCMTotal(current), [current]);

  /** 数值项更新：不可变，追加 total */
  const patch = <K extends keyof TCMScores>(key: K, v: TCMScores[K]) => {
    if (!onChange) return;
    const next = { ...current, [key]: v } as TCMScores;
    onChange({ ...next, total: calcTCMTotal(next) } as TCMScores);
  };

  /** 文本项更新：不影响 total（calcTCMTotal 忽略文本） */
  const patchText = (key: 'tongueDesc' | 'pulseDesc', v: string) => {
    if (!onChange) return;
    onChange({ ...current, [key]: v, total: calcTCMTotal(current) } as TCMScores);
  };

  return (
    <div>
      <Typography.Title level={5} style={{ marginTop: 0 }}>
        主症（0/2/4/6 分）
      </Typography.Title>
      <Space direction="vertical" size={12} style={{ width: '100%' }}>
        {TCM_MAIN_SYMPTOMS.map((item) => (
          <div key={item.key} style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
            <Typography.Text strong style={{ width: 72, paddingTop: 10 }}>
              {item.label}
            </Typography.Text>
            <Radio.Group
              disabled={disabled}
              value={current[item.key as keyof TCMScores]}
              onChange={(e) => patch(item.key as keyof TCMScores, e.target.value)}
              style={{ display: 'flex', flex: 1, gap: 8, flexWrap: 'wrap' }}
            >
              {item.options.map((opt) => (
                <ScoreCard
                  key={opt.value}
                  value={opt.value}
                  desc={opt.desc}
                  checked={current[item.key as keyof TCMScores] === opt.value}
                  disabled={disabled}
                />
              ))}
            </Radio.Group>
          </div>
        ))}
      </Space>

      <Typography.Title level={5} style={{ marginTop: 24 }}>
        次症（0/1/2/3 分）
      </Typography.Title>
      <Space direction="vertical" size={12} style={{ width: '100%' }}>
        {TCM_SUB_SYMPTOMS.map((item) => (
          <div key={item.key} style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
            <Typography.Text strong style={{ width: 72, paddingTop: 10 }}>
              {item.label}
            </Typography.Text>
            <Radio.Group
              disabled={disabled}
              value={current[item.key as keyof TCMScores]}
              onChange={(e) => patch(item.key as keyof TCMScores, e.target.value)}
              style={{ display: 'flex', flex: 1, gap: 8, flexWrap: 'wrap' }}
            >
              {item.options.map((opt) => (
                <ScoreCard
                  key={opt.value}
                  value={opt.value}
                  desc={opt.desc}
                  checked={current[item.key as keyof TCMScores] === opt.value}
                  disabled={disabled}
                />
              ))}
            </Radio.Group>
          </div>
        ))}
      </Space>

      <Space size={16} style={{ width: '100%', marginTop: 24 }} align="start">
        <div style={{ flex: 1 }}>
          <Typography.Text strong>舌象描述：</Typography.Text>
          <input
            type="text"
            className="ant-input"
            disabled={disabled}
            value={current.tongueDesc}
            placeholder="请输入舌象描述"
            style={{ width: '100%', marginTop: 4 }}
            onChange={(e) => patchText('tongueDesc', e.target.value)}
          />
        </div>
        <div style={{ flex: 1 }}>
          <Typography.Text strong>脉象描述：</Typography.Text>
          <input
            type="text"
            className="ant-input"
            disabled={disabled}
            value={current.pulseDesc}
            placeholder="请输入脉象描述"
            style={{ width: '100%', marginTop: 4 }}
            onChange={(e) => patchText('pulseDesc', e.target.value)}
          />
        </div>
      </Space>

      <div style={{ marginTop: 20, padding: '12px 16px', background: '#e6f4ff', borderRadius: 8, border: '1px solid #91caff' }}>
        <Typography.Text strong style={{ fontSize: 15 }}>
          中医证候积分：{total}
        </Typography.Text>
        <Typography.Text type="secondary" style={{ marginLeft: 8 }}>
          （主症 4 项 + 次症 5 项之和，不含舌象/脉象文本）
        </Typography.Text>
      </div>
    </div>
  );
};

export default TCMScoreForm;
