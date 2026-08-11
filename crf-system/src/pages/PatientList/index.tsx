/**
 * 患者列表页 (plan.md §5.2)
 * Layout + 顶部操作栏 + 状态 Tag + 访视进度 + 新建患者 Modal。
 */
import { useEffect, useMemo, useState } from 'react';
import {
  Table, Tag, Button, Input, Select, Space, Modal, Form, Progress, message, Typography,
} from 'antd';
import { PlusOutlined, SearchOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import type { ColumnsType } from 'antd/es/table';
import { usePatientStore, useCurrentUser } from '../../store/PatientContext';
import { CENTER_NAME } from '../../mock/dictionaries';
import { apiListPatients, apiCreatePatient } from '../../api/client';
import { backendToPatient, mergeSeedIntoBackend } from '../../api/mappers';
import { apiErrorText } from '../../api/http';
import type { Patient, PatientStatus, CenterId } from '../../types/patient';
import type { VisitNo } from '../../types/visit';

const STATUS_META: Record<PatientStatus, { text: string; color: string }> = {
  screening: { text: '筛选中', color: 'blue' },
  treatment: { text: '治疗中', color: 'green' },
  followup: { text: '随访中', color: 'orange' },
  completed: { text: '已完成', color: 'default' },
  withdrawn: { text: '已退出', color: 'red' },
};

const VISIT_ORDER: VisitNo[] = ['V1', 'V2', 'V3', 'V4', 'V5', 'V6'];

/** 访视进度：已提交(submitted) 数量返回 0-6。草稿不计入"已完成"。 */
function visitProgress(p: Patient): number {
  let n = 0;
  for (const no of VISIT_ORDER) {
    const v = p.visits[no];
    if (v && v.status === 'submitted') n++;
  }
  return n;
}

export default function PatientList() {
  const { state, dispatch } = usePatientStore();
  const user = useCurrentUser();
  const navigate = useNavigate();
  const [keyword, setKeyword] = useState('');
  const [statusFilter, setStatusFilter] = useState<PatientStatus | 'all'>('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [form] = Form.useForm();

  // 挂载时从后端拉取患者列表，与本地 seed 富数据按筛选号合并（覆盖纯 mock）
  const [loading, setLoading] = useState(true);
  const loadFromBackend = async () => {
    try {
      setLoading(true);
      const list = await apiListPatients({ center_id: user?.role === 'admin' ? undefined : user?.centerId });
      // 后端患者档案 + 本地 seed 富数据合并：保留富表单特征，同时获得后端 id/中心隔离
      const merged = mergeSeedIntoBackend(state.patients, list);
      dispatch({ type: 'LOAD_PATIENTS', payload: merged });
    } catch (e) {
      message.error(apiErrorText(e));
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    loadFromBackend();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => {
    const source = state.patients;
    return source.filter((p) => {
      const kw = keyword.trim().toLowerCase();
      const matchKw =
        !kw || p.screeningNo.toLowerCase().includes(kw) || p.randomNo.includes(kw) || p.nameAbbr.toLowerCase().includes(kw);
      const matchStatus = statusFilter === 'all' || p.status === statusFilter;
      return matchKw && matchStatus;
    });
  }, [state.patients, keyword, statusFilter]);

  const columns: ColumnsType<Patient> = [
    {
      title: '筛选号', dataIndex: 'screeningNo', width: 100,
      render: (v: string) => <Typography.Text strong>{v}</Typography.Text>,
    },
    { title: '随机编号', dataIndex: 'randomNo', width: 100, render: (v: string) => v || '—' },
    { title: '姓名缩写', dataIndex: 'nameAbbr', width: 100 },
    { title: '研究中心', dataIndex: 'centerId', width: 240, render: (v: CenterId) => CENTER_NAME[v] ?? v },
    { title: '入组日期', dataIndex: 'enrollmentDate', width: 120 },
    {
      title: '当前状态', dataIndex: 'status', width: 110,
      render: (s: PatientStatus) => <Tag color={STATUS_META[s].color}>{STATUS_META[s].text}</Tag>,
    },
    {
      title: '访视进度', key: 'progress', width: 160,
      render: (_, p) => (
        <Progress
          percent={(visitProgress(p) / 6) * 100}
          format={() => `V${visitProgress(p)}/V6`}
          size="small"
        />
      ),
    },
    {
      title: '操作', key: 'action', width: 90,
      render: (_, p) => (
        <Button type="link" onClick={() => navigate(`/patient/${p.id}`)}>
          进入
        </Button>
      ),
    },
  ];

  const onCreate = () => {
    form.validateFields().then(async (vals) => {
      const centerId = (user?.centerId ?? '01') as CenterId;
      const weight = vals.weight as number;
      const height = vals.height as number;
      const nameAbbr = String(vals.nameAbbr ?? '').toUpperCase();
      try {
        // 1) 调后端建档（center 由后端根据当前用户自动设置，screening_no 需完整5位）
        const bp = await apiCreatePatient({
          screening_no: `${centerId}${String(vals.screeningNoSeq).padStart(3, '0')}`,
          name_abbr: nameAbbr,
          gender: vals.gender,
          age: vals.age,
          height,
          weight,
          enrollment_date: vals.enrollmentDate as string,
        });
        // 2) 后端已创建 + 自动生成 V1 空访视；转成前端富结构并入 store
        const p: Patient = backendToPatient(bp);
        // 沿用前端填的表单信息，覆盖 demographics（避免后端返回空年龄/身高体重时丢值）
        const frontId = p.id;
        p.demographics.age = vals.age;
        p.demographics.height = height;
        p.demographics.weight = weight;
        dispatch({ type: 'ADD_PATIENT', payload: p });
        message.success('创建成功，请完善 V1 筛查期信息');
        setModalOpen(false);
        form.resetFields();
        navigate(`/patient/${frontId}/v1`);
      } catch (e) {
        message.error(apiErrorText(e));
      }
    });
  };

  return (
    <div style={{ background: '#fff', borderRadius: 8, padding: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16, gap: 12, flexWrap: 'wrap' }}>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setModalOpen(true)}>
          新建患者
        </Button>
        <Space wrap>
          <Input
            allowClear
            prefix={<SearchOutlined />}
            placeholder="搜索 筛选号/随机编号/缩写"
            style={{ width: 240 }}
            onChange={(e) => setKeyword(e.target.value)}
          />
          <Select
            value={statusFilter}
            style={{ width: 150 }}
            onChange={(v) => setStatusFilter(v)}
            options={[
              { value: 'all', label: '全部状态' },
              ...(Object.keys(STATUS_META) as PatientStatus[]).map((s) => ({
                value: s,
                label: STATUS_META[s].text,
              })),
            ]}
          />
        </Space>
      </div>

      <Table<Patient>
        rowKey="id"
        columns={columns}
        dataSource={filtered}
        loading={loading}
        pagination={{ pageSize: 10, showTotal: (t) => `共 ${t} 例` }}
      />

      <Modal
        title="新建患者"
        open={modalOpen}
        onOk={onCreate}
        onCancel={() => setModalOpen(false)}
        destroyOnClose
      >
        <Form form={form} layout="vertical" initialValues={{ gender: '男', nameAbbr: [] }}>
          <Form.Item label="研究中心编号">
            <Input value={`${user?.centerId ?? '01'}`} disabled />
          </Form.Item>
          <Form.Item
            name="screeningNoSeq"
            label="筛选号（后3位）"
            rules={[{ required: true, message: '请输入后3位' }]}
          >
            <Input
              style={{ width: 120 }}
              maxLength={3}
              addonBefore={`${user?.centerId ?? '01'}`}
              placeholder="001"
              onChange={(e) => {
                const d = e.target.value.replace(/\D/g, '');
                if (d !== e.target.value) form.setFieldValue('screeningNoSeq', d);
              }}
            />
          </Form.Item>
          <Form.Item
            name="nameAbbr"
            label="姓名拼音缩写（4位大写）"
            rules={[{ required: true, message: '请输入4位缩写' }]}
          >
            <Input
              maxLength={4}
              style={{ width: 200, textTransform: 'uppercase' }}
              placeholder="ZHLS"
              onChange={(e) => {
                const u = e.target.value.toUpperCase();
                if (u !== e.target.value) form.setFieldValue('nameAbbr', u);
              }}
            />
          </Form.Item>
          <Space size="middle" wrap>
            <Form.Item name="gender" label="性别" rules={[{ required: true, message: '请选择' }]}>
              <Select style={{ width: 100 }} options={[{ value: '男', label: '男' }, { value: '女', label: '女' }]} />
            </Form.Item>
            <Form.Item name="age" label="年龄" rules={[{ required: true, message: '请输入' }]}>
              <Input type="number" style={{ width: 100 }} />
            </Form.Item>
            <Form.Item name="height" label="身高(cm)" rules={[{ required: true, message: '请输入' }]}>
              <Input type="number" style={{ width: 110 }} />
            </Form.Item>
            <Form.Item name="weight" label="体重(kg)" rules={[{ required: true, message: '请输入' }]}>
              <Input type="number" style={{ width: 110 }} />
            </Form.Item>
          </Space>
          <Form.Item
            name="enrollmentDate"
            label="入组日期"
            rules={[{ required: true, message: '请选择入组日期' }]}
          >
            <Input type="date" style={{ width: 200 }} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
