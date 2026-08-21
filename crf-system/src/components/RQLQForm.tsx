import React, { useMemo } from 'react';
import { Collapse, Radio, Space, Tag, Typography } from 'antd';
import type { RQLQScores } from '../types/visit';
import type { RQLQFormProps } from './componentTypes';
import { RQLQ_QUESTIONS } from '../mock/dictionaries';
import { calcRQLQTotal, sumNumbers } from '../utils/scoring';

const { Panel } = Collapse;

/** 各维度字段数组长度 → 0 。字段顺序与 RQLQScores 类型保持一致 */
function emptyScores(): Omit<RQLQScores, 'total'> {
  return {
    activityLimit: [0, 0, 0],
    sleep: [0, 0, 0],
    nonNasalEye: [0, 0, 0, 0, 0, 0, 0],
    practicalProblems: [0, 0, 0],
    nasalSymptoms: [0, 0, 0, 0],
    eyeSymptoms: [0, 0, 0, 0],
    emotion: [0, 0, 0],
  };
}

const RQLQForm: React.FC<RQLQFormProps> = ({ value, onChange, disabled }) => {
  type DimKey = Exclude<keyof RQLQScores, 'total'>;
  const base = useMemo(() => {
    const b = emptyScores();
    if (!value) return b;
    return {
      activityLimit: Object.assign([], b.activityLimit, value.activityLimit),
      sleep: Object.assign([], b.sleep, value.sleep),
      nonNasalEye: Object.assign([], b.nonNasalEye, value.nonNasalEye),
      practicalProblems: Object.assign([], b.practicalProblems, value.practicalProblems),
      nasalSymptoms: Object.assign([], b.nasalSymptoms, value.nasalSymptoms),
      eyeSymptoms: Object.assign([], b.eyeSymptoms, value.eyeSymptoms),
      emotion: Object.assign([], b.emotion, value.emotion),
    };
  }, [value]);

  const total = useMemo(() => calcRQLQTotal(base), [base]);

  /** 全局题号计数，按维度顺序累加（Q1..Q28，与类型字段顺序一致） */
  let questionCounter = 0;

  /** 更新某维度第 index 题的分值，不可变更新数组 */
  const handleQuestion = (dimKey: DimKey, index: number, score: number) => {
    if (!onChange) return;
    const currentArr = (base[dimKey] as number[]).slice();
    currentArr[index] = score;
    const nextBase = { ...base, [dimKey]: currentArr } as Omit<RQLQScores, 'total'>;
    onChange({ ...nextBase, total: calcRQLQTotal(nextBase) } as RQLQScores);
  };

  const dimensionSubtTotal = (dimKey: DimKey) =>
    sumNumbers((base[dimKey] as number[]) ?? []);

  return (
    <div>
      <Typography.Paragraph type="secondary" style={{ marginBottom: 8 }}>
        鼻炎生活质量调查问卷（RQLQ）。每题请按 0（无困扰）— 6（极严重困扰）打分，共 28 题，7 个维度。
      </Typography.Paragraph>
      <Collapse
        defaultActiveKey={['activityLimit']}
        accordion
        style={{ marginBottom: 16 }}
      >
        {RQLQ_QUESTIONS.map((dim) => {
          const dimKey = dim.key as DimKey;
          const subtotal = dimensionSubtTotal(dimKey);
          return (
            <Panel
              key={dim.key}
              header={
                <Space>
                  <span>{dim.label}</span>
                  <Tag color={subtotal > 0 ? 'blue' : 'default'}>{`小计 ${subtotal}`}</Tag>
                </Space>
              }
            >
              {dim.questions.map((q, qIndex) => {
                // 每处理一题，先自增再取当前全局题号
                const qNo = ++questionCounter;
                const opts = (base[dimKey] as number[]) ?? [];
                return (
                  <div
                    key={`${dim.key}-${qIndex}`}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '10px 0',
                      borderBottom: '1px dashed #f0f0f0',
                      flexWrap: 'wrap',
                      gap: 8,
                    }}
                  >
                    <Typography.Text style={{ flex: 1, minWidth: 220 }}>
                      Q{qNo}　{q}
                    </Typography.Text>
                    <Radio.Group
                      disabled={disabled}
                      value={opts[qIndex] ?? 0}
                      onChange={(e) =>
                        handleQuestion(dimKey, qIndex, e.target.value)
                      }
                      optionType="button"
                      buttonStyle="solid"
                      size="small"
                    >
                      {[0, 1, 2, 3, 4, 5, 6].map((n) => (
                        <Radio.Button key={n} value={n}>
                          {n}
                        </Radio.Button>
                      ))}
                    </Radio.Group>
                  </div>
                );
              })}
            </Panel>
          );
        })}
      </Collapse>
      <div
        style={{
          padding: '12px 16px',
          background: '#e6f4ff',
          borderRadius: 8,
          border: '1px solid #91caff',
        }}
      >
        <Typography.Text strong style={{ fontSize: 15 }}>
          RQLQ 总分：{total}
        </Typography.Text>
        <Typography.Text type="secondary" style={{ marginLeft: 8 }}>
          （27 题之和）
        </Typography.Text>
      </div>
    </div>
  );
};

export default RQLQForm;
