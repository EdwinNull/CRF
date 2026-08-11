/**
 * AdverseEventModal — 不良事件新增/编辑共享弹窗 (plan.md §5.10)
 *
 * 由 AdverseEvents 页和 V2/V3/V4 的 hasAdverseEvent="是" 触发共用。
 * - 受控：父组件传入 `open` 与 `initial` (待编辑的 AdverseEvent 或 null)
 * - 表单校验通过后调用 `onSave(payload)`；Modal 关闭由父组件负责。
 *
 * 注意：本组件内部管理 Form 实例，但每次 open 从 false→true 且 initial 变化时
 * 会重新 setFieldsValue 触发受控同步，确保「挂载即回填」。
 */
import { useEffect } from 'react';
import {
  Modal, Form, Input, Select, DatePicker, Switch, Space,
} from 'antd';
import dayjs, { type Dayjs } from 'dayjs';
import type { AdverseEvent } from '../types/adverseEvent';
import {
  AE_SEVERITY, AE_RELATION, AE_OUTCOME, AE_DRUG_MEASURE, AE_OTHER_MEASURE, SAE_TYPE,
} from '../mock/dictionaries';

export interface AdverseEventModalProps {
  open: boolean;
  initial: AdverseEvent | null; // null 表示新增，否则编辑
  onSave: (payload: AdverseEvent) => void;
  onCancel: () => void;
}

interface FormValues {
  eventName: string;
  description: string;
  startDate: Dayjs;
  isOngoing: boolean;
  endDate?: Dayjs;
  severity: 1 | 2 | 3;
  drugMeasure: 1 | 2 | 3 | 4 | 5;
  otherMeasure: 1 | 2 | 3 | 4;
  otherMeasureDetail?: string;
  drugRelation: 1 | 2 | 3 | 4 | 5;
  outcome: 1 | 2 | 3 | 4 | 5 | 6;
  isSAE: boolean;
  saeType?: 1 | 2 | 3 | 4 | 5 | 6 | 7;
}

export default function AdverseEventModal({ open, initial, onSave, onCancel }: AdverseEventModalProps) {
  const [form] = Form.useForm<FormValues>();
  const isSAE = Form.useWatch('isSAE', form);

  // 每次打开按 initial 重置回填
  useEffect(() => {
    if (!open) return;
    if (initial) {
      form.setFieldsValue({
        eventName: initial.eventName,
        description: initial.description,
        startDate: initial.startDate ? dayjs(initial.startDate) : undefined,
        isOngoing: initial.isOngoing,
        endDate: initial.endDate ? dayjs(initial.endDate) : undefined,
        severity: initial.severity,
        drugMeasure: initial.drugMeasure,
        otherMeasure: initial.otherMeasure,
        otherMeasureDetail: initial.otherMeasureDetail,
        drugRelation: initial.drugRelation,
        outcome: initial.outcome,
        isSAE: initial.isSAE,
        saeType: initial.saeType,
      });
    } else {
      form.resetFields();
      form.setFieldsValue({ isOngoing: false, isSAE: false });
    }
  }, [open, initial, form]);

  const handleOk = () => {
    form.validateFields().then((v: FormValues) => {
      const payload: AdverseEvent = {
        id: initial?.id ?? '',
        seqNo: initial?.seqNo ?? 0,
        eventName: v.eventName,
        description: v.description ?? '',
        startDate: v.startDate.format('YYYY-MM-DD'),
        isOngoing: v.isOngoing,
        endDate: v.isOngoing ? undefined : v.endDate?.format('YYYY-MM-DD'),
        severity: v.severity,
        drugMeasure: v.drugMeasure,
        otherMeasure: v.otherMeasure,
        otherMeasureDetail: v.otherMeasure === 3 || v.otherMeasure === 4 ? v.otherMeasureDetail : undefined,
        drugRelation: v.drugRelation,
        outcome: v.outcome,
        isSAE: v.isSAE,
        saeType: v.isSAE ? v.saeType : undefined,
      };
      onSave(payload);
    });
  };

  return (
    <Modal
      title={initial ? '编辑不良事件' : '新增不良事件'}
      open={open}
      onOk={handleOk}
      onCancel={onCancel}
      width={640}
      destroyOnClose
    >
      <Form form={form} layout="vertical" initialValues={{ isOngoing: false, isSAE: false }}>
        <Form.Item name="eventName" label="事件名称" rules={[{ required: true, message: '请输入事件名称' }]}>
          <Input />
        </Form.Item>
        <Form.Item name="description" label="事件描述">
          <Input.TextArea rows={2} placeholder="事件的具体描述" />
        </Form.Item>
        <Space size="middle" wrap>
          <Form.Item name="startDate" label="开始日期" rules={[{ required: true, message: '请选择' }]}>
            <DatePicker />
          </Form.Item>
          <Form.Item name="isOngoing" label="是否持续" valuePropName="checked">
            <Switch checkedChildren="持续" unCheckedChildren="已结束" />
          </Form.Item>
          <Form.Item noStyle shouldUpdate>
            {({ getFieldValue }) =>
              getFieldValue('isOngoing') ? null : (
                <Form.Item name="endDate" label="结束日期">
                  <DatePicker />
                </Form.Item>
              )
            }
          </Form.Item>
        </Space>
        <Space size="middle" wrap>
          <Form.Item name="severity" label="严重程度" rules={[{ required: true, message: '请选择' }]}>
            <Select style={{ width: 160 }} options={AE_SEVERITY} />
          </Form.Item>
          <Form.Item name="drugRelation" label="与研究药物关系" rules={[{ required: true, message: '请选择' }]}>
            <Select style={{ width: 180 }} options={AE_RELATION} />
          </Form.Item>
        </Space>
        <Space size="middle" wrap>
          <Form.Item name="drugMeasure" label="研究药物采取的措施" rules={[{ required: true, message: '请选择' }]}>
            <Select style={{ width: 180 }} options={AE_DRUG_MEASURE} />
          </Form.Item>
          <Form.Item name="otherMeasure" label="其他处理措施" rules={[{ required: true, message: '请选择' }]}>
            <Select style={{ width: 180 }} options={AE_OTHER_MEASURE} />
          </Form.Item>
        </Space>
        <Form.Item noStyle shouldUpdate>
          {({ getFieldValue }) =>
            getFieldValue('otherMeasure') === 3 || getFieldValue('otherMeasure') === 4 ? (
              <Form.Item name="otherMeasureDetail" label="其他处理措施详情">
                <Input placeholder="请填写详情" />
              </Form.Item>
            ) : null
          }
        </Form.Item>
        <Space size="middle" wrap>
          <Form.Item name="outcome" label="转归" rules={[{ required: true, message: '请选择' }]}>
            <Select style={{ width: 160 }} options={AE_OUTCOME} />
          </Form.Item>
          <Form.Item name="isSAE" label="是否SAE" valuePropName="checked">
            <Switch checkedChildren="是" unCheckedChildren="否" onChange={(c: boolean) => { if (!c) form.setFieldValue('saeType', undefined); }} />
          </Form.Item>
        </Space>
        {isSAE && (
          <Form.Item name="saeType" label="SAE类型" rules={[{ required: true, message: 'SAE类型必填' }]}>
            <Select options={SAE_TYPE} placeholder="SAE 类型" />
          </Form.Item>
        )}
      </Form>
    </Modal>
  );
}