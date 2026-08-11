/**
 * 不良事件页 (plan.md §5.10)
 * 顶部「新增不良事件」按钮 + 表格；新增/编辑通过共享的 AdverseEventModal 完成。
 */
import { useState } from 'react';
import { Button, Table, Space, message, Popconfirm, Tag } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { usePatient } from '../../utils/usePatient';
import { usePatientStore } from '../../store/PatientContext';
import { AE_SEVERITY, AE_RELATION, AE_OUTCOME } from '../../mock/dictionaries';
import { aeId } from '../../mock/patients';
import AdverseEventModal from '../../components/AdverseEventModal';
import type { AdverseEvent } from '../../types/adverseEvent';

const labelOf = (arr: { value: number; label: string }[], v?: number) =>
  v == null ? '—' : arr.find((o) => o.value === v)?.label ?? String(v);

export default function AdverseEvents() {
  const { patient } = usePatient();
  const { dispatch } = usePatientStore();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<AdverseEvent | null>(null);

  if (!patient) return null;

  const openCreate = () => {
    setEditing(null);
    setModalOpen(true);
  };
  const openEdit = (e: AdverseEvent) => {
    setEditing(e);
    setModalOpen(true);
  };

  const save = (payload: AdverseEvent) => {
    if (editing) {
      const next: AdverseEvent = { ...payload, id: editing.id, seqNo: editing.seqNo };
      dispatch({ type: 'UPDATE_ADVERSE_EVENT', payload: { patientId: patient.id, eventId: editing.id, event: next } });
      message.success('已更新不良事件');
    } else {
      const next: AdverseEvent = {
        ...payload,
        id: aeId(),
        seqNo: patient.adverseEvents.length
          ? Math.max(...patient.adverseEvents.map((x) => x.seqNo)) + 1
          : 1,
      };
      dispatch({ type: 'ADD_ADVERSE_EVENT', payload: { patientId: patient.id, event: next } });
      message.success('已新增不良事件');
    }
    setModalOpen(false);
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

      <AdverseEventModal
        open={modalOpen}
        initial={editing}
        onSave={save}
        onCancel={() => setModalOpen(false)}
      />
    </div>
  );
}