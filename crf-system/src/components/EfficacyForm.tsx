/**
 * EfficacyForm — 疗效评估表单 (plan.md §6.9)
 *
 * 受控组件：对外暴露 { value?, onChange?, disabled?, baselineScore, currentScore }。
 * 可直接放在 AntD Form.Item 中（Form 自动注入 value/onChange）。
 *
 * 疗效指数 / 疗效评价为**派生值**（只读），由 baselineScore 与 currentScore 自动计算，
 * 在 onChange 时回写进 value，优先于用户手填，保证一致性。
 */
import { Card, Col, DatePicker, Divider, Form, Input, Radio, Row, Statistic, Tag } from 'antd';
import { InfoCircleOutlined } from '@ant-design/icons';
import { useEffect } from 'react';
import type { Dayjs } from 'dayjs';
import dayjs from 'dayjs';
import type { EfficacyAssessment } from '../types/visit';
import type { EfficacyFormProps } from './componentTypes';
import { calcEfficacyIndex, getEfficacyLevel } from '../utils/scoring';

/** 疗效评价等级 -> AntD Tag color 映射 */
const LEVEL_COLOR: Record<
  NonNullable<EfficacyAssessment['efficacyLevel']>,
  'success' | 'processing' | 'warning' | 'error'
> = {
  临床控制: 'success',
  显效: 'processing',
  有效: 'warning',
  无效: 'error',
};

/** value 为 undefined 时的零 shape */
const NULL_VALUE: EfficacyAssessment = {
  efficacyIndex: null,
  efficacyLevel: null,
  allSymptomsRelieved: false,
  worsened: false,
  newComplication: false,
};

type EditableKey =
  | 'allSymptomsRelieved'
  | 'reliefDate'
  | 'currentSymptoms'
  | 'worsened'
  | 'worsenedDetail'
  | 'newComplication'
  | 'newComplicationDetail';

