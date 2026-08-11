/**
 * 数据导出页 (plan.md §5.14)
 * 筛选（中心/状态/入组日期）+ 预览 + 全量/Safety Excel 导出。
 */
import { useState } from 'react';
import {
  Card, Table, Select, DatePicker, Button, Space, Typography, message, Tag,
} from 'antd';
import { DownloadOutlined, SearchOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import type { Dayjs } from 'dayjs';
import { usePatientStore } from '../../store/PatientContext';
import { CENTERS, CENTER_NAME } from '../../mock/dictionaries';
import { filterPatients, exportAll, exportSafety } from '../../utils/exportExcel';
import type { CenterId, Patient, PatientStatus } from '../../types/patient';

const STATUS_OPTIONS: { value: PatientStatus; label: string }[] = [
  { value: 'screening', label: '筛选中' },
  { value: 'treatment', label: '治疗中' },
  { value: 'followup', label: '随访中' },
  { value: 'completed', label: '已完成' },
  { value: 'withdrawn', label: '已退出' },
];

export default function Export() {
  const { state } = usePatientStore();
  const [centers, setCenters] = useState<CenterId[]>([]);
  const [statuses, setStatuses] = useState<PatientStatus[]>([]);
  const [range, setRange] = useState<[Dayjs | null, Dayjs | null] | null>(null);

  const result = filterPatients(state.patients, {
    centers,
    statuses,
    dateRange: range && range[0] && range[1]
      ? [range[0].format('YYYY-MM-DD'), range[1].format('YYYY-MM-DD')]
      : null,
  });

  const columns: ColumnsType<Patient> = [
    { title: '筛选号', dataIndex: 'screeningNo', width: 110 },
    { title: '随机编号', dataIndex: 'randomNo', width: 110, render: (v: string) => v || '—' },
    { title: '姓名缩写', dataIndex: 'nameAbbr', width: 110 },
    { title: '研究中心', dataIndex: 'centerId', width: 240, render: (v: CenterId) => CENTER_NAME[v] ?? v },
    { title: '入组日期', dataIndex: 'enrollmentDate', width: 120 },
    {
      title: '状态', dataIndex: 'status', width: 100,
      render: (s: PatientStatus) => <Tag>{STATUS_OPTIONS.find((o) => o.value === s)?.label ?? s}</Tag>,
    },
  ];

  const onExport = (all: boolean) => {
    if (!result.length) {
      message.warning('当前筛选无匹配患者，无法导出');
      return;
    }
    try {
      if (all) exportAll(result);
      else exportSafety(result);
      message.success(`已导出 ${result.length} 例患者`);
    } catch (e) {
      message.error('导出失败：请在浏览器中允许下载');
      console.error(e);
    }
  };

  return (
    <div>
      <Card title="数据筛选" style={{ marginBottom: 16 }}>
        <Space wrap size="large">
          <div>
            <Typography.Text>研究中心：</Typography.Text>
            <Select
              mode="multiple"
              allowClear
              placeholder="全部中心"
              style={{ width: 320 }}
              value={centers}
              onChange={(v) => setCenters(v as CenterId[])}
              options={CENTERS.map((c) => ({ label: `${c.id} — ${c.name}`, value: c.id }))}
            />
          </div>
          <div>
            <Typography.Text>患者状态：</Typography.Text>
            <Select
              mode="multiple"
              allowClear
              placeholder="全部状态"
              style={{ width: 220 }}
              value={statuses}
              onChange={(v) => setStatuses(v as PatientStatus[])}
              options={STATUS_OPTIONS}
            />
          </div>
          <div>
            <Typography.Text>入组日期：</Typography.Text>
            <DatePicker.RangePicker
              value={range}
              onChange={(v) => setRange(v as [Dayjs | null, Dayjs | null] | null)}
              allowClear
            />
          </div>
          <Button icon={<SearchOutlined />} onClick={() => message.info(`匹配 ${result.length} 例`)}>
            查询
          </Button>
        </Space>
      </Card>

      <Card
        title={`预览结果（${result.length} 例）`}
        extra={
          <Space>
            <Button icon={<DownloadOutlined />} onClick={() => onExport(true)}>
              导出全量数据
            </Button>
            <Button icon={<DownloadOutlined />} onClick={() => onExport(false)}>
              导出安全性数据
            </Button>
          </Space>
        }
      >
        <Table<Patient>
          rowKey="id"
          columns={columns}
          dataSource={result}
          pagination={{ pageSize: 10 }}
        />
        <Typography.Text type="secondary" style={{ fontSize: 12, display: 'block', marginTop: 8 }}>
          全量数据包含所有访视字段（Sheet 主数据表/不良事件/合并用药/合并非药物治疗）；安全性数据仅含不良事件与合并用药。
        </Typography.Text>
      </Card>
    </div>
  );
}
