/**
 * 不良事件页 (plan.md §5.10)
 * 顶部「新增不良事件」按钮 + 表格；新增/编辑用 Modal 表单。
 */
import { useState } from 'react';
import {
  Button, Table, Modal, Form, Input, Select, DatePicker, Switch, Space, message, Tag, Popconfirm,
} from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import dayjs, { type Dayjs } from 'dayjs';
import { usePatient } from '../../utils/usePatient';
import { usePatientStore } from '../../store/PatientContext';
import { AE_SEVERITY, AE_RELATION, AE_OUTCOME, AE_DRUG_MEASURE, AE_OTHER_MEASURE, SAE_TYPE } from '../../mock/dictionaries';
import { aeId } from '../../mock/patients';
import type { AdverseEvent } from '../../types/adverseEvent';

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

const labelOf = (arr: { value: number; label: string }[], v?: number) =>
  v == null ? '—' : arr.find((o) => o.value === v)?.label ?? String(v);

export default function AdverseEvents() {
  const { patient } = usePatient();
  const { dispatch } = usePatientStore();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<AdverseEvent | null>(null);
  const [form] = Form.useForm();
  const [isSAE, setIsSAE] = useState(false);

  if (!patient) return null;

  const openCreate = () => {
    setEditing(null);
    setIsSAE(false);
    form.resetFields();
    setModalOpen(true);
  };

  const openEdit = (e: AdverseEvent) => {
    setEditing(e);
    setIsSAE(e.isSAE);
    form.setFieldsValue({
      eventName: e.eventName, description: e.description,
      startDate: e.startDate ? dayjs(e.startDate) : undefined,
      isOngoing: e.isOngoing, endDate: e.endDate ? dayjs(e.endDate) : undefined,
      severity: e.severity, drugMeasure: e.drugMeasure, otherMeasure: e.otherMeasure,
      otherMeasureDetail: e.otherMeasureDetail, drugRelation: e.drugRelation,
      outcome: e.outcome, isSAE: e.isSAE, saeType: e.saeType,
    });
    setModalOpen(true);
  };

  const save = () => {
    form.validateFields().then((v: FormValues) => {
      const payload: AdverseEvent = {
        id: editing?.id ?? aeId(),
        seqNo: editing?.seqNo ?? (patient.adverseEvents.length
          ? Math.max(...patient.adverseEvents.map((x) => x.seqNo)) + 1
          : 1),
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
      if (editing) {
        dispatch({ type: 'UPDATE_ADVERSE_EVENT', payload: { patientId: patient.id, eventId: editing.id, event: payload } });
        message.success('已更新不良事件');
      } else {
        dispatch({ type: 'ADD_ADVERSE_EVENT', payload: { patientId: patient.id, event: payload } });
        message.success('已新增不良事件');
      }
      setModalOpen(false);
    });
  };

  const del = (id: string) => {
    dispatch({ type: 'DELETE_ADVERSE_EVENT', payload: { patientId: patient.id, eventId: id } });
    message.success('已删除');
  };

  const columns: ColumnsType<AdverseEvent> = [
    { title: '编号', dataIndex: 'seqNo', width: 60 },
    { title: '事件名称', dataIndex: 'eventName', width: 160 },
    { title: '开始日期', dataIndex: 'startDate', width: 110 },
    { title: '结束日期', dataIndex: 'endDate', width: 110, render: (v?: string) => v || '持续中' },
    { title: '严重程度', dataIndex: 'severity', width: 100, render: (v: 1 | 2 | 3) => labelOf(AE_SEVERITY, v) },
    { title: '与研究药物关系', dataIndex: 'drugRelation', width: 130, render: (v: 1 | 2 | 3 | 4 | 5) => labelOf(AE_RELATION, v) },
    { title: '转归', dataIndex: 'outcome', width: 110, render: (v: 1 | 2 | 3 | 4 | 5 | 6) => labelOf(AE_OUTCOME, v) },
    {
      title: '是否SAE', dataIndex: 'isSAE', width: 90,
      render: (v: boolean) => (v ? <Tag color="red">SAE</Tag> : <Tag>否</Tag>),
    },
    {
      title: '操作', key: 'action', width: 130,
      render: (_, e) => (
        <Space>
          <Button type="link" size="small" onClick={() => openEdit(e)}>编辑</Button>
          <Popconfirm title="确认删除该不良事件？" onConfirm={() => del(e.id)}>
            <Button type="link" size="small" danger>删除</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div style={{ marginBottom: 12 }}>
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
          新增不良事件
        </Button>
      </div>
      <Table<AdverseEvent> rowKey="id" columns={columns} dataSource={patient.adverseEvents} pagination={false} />

      <Modal
        title={editing ? '编辑不良事件' : '新增不良事件'}
        open={modalOpen}
        onOk={save}
        onCancel={() => setModalOpen(false)}
        width={640}
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
              <Switch checkedChildren="是" unCheckedChildren="否" onChange={(c: boolean) => { setIsSAE(c); if (!c) form.setFieldValue('saeType', undefined); }} />
            </Form.Item>
          </Space>
          {isSAE && (
            <Form.Item name="saeType" label="SAE类型" rules={[{ required: true, message: 'SAE类型必填' }]}>
              <Select options={SAE_TYPE} placeholder="SAE 类型" />
            </Form.Item>
          )}
        </Form>
      </Modal>
    </div>
  );
}
