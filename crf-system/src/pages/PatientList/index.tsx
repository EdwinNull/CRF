/**
 * 患者列表页 (plan.md §5.2)
 * Layout + 顶部操作栏 + 状态 Tag + 访视进度 + 新建患者 Modal。
 */
import { useMemo, useState } from 'react';
import {
  Table, Tag, Button, Input, Select, Space, Modal, Form, Progress, message, Typography,
} from 'antd';
import { PlusOutlined, SearchOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import type { ColumnsType } from 'antd/es/table';
import { usePatientStore, useCurrentUser } from '../../store/PatientContext';
import { CENTER_NAME } from '../../mock/dictionaries';
import { uid, emptyVisit } from '../../mock/patients';
import { calcBMI } from '../../mock/seedHelpers';
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

  const filtered = useMemo(() => {
    return state.patients.filter((p) => {
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
    form.validateFields().then((vals) => {
      const centerId = (user?.centerId ?? '01') as CenterId;
      const weight = vals.weight as number;
      const height = vals.height as number;
      const nameAbbr = String(vals.nameAbbr ?? '').toUpperCase();
      const p: Patient = {
        id: uid(),
        centerId,
        screeningNo: `${centerId}${String(vals.screeningNoSeq).padStart(3, '0')}`,
        randomNo: '',
        nameAbbr,
        enrollmentDate: vals.enrollmentDate as string,
        status: 'screening',
        consentDate: '',
        demographics: {
          gender: vals.gender, age: vals.age, household: '', weight, height,
          bmi: calcBMI(weight, height), occupation: '',
          environmentExposure: [], smokingHistory: { has: false }, drinkingHistory: { has: false },
          dietHabit: [], livingEnvironment: [], climate: [],
        },
        allergyHistory: { has: false }, respiratoryHistory: { has: false },
        familyHistory: { has: false }, priorTreatment: { has: false },
        currentIllness: { diagnosisDate: '', attackCycle: '常年性', comorbidities: [], allergenTest: { done: false }, triggerFactors: { has: false } },
        tcmFourExam: {
          nasalMucosa: '淡白肿胀', nasalDischarge: '清稀如水', tongueBody: '淡红',
          tongueCoating: '薄白', throat: '咽壁淡红、不肿', sneeze: '高频短促',
          worseCondition: '遇冷', stool: '正常', urine: '清', pulse: '浮缓',
        },
        inclusionCriteria: [false, false, false, false, false, false],
        exclusionCriteria: [false, false, false, false, false, false, false, false, false, false, false],
        screeningResult: 'pass',
        dispensedCount: 0, investigatorSignature: '', signatureDate: '',
        visits: {
          V1: emptyVisit('V1', vals.enrollmentDate), V2: emptyVisit('V2'), V3: emptyVisit('V3'),
          V4: emptyVisit('V4'), V5: emptyVisit('V5'), V6: emptyVisit('V6'),
        },
        adverseEvents: [], concomitantMeds: [], nonDrugTherapies: [],
      };
      dispatch({ type: 'ADD_PATIENT', payload: p });
      message.success('创建成功，请完善 V1 筛查期信息');
      setModalOpen(false);
      form.resetFields();
      navigate(`/patient/${p.id}/v1`);
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
