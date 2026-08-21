/**
 * ConcomitantMedModal — 合并用药新增/编辑共享弹窗
 *
 * 由 V2/V3/V4 的 hasNewConcomitantMed="是" 触发共用。
 * - 受控：父组件传入 `open` 与 `initial` (待编辑的 ConcomitantMed 或 null)
 * - 表单校验通过后调用 `onSave(payload)`；Modal 关闭由父组件负责。
 */
import { useEffect } from 'react';
import { Modal, Form, Input, DatePicker, Switch, Space } from 'antd';
import dayjs, { type Dayjs } from 'dayjs';
import type { ConcomitantMed } from '../types/concomitantMed';

export interface ConcomitantMedModalProps {
  open: boolean;
  initial: ConcomitantMed | null; // null 表示新增，否则编辑
  onSave: (payload: ConcomitantMed) => void;
  onCancel: () => void;
}

interface FormValues {
  drugName: string;
  indication: string;
  dosageForm: string;
  dosageAmount: string;
  startDate: Dayjs;
  isOngoing: boolean;
  endDate?: Dayjs;
  drugRelation: string;
  remark?: string;
}

export default function ConcomitantMedModal({ open, initial, onSave, onCancel }: ConcomitantMedModalProps) {
  const [form] = Form.useForm<FormValues>();

  // 每次打开按 initial 重置回填
  useEffect(() => {
    if (!open) return;
    if (initial) {
      form.setFieldsValue({
        drugName: initial.drugName,
        indication: initial.indication,
        dosageForm: initial.dosageForm,
        dosageAmount: initial.dosageAmount,
        startDate: initial.startDate ? dayjs(initial.startDate) : undefined,
        isOngoing: initial.isOngoing,
        endDate: initial.endDate ? dayjs(initial.endDate) : undefined,
        drugRelation: initial.drugRelation,
        remark: initial.remark,
      });
    } else {
      form.resetFields();
      form.setFieldsValue({ isOngoing: false });
    }
  }, [open, initial, form]);

  const handleOk = () => {
    form.validateFields().then((v: FormValues) => {
      const payload: ConcomitantMed = {
        id: initial?.id ?? '',
        seqNo: initial?.seqNo ?? 0,
        drugName: v.drugName,
        indication: v.indication ?? '',
        dosageForm: v.dosageForm ?? '',
        dosageAmount: v.dosageAmount ?? '',
        startDate: v.startDate.format('YYYY-MM-DD'),
        isOngoing: v.isOngoing,
        endDate: v.isOngoing ? undefined : v.endDate?.format('YYYY-MM-DD'),
        drugRelation: v.drugRelation ?? '',
        remark: v.remark,
      };
      onSave(payload);
    });
  };

  return (
    <Modal
      title={initial ? '编辑合并用药' : '新增合并用药'}
      open={open}
      onOk={handleOk}
      onCancel={onCancel}
      width={560}
      destroyOnClose
    >
      <Form form={form} layout="vertical" initialValues={{ isOngoing: false }}>
        <Form.Item name="drugName" label="药物名称" rules={[{ required: true, message: '请输入药物名称' }]}>
          <Input />
        </Form.Item>
        <Space size="middle" wrap>
          <Form.Item name="indication" label="适应症/用药原因"><Input style={{ width: 220 }} /></Form.Item>
          <Form.Item name="dosageForm" label="剂型"><Input style={{ width: 120 }} placeholder="如：片剂" /></Form.Item>
        </Space>
        <Form.Item name="dosageAmount" label="用法用量" rules={[{ required: true, message: '请输入用法用量' }]}>
          <Input placeholder="如：10mg 每日1次" />
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
          <Form.Item name="drugRelation" label="与研究药物关系">
            <Input style={{ width: 240 }} placeholder="如：合并用药/无关" />
          </Form.Item>
          <Form.Item name="remark" label="备注"><Input style={{ width: 200 }} /></Form.Item>
        </Space>
      </Form>
    </Modal>
  );
}
