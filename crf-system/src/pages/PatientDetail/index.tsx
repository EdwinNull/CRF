/**
 * 患者详情容器 (plan.md §5.3)
 * 顶部面包屑 + 患者信息卡；主体左侧垂直 Tab（导航）+ 右侧嵌套路由内容(<Outlet/>)。
 */
import { Breadcrumb, Tabs, Typography, Tag, Space, Empty } from 'antd';
import { useNavigate, useLocation, useParams, Outlet } from 'react-router-dom';
import { CheckCircleFilled, EditFilled, RightCircleOutlined } from '@ant-design/icons';
import { usePatientStore } from '../../store/PatientContext';
import { CENTER_NAME } from '../../mock/dictionaries';
import type { Patient, PatientStatus } from '../../types/patient';
import type { VisitNo } from '../../types/visit';

const STATUS_META: Record<PatientStatus, { text: string; color: string }> = {
  screening: { text: '筛选中', color: 'blue' },
  treatment: { text: '治疗中', color: 'green' },
  followup: { text: '随访中', color: 'orange' },
  completed: { text: '已完成', color: 'default' },
  withdrawn: { text: '已退出', color: 'red' },
};

const VISIT_TABS: { key: string; label: string; sub: VisitNo }[] = [
  { key: 'v1', label: 'V1 筛查期', sub: 'V1' },
  { key: 'v2', label: 'V2 D7', sub: 'V2' },
  { key: 'v3', label: 'V3 D14', sub: 'V3' },
  { key: 'v4', label: 'V4 D28', sub: 'V4' },
  { key: 'v5', label: 'V5 M2', sub: 'V5' },
  { key: 'v6', label: 'V6 M3', sub: 'V6' },
];

const OTHER_TABS = [
  { key: 'adverse-events', label: '不良事件' },
  { key: 'concomitant-med', label: '合并用药' },
  { key: 'non-drug-therapy', label: '非药物治疗' },
  { key: 'completion', label: '完成情况总结' },
];

function VisitIcon({ p, sub }: { p: Patient; sub: VisitNo }) {
  const v = p.visits[sub];
  if (!v || v.status === 'not_started') return <RightCircleOutlined style={{ color: '#bbb' }} />;
  if (v.status === 'submitted') return <CheckCircleFilled style={{ color: '#52c41a' }} />;
  return <EditFilled style={{ color: '#1677ff' }} />;
}

export default function PatientDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { state } = usePatientStore();
  const patient = id ? state.patients.find((p) => p.id === id) : undefined;

  if (!patient) {
    return (
      <div style={{ background: '#fff', borderRadius: 8, padding: 40, textAlign: 'center' }}>
        <Empty description="未找到该患者" />
      </div>
    );
  }

  const seg = location.pathname.split('/').filter(Boolean);
  const activeKey = seg[seg.length - 1] ?? 'v1';
  const aeCount = patient.adverseEvents.length;

  const items = [
    ...VISIT_TABS.map((t) => ({
      key: t.key,
      label: (
        <Space size={6}>
          <VisitIcon p={patient} sub={t.sub} />
          <span>{t.label}</span>
        </Space>
      ),
    })),
    ...OTHER_TABS.map((t) => ({
      key: t.key,
      label: t.key === 'adverse-events' && aeCount > 0 ? `${t.label} (${aeCount})` : t.label,
    })),
  ];

  return (
    <div>
      <Breadcrumb
        style={{ marginBottom: 12 }}
        items={[
          { title: <a onClick={() => navigate('/')}>患者列表</a> },
          { title: `${patient.screeningNo} ${patient.nameAbbr}` },
        ]}
      />

      <div
        style={{
          background: '#fff', borderRadius: 8, padding: '12px 20px', marginBottom: 12,
          display: 'flex', flexWrap: 'wrap', gap: 24, alignItems: 'center',
        }}
      >
        <Typography.Text strong style={{ fontSize: 15 }}>
          {patient.screeningNo}　{patient.nameAbbr}
        </Typography.Text>
        <Space size={16} wrap>
          <span>随机编号：{patient.randomNo || '—'}</span>
          <span>入组日期：{patient.enrollmentDate || '—'}</span>
          <span>研究中心：{CENTER_NAME[patient.centerId] ?? patient.centerId}</span>
          <Tag color={STATUS_META[patient.status].color}>{STATUS_META[patient.status].text}</Tag>
        </Space>
      </div>

      <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
        <Tabs
          tabPosition="left"
          activeKey={activeKey}
          onChange={(k) => navigate(`/patient/${patient.id}/${k}`)}
          items={items.map((it) => ({ ...it, children: undefined }))}
          style={{ minWidth: 210, maxWidth: 210, background: '#fff', borderRadius: 8, padding: '8px 0' }}
          tabBarStyle={{ width: 200 }}
        />
        <div style={{ flex: 1, minWidth: 0, background: '#fff', borderRadius: 8, padding: 16 }}>
          <Outlet />
        </div>
      </div>
    </div>
  );
}
