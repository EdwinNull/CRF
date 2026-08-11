/**
 * 合并非药物治疗页 (plan.md §5.12) — 与合并用药页同构的 CRUD。
 */
import { useState } from 'react';
import {
  Button, Table, Modal, Form, Input, DatePicker, Switch, Space, message, Popconfirm, Tag,
} from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import dayjs, { type Dayjs } from 'dayjs';
import { usePatient } from '../../utils/usePatient';
import { usePatientStore } from '../../store/PatientContext';
import { medId } from '../../mock/patients';
import type { NonDrugTherapy } from '../../types/concomitantMed';

interface FormValues {
  therapyName: string;
  therapyType: string;
  methodFrequency: string;
  location: string;
  startDate: Dayjs;
  isOngoing: boolean;
  endDate?: Dayjs;
  drugRelation: string;
  remark?: string;
}

export default function NonDrugTherapy() {
  const { patient } = usePatient();
  const { dispatch } = usePatientStore();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<NonDrugTherapy | null>(null);
  const [form] = Form.useForm();

  if (!patient) return null;

  const openCreate = () => {
    setEditing(null);
    form.resetFields();
    setModalOpen(true);
  };
  const openEdit = (t: NonDrugTherapy) => {
    setEditing(t);
    form.setFieldsValue({
      therapyName: t.therapyName, therapyType: t.therapyType, methodFrequency: t.methodFrequency,
      location: t.location, startDate: t.startDate ? dayjs(t.startDate) : undefined,
      isOngoing: t.isOngoing, endDate: t.endDate ? dayjs(t.endDate) : undefined,
      drugRelation: t.drugRelation, remark: t.remark,
    });
    setModalOpen(true);
  };

  const save = () => {
    form.validateFields().then((v: FormValues) => {
      const payload: NonDrugTherapy = {
        id: editing?.id ?? medId(),
        seqNo: editing?.seqNo ?? (patient.nonDrugTherapies.length
          ? Math.max(...patient.nonDrugTherapies.map((x) => x.seqNo)) + 1
          : 1),
        therapyName: v.therapyName,
        therapyType: v.therapyType ?? '',
        methodFrequency: v.methodFrequency ?? '',
        location: v.location ?? '',
        startDate: v.startDate.format('YYYY-MM-DD'),
        isOngoing: v.isOngoing,
        endDate: v.isOngoing ? undefined : v.endDate?.format('YYYY-MM-DD'),
        drugRelation: v.drugRelation ?? '',
        remark: v.remark,
      };
      const action = editing
        ? { type: 'UPDATE_NON_DRUG', payload: { patientId: patient.id, therapyId: editing.id, therapy: payload } } as const
        : { type: 'ADD_NON_DRUG', payload: { patientId: patient.id, therapy: payload } } as const;
      dispatch(action);
      message.success(editing ? '已更新非药物治疗' : '已新增非药物治疗');
      setModalOpen(false);
    });
  };

  const del = (id: string) => {
    dispatch({ type: 'DELETE_NON_DRUG', payload: { patientId: patient.id, therapyId: id } });
    message.success('已删除');
  };

  const columns: ColumnsType<NonDrugTherapy> = [
    { title: '编号', dataIndex: 'seqNo', width: 60 },
    { title: '治疗名称', dataIndex: 'therapyName', width: 160 },
    { title: '类型', dataIndex: 'therapyType', width: 110, render: (v: string) => (v ? <Tag>{v}</Tag> : '—') },
    { title: '方法/频率', dataIndex: 'methodFrequency', width: 180 },
    { title: '部位', dataIndex: 'location', width: 120 },
    { title: '开始日期', dataIndex: 'startDate', width: 110 },
    { title: '结束日期', dataIndex: 'endDate', width: 110, render: (v?: string) => v || '持续中' },
    { title: '与研究药物关系', dataIndex: 'drugRelation', width: 130, render: (v: string) => v || '—' },
    {
      title: '操作', key: 'action', width: 130,
      render: (_, t) => (
        <Space>
          <Button type="link" size="small" onClick={() => openEdit(t)}>编辑</Button>
          <Popconfirm title="确认删除？" onConfirm={() => del(t.id)}>
            <Button type="link" size="small" danger>删除</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div style={{ marginBottom: 12 }}>
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>新增非药物治疗</Button>
      </div>
      <Table<NonDrugTherapy> rowKey="id" columns={columns} dataSource={patient.nonDrugTherapies} pagination={false} />

      <Modal title={editing ? '编辑非药物治疗' : '新增非药物治疗'} open={modalOpen} onOk={save} onCancel={() => setModalOpen(false)} width={560}>
        <Form form={form} layout="vertical" initialValues={{ isOngoing: false }}>
          <Space size="middle" wrap>
            <Form.Item name="therapyName" label="治疗名称" rules={[{ required: true, message: '请输入治疗名称' }]}>
              <Input style={{ width: 240 }} />
            </Form.Item>
            <Form.Item name="therapyType" label="类型"><Input style={{ width: 200 }} placeholder="如：按摩/针灸" /></Form.Item>
          </Space>
          <Form.Item name="methodFrequency" label="方法/频率"><Input placeholder="如：每周3次，每次30分钟" /></Form.Item>
          <Space size="middle" wrap>
            <Form.Item name="location" label="部位"><Input style={{ width: 200 }} /></Form.Item>
            <Form.Item name="startDate" label="开始日期" rules={[{ required: true, message: '请选择' }]}>
              <DatePicker />
            </Form.Item>
            <Form.Item name="isOngoing" label="是否持续" valuePropName="checked">
              <Switch checkedChildren="持续" unCheckedChildren="已结束" />
            </Form.Item>
          </Space>
          <Form.Item noStyle shouldUpdate>
            {({ getFieldValue }) =>
              getFieldValue('isOngoing') ? null : (
                <Form.Item name="endDate" label="结束日期"><DatePicker /></Form.Item>
              )
            }
          </Form.Item>
          <Space size="middle" wrap>
            <Form.Item name="drugRelation" label="与研究药物关系"><Input style={{ width: 240 }} /></Form.Item>
            <Form.Item name="remark" label="备注"><Input style={{ width: 200 }} /></Form.Item>
          </Space>
        </Form>
      </Modal>
    </div>
  );
}
