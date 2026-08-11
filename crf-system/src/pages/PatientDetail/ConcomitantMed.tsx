/**
 * 合并用药页 (plan.md §5.11) — CRUD via Modal
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
import type { ConcomitantMed } from '../../types/concomitantMed';

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

export default function ConcomitantMed() {
  const { patient } = usePatient();
  const { dispatch } = usePatientStore();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<ConcomitantMed | null>(null);
  const [form] = Form.useForm();

  if (!patient) return null;

  const openCreate = () => {
    setEditing(null);
    form.resetFields();
    setModalOpen(true);
  };
  const openEdit = (m: ConcomitantMed) => {
    setEditing(m);
    form.setFieldsValue({
      drugName: m.drugName, indication: m.indication, dosageForm: m.dosageForm,
      dosageAmount: m.dosageAmount, startDate: m.startDate ? dayjs(m.startDate) : undefined,
      isOngoing: m.isOngoing, endDate: m.endDate ? dayjs(m.endDate) : undefined,
      drugRelation: m.drugRelation, remark: m.remark,
    });
    setModalOpen(true);
  };

  const save = () => {
    form.validateFields().then((v: FormValues) => {
      const payload: ConcomitantMed = {
        id: editing?.id ?? medId(),
        seqNo: editing?.seqNo ?? (patient.concomitantMeds.length
          ? Math.max(...patient.concomitantMeds.map((x) => x.seqNo)) + 1
          : 1),
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
      const action = editing
        ? { type: 'UPDATE_CONCOMITANT_MED', payload: { patientId: patient.id, medId: editing.id, med: payload } } as const
        : { type: 'ADD_CONCOMITANT_MED', payload: { patientId: patient.id, med: payload } } as const;
      dispatch(action);
      message.success(editing ? '已更新合并用药' : '已新增合并用药');
      setModalOpen(false);
    });
  };

  const del = (id: string) => {
    dispatch({ type: 'DELETE_CONCOMITANT_MED', payload: { patientId: patient.id, medId: id } });
    message.success('已删除');
  };

  const columns: ColumnsType<ConcomitantMed> = [
    { title: '编号', dataIndex: 'seqNo', width: 60 },
    { title: '药物名称', dataIndex: 'drugName', width: 160 },
    { title: '适应症', dataIndex: 'indication', width: 140 },
    { title: '剂型', dataIndex: 'dosageForm', width: 100 },
    { title: '剂量', dataIndex: 'dosageAmount', width: 150 },
    { title: '开始日期', dataIndex: 'startDate', width: 110 },
    { title: '结束日期', dataIndex: 'endDate', width: 110, render: (v?: string) => v || '持续中' },
    {
      title: '与研究药物关系', dataIndex: 'drugRelation', width: 130,
      render: (v: string) => (v ? <Tag>{v}</Tag> : '—'),
    },
    {
      title: '操作', key: 'action', width: 130,
      render: (_, m) => (
        <Space>
          <Button type="link" size="small" onClick={() => openEdit(m)}>编辑</Button>
          <Popconfirm title="确认删除？" onConfirm={() => del(m.id)}>
            <Button type="link" size="small" danger>删除</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div style={{ marginBottom: 12 }}>
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>新增合并用药</Button>
      </div>
      <Table<ConcomitantMed> rowKey="id" columns={columns} dataSource={patient.concomitantMeds} pagination={false} />

      <Modal title={editing ? '编辑合并用药' : '新增合并用药'} open={modalOpen} onOk={save} onCancel={() => setModalOpen(false)} width={560}>
        <Form form={form} layout="vertical" initialValues={{ isOngoing: false }}>
          <Form.Item name="drugName" label="药物名称" rules={[{ required: true, message: '请输入药物名称' }]}>
            <Input />
          </Form.Item>
          <Space size="middle" wrap>
            <Form.Item name="indication" label="适应症"><Input style={{ width: 220 }} /></Form.Item>
            <Form.Item name="dosageForm" label="剂型"><Input style={{ width: 120 }} placeholder="如：片剂" /></Form.Item>
          </Space>
          <Form.Item name="dosageAmount" label="剂量"><Input placeholder="如：10mg 每日1次" /></Form.Item>
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
                  <Form.Item name="endDate" label="结束日期"><DatePicker /></Form.Item>
                )
              }
            </Form.Item>
          </Space>
          <Space size="middle" wrap>
            <Form.Item name="drugRelation" label="与研究药物关系"><Input style={{ width: 240 }} placeholder="如：合并用药/无关" /></Form.Item>
            <Form.Item name="remark" label="备注"><Input style={{ width: 200 }} /></Form.Item>
          </Space>
        </Form>
      </Modal>
    </div>
  );
}