export default function EfficacyForm({
  value,
  onChange,
  disabled,
  baselineScore,
  currentScore,
}: EfficacyFormProps) {
  // 实时派生：疗效指数与疗效评价（baseline 为 0/空时无法计算 -> null）
  const efficacyIndex = calcEfficacyIndex(baselineScore, currentScore);
  const efficacyLevel =
    efficacyIndex === null ? null : getEfficacyLevel(efficacyIndex);

  const current = { ...NULL_VALUE, ...value };

  // 派生值随 baseline/current 实时刷新并回写 Form，确保用户只改中医证候时存储的
  // efficacyIndex/efficacyLevel 也不落后于界面显示（否则提交后存的是 null）。
  // 仅当与当前值不同才 emit，避免依赖循环。
  useEffect(() => {
    if (
      onChange &&
      (current.efficacyIndex !== efficacyIndex || current.efficacyLevel !== efficacyLevel)
    ) {
      onChange?.({ ...current, efficacyIndex, efficacyLevel });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [baselineScore, currentScore]);

  /** 编辑可填字段时，把最新派生值一起回写，确保派生值优先于手填 */
  const emit = (patch: Partial<EfficacyAssessment>) => {
    onChange?.({
      ...current,
      ...patch,
      efficacyIndex,
      efficacyLevel,
    });
  };

  const update = <K extends EditableKey>(key: K, val: EfficacyAssessment[K]) =>
    emit({ [key]: val } as Partial<EfficacyAssessment>);

  /** 日期字符串 <-> Dayjs */
  const toDayjs = (s?: string): Dayjs | null => (s ? dayjs(s) : null);
  const fromDayjs = (d: Dayjs | null): string | undefined => (d ? d.format('YYYY-MM-DD') : undefined);

  // baseline 为空或 0 时无法计算疗效指数，提示需先完成 V1 中医证候积分
  const needsV1 = !baselineScore;

  return (
    <Card style={{ borderRadius: 8 }}>
      <Row gutter={[24, 16]}>
        {/* 疗效指数（自动计算，只读） */}
        <Col xs={12} md={6}>
          <Statistic
            title="疗效指数"
            value={efficacyIndex === null ? '-' : efficacyIndex}
            suffix={efficacyIndex === null ? '' : '%'}
            precision={efficacyIndex === null ? 0 : 1}
          />
        </Col>
        {/* 疗效评价（自动判定，只读高亮） */}
        <Col xs={12} md={6}>
          <div style={{ marginBottom: 8 }}>疗效评价</div>
          {efficacyLevel ? (
            <Tag color={LEVEL_COLOR[efficacyLevel]} style={{ fontSize: 14, padding: '2px 12px' }}>
              {efficacyLevel}
            </Tag>
          ) : (
            <Tag>—</Tag>
          )}
        </Col>
        {/* 说明 */}
        <Col xs={24} md={12}>
          {needsV1 ? (
            <div style={{ color: '#faad14', display: 'flex', gap: 6, alignItems: 'flex-start' }}>
              <InfoCircleOutlined />
              <span>治疗前积分为 0 或尚未录入，请先完成 V1 中医证候积分后再评估疗效。</span>
            </div>
          ) : (
            <div style={{ color: '#888', fontSize: 13, lineHeight: '22px' }}>
              计算公式：疗效指数 = (治疗前积分 − 治疗后积分) / 治疗前积分 × 100%；
              疗效指数 ≥90% 临床控制，70%–89% 显效，30%–69% 有效，&lt;30% 无效。
            </div>
          )}
        </Col>
      </Row>

      <Divider style={{ margin: '16px 0' }} />

      <Form
        layout="vertical"
        disabled={disabled}
        requiredMark
        style={{ maxWidth: 720 }}
      >
        {/* 症状是否全部缓解 */}
        <Form.Item
          label="本次治疗后所有症状是否均已缓解"
          required
          extra={current.allSymptomsRelieved ? '请填写症状缓解日期。' : undefined}
        >
          <Radio.Group
            value={current.allSymptomsRelieved}
            onChange={(e) => {
              const val = e.target.value as boolean;
              emit({ allSymptomsRelieved: val, reliefDate: undefined, currentSymptoms: undefined });
            }}
            options={[
              { label: '是', value: true },
              { label: '否', value: false },
            ]}
            optionType="button"
            buttonStyle="solid"
          />
        </Form.Item>

        {current.allSymptomsRelieved ? (
          <Form.Item label="症状缓解日期">
            <DatePicker
              value={toDayjs(current.reliefDate)}
              onChange={(d) => update('reliefDate', fromDayjs(d))}
              style={{ width: '100%' }}
              placeholder="请选择缓解日期"
              allowClear
            />
          </Form.Item>
        ) : (
          <Form.Item label="当前症状描述">
            <Input.TextArea
              value={current.currentSymptoms ?? ''}
              onChange={(e) => update('currentSymptoms', e.target.value)}
              rows={3}
              maxLength={500}
              showCount
              placeholder="请描述缓解不全或残留的症状"
            />
          </Form.Item>
        )}

        {/* 症状是否转重 */}
        <Form.Item label="症状较治疗前是否加重（转重）" required>
          <Radio.Group
            value={current.worsened}
            onChange={(e) => {
              const val = e.target.value as boolean;
              emit({ worsened: val, worsenedDetail: undefined });
            }}
            options={[
              { label: '是', value: true },
              { label: '否', value: false },
            ]}
            optionType="button"
            buttonStyle="solid"
          />
        </Form.Item>

        {current.worsened && (
          <Form.Item label="症状转重详情">
            <Input.TextArea
              value={current.worsenedDetail ?? ''}
              onChange={(e) => update('worsenedDetail', e.target.value)}
              rows={3}
              maxLength={500}
              showCount
              placeholder="请填写转重程度及具体表现"
            />
          </Form.Item>
        )}

        {/* 是否出现新并发症 */}
        <Form.Item label="是否出现新发并发症" required>
          <Radio.Group
            value={current.newComplication}
            onChange={(e) => {
              const val = e.target.value as boolean;
              emit({ newComplication: val, newComplicationDetail: undefined });
            }}
            options={[
              { label: '是', value: true },
              { label: '否', value: false },
            ]}
            optionType="button"
            buttonStyle="solid"
          />
        </Form.Item>

        {current.newComplication && (
          <Form.Item label="新发并发症详情">
            <Input.TextArea
              value={current.newComplicationDetail ?? ''}
              onChange={(e) => update('newComplicationDetail', e.target.value)}
              rows={3}
              maxLength={500}
              showCount
              placeholder="请填写新发并发症名称与表现"
            />
          </Form.Item>
        )}
      </Form>
    </Card>
  );
}
