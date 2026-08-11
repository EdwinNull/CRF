/**
 * FormSection — 表单分区容器 (plan.md §6.1)
 * 基于 AntD Collapse 的折叠面板，带标题、可选必填星号与右侧状态指示。
 */
import { Collapse, Tag } from 'antd';
import type { ReactNode } from 'react';
import {
  CheckCircleFilled,
  EditFilled,
  RightOutlined,
  CloseCircleFilled,
} from '@ant-design/icons';

export type SectionStatus = 'complete' | 'partial' | 'empty';

export interface FormSectionProps {
  title: string;
  icon?: ReactNode;
  required?: boolean;
  status?: SectionStatus;
  children: ReactNode;
  defaultActive?: boolean;
}

const STATUS_MAP: Record<SectionStatus, ReactNode> = {
  complete: (
    <Tag color="success" icon={<CheckCircleFilled />}>
      已完成
    </Tag>
  ),
  partial: (
    <Tag color="processing" icon={<EditFilled />}>
      填写中
    </Tag>
  ),
  empty: (
    <Tag icon={<RightOutlined />} color="default">
      未填写
    </Tag>
  ),
};

export default function FormSection({
  title,
  icon,
  required,
  status,
  children,
  defaultActive,
}: FormSectionProps) {
  const label = (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
      {icon}
      {required && <span className="crf-required-star">*</span>}
      <span>{title}</span>
      {status && <span style={{ marginLeft: 8 }}>{STATUS_MAP[status]}</span>}
    </span>
  );

  return (
    <Collapse
      ghost
      defaultActiveKey={defaultActive ? ['1'] : undefined}
      style={{ background: '#fff', borderRadius: 8, marginBottom: 8 }}
      items={[{ key: '1', label, children: <div style={{ padding: '8px 4px 16px' }}>{children}</div> }]}
    />
  );
}

/** 表示“未填报”的占位 Tag，用于尚未配置字段的分区右上角（沿用 status=empty 语义） */
export function EmptyNotice() {
  return (
    <div
      style={{
        padding: 24,
        textAlign: 'center',
        color: '#888',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 8,
      }}
    >
      <CloseCircleFilled style={{ fontSize: 28, color: '#d9d9d9' }} />
      <span>本模块暂无待填字段</span>
    </div>
  );
}
