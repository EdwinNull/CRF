/**
 * VisitV3 — V3 治疗期 D14 访视表单 (plan.md §5.6)
 *
 * 在 V2 全部模块基础上，额外在「药物评分」之后、「药物回收与发放」之前
 * 插入「实验室检查」LabResultsForm（血常规 + 尿常规 + 血生化）。
 */
import { useEffect, useState } from 'react';
import { DatePicker, Form, Radio, Space, Typography, Button, message } from 'antd';
import dayjs, { type Dayjs } from 'dayjs';
import { usePatient } from '../../utils/usePatient';
import { usePatientStore } from '../../store/PatientContext';
import { emptyVisit, zeroMed, aeId, medId } from '../../mock/patients';
import type {
  VisitData,
  VitalSigns,
  VASScores,
  SymptomFourScale,
  RQLQScores,
  TCMScores,
  MedScore,
  DrugRecovery,
  EfficacyAssessment,
  LabBloodRoutine,
  LabUrinalysis,
  LabBiochemistry,
} from '../../types/visit';
import type { AdverseEvent } from '../../types/adverseEvent';
import type { ConcomitantMed } from '../../types/concomitantMed';
import FormSection from '../../components/FormSection';
import VitalSignsForm from '../../components/VitalSignsForm';
import VASSlider from '../../components/VASSlider';
import SymptomScoreCard from '../../components/SymptomScoreCard';
import RQLQForm from '../../components/RQLQForm';
import TCMScoreForm from '../../components/TCMScoreForm';
import MedScoreForm from '../../components/MedScoreForm';
import DrugRecoveryForm from '../../components/DrugRecoveryForm';
import EfficacyForm from '../../components/EfficacyForm';
import LabResultsForm from '../../components/LabResultsForm';
import VisitFormFooter from '../../components/VisitFormFooter';
import AdverseEventModal from '../../components/AdverseEventModal';
import ConcomitantMedModal from '../../components/ConcomitantMedModal';

const { Title } = Typography;

const DEFAULT_DRUG: DrugRecovery = {
  returnedCount: 0,
  expectedCount: 0,
  compliance: 0,
  dispensedCount: 0,
};
const DEFAULT_EFF: EfficacyAssessment = {
  efficacyIndex: null,
  efficacyLevel: null,
  allSymptomsRelieved: false,
  worsened: false,
  newComplication: false,
};

/** 实验室检查聚合对象（对应 LabResultsForm 的 value 形态） */
interface LabGroup {
  labBlood?: LabBloodRoutine;
  labUrine?: LabUrinalysis;
  labBiochem?: LabBiochemistry;
}

interface V3FormValues {
  visitDate?: Dayjs;
  vital?: VitalSigns;
  hasAdverseEvent?: boolean;
  hasNewConcomitantMed?: boolean;
  vas?: VASScores;
  four?: SymptomFourScale;
  rqlq?: RQLQScores;
  tcm?: TCMScores;
  med?: MedScore;
  lab?: LabGroup;
  drug?: DrugRecovery;
  eff?: EfficacyAssessment;
}

const toDateStr = (d?: Dayjs): string =>
  dayjs.isDayjs(d) && d.isValid() ? d.format('YYYY-MM-DD') : '';

const DEFAULT_VAS: VASScores = {
  sneeze: 0, rhinorrhea: 0, nasalItch: 0, nasalCongestion: 0, eyeItch: 0, lacrimation: 0, total: 0,
};
const DEFAULT_FOUR: SymptomFourScale = {
  sneeze: 0, rhinorrhea: 0, nasalItch: 0, nasalCongestion: 0, eyeItch: 0, lacrimation: 0, nasalTotal: 0, totalScore: 0,
};
const DEFAULT_RQLQ: RQLQScores = {
  activityLimit: [0, 0, 0], sleep: [0, 0, 0],
  nonNasalEye: [0, 0, 0, 0, 0, 0, 0], practicalProblems: [0, 0, 0],
  nasalSymptoms: [0, 0, 0, 0], eyeSymptoms: [0, 0, 0, 0], emotion: [0, 0, 0], total: 0,
};
const DEFAULT_TCM: TCMScores = {
  nasalItch: 0, sneeze: 0, rhinorrhea: 0, nasalCongestion: 0,
  windColdAversion: 0, bodyAche: 0, sweating: 0, cough: 0, paleFace: 0,
  tongueDesc: '', pulseDesc: '', total: 0,
};

export default function VisitV3() {
  const { patient } = usePatient();
  const { dispatch } = usePatientStore();
  const [form] = Form.useForm<V3FormValues>();

  const visit: VisitData | undefined = patient?.visits['V3'];
  const locked = visit?.status === 'submitted';

  // EfficacyForm 需要的当前积分：实时监听本访视中医证候 total
  const currentScore = Form.useWatch('tcm', form)?.total ?? 0;
  // 疗效基线：V1 中医证候总分
  const baselineScore = patient?.visits['V1']?.tcmScores.total ?? 0;

  /* ---------------- 不良事件 / 合并用药弹窗触发 ---------------- */
  const [aeModalOpen, setAeModalOpen] = useState(false);
  const [cmModalOpen, setCmModalOpen] = useState(false);

  const handleAESave = (payload: AdverseEvent) => {
    if (!patient) return;
    const seqNo = patient.adverseEvents.length
      ? Math.max(...patient.adverseEvents.map((x) => x.seqNo)) + 1
      : 1;
    const next: AdverseEvent = { ...payload, id: aeId(), seqNo };
    dispatch({ type: 'ADD_ADVERSE_EVENT', payload: { patientId: patient.id, event: next } });
    // 保存后保持"是"状态，可继续新增
    form.setFieldValue('hasAdverseEvent', true);
    setAeModalOpen(false);
    message.success(`已同步新增不良事件（编号 ${seqNo}）`);
  };
  const handleAECancel = () => {
    setAeModalOpen(false);
    // 取消时保持"是"状态（因为可能有多条不良事件要记录）
  };

  const handleCMSave = (payload: ConcomitantMed) => {
    if (!patient) return;
    const seqNo = patient.concomitantMeds.length
      ? Math.max(...patient.concomitantMeds.map((x) => x.seqNo)) + 1
      : 1;
    const next: ConcomitantMed = { ...payload, id: medId(), seqNo };
    dispatch({ type: 'ADD_CONCOMITANT_MED', payload: { patientId: patient.id, med: next } });
    // 保存后保持"是"状态，可继续新增
    form.setFieldValue('hasNewConcomitantMed', true);
    setCmModalOpen(false);
    message.success(`已同步新增合并用药（编号 ${seqNo}）`);
  };
  const handleCMCancel = () => {
    setCmModalOpen(false);
    // 取消时保持"是"状态（因为可能有多条合并用药要记录）
  };

  // 初始化：把访视对象按命名空间回填进 Form，缺失给默认值
  useEffect(() => {
    if (!patient) return;
    const base: VisitData = visit ?? emptyVisit('V3');
    form.setFieldsValue({
      visitDate: base.visitDate ? dayjs(base.visitDate) : undefined,
      vital: base.vitalSigns,
      hasAdverseEvent: base.hasAdverseEvent ?? false,
      hasNewConcomitantMed: base.hasNewConcomitantMed ?? false,
      vas: base.vasScores,
      four: base.symptomFourScale,
      rqlq: base.rqlqScores,
      tcm: base.tcmScores,
      med: base.medScore ?? zeroMed(),
      lab: { labBlood: base.labBlood, labUrine: base.labUrine, labBiochem: base.labBiochem },
      drug: base.drugRecovery ?? DEFAULT_DRUG,
      eff: base.efficacy ?? DEFAULT_EFF,
    });
    // 仅在切换患者时重建，编辑/提交后保留表单当前状态
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patient?.id]);

  /** 组装提交对象，缺失字段给默认零值；实验室三个子对象摊平写入 */
  const buildData = (v: V3FormValues): Partial<VisitData> => ({
    visitDate: toDateStr(v.visitDate),
    vitalSigns: v.vital ?? { temperature: 36.5, pulse: 72, systolicBP: 118, diastolicBP: 76, respiration: 16 },
    hasAdverseEvent: v.hasAdverseEvent ?? false,
    hasNewConcomitantMed: v.hasNewConcomitantMed ?? false,
    vasScores: v.vas ?? DEFAULT_VAS,
    symptomFourScale: v.four ?? DEFAULT_FOUR,
    rqlqScores: v.rqlq ?? DEFAULT_RQLQ,
    tcmScores: v.tcm ?? DEFAULT_TCM,
    medScore: v.med ?? zeroMed(),
    ...(v.lab ?? {}),
    drugRecovery: v.drug ?? DEFAULT_DRUG,
    efficacy: v.eff ?? DEFAULT_EFF,
  });

  const handleSave = () => {
    if (!patient) return;
    const data = buildData(form.getFieldsValue());
    dispatch({ type: 'UPDATE_VISIT', payload: { patientId: patient.id, visitNo: 'V3', data, status: 'draft' } });
    message.success('V3 访视已暂存');
  };

  const handleSubmit = async () => {
    if (!patient) return;
    try {
      await form.validateFields();
    } catch {
      message.warning('请先填写必填字段（访视日期）');
      return;
    }
    const data = buildData(form.getFieldsValue());
    dispatch({ type: 'UPDATE_VISIT', payload: { patientId: patient.id, visitNo: 'V3', data, status: 'submitted' } });
    message.success('V3 访视已提交并锁定');
  };

  if (!patient) return null;

  return (
    <>
      <Form form={form} layout="vertical" disabled={locked} requiredMark>
      <Title level={4} style={{ marginTop: 0 }}>V3 治疗期（D14）</Title>

      {/* 1. 访视日期 */}
      <FormSection title="访视日期" required defaultActive>
        <Form.Item
          name="visitDate"
          rules={[{ required: true, message: '请选择访视日期' }]}
          style={{ maxWidth: 320, marginBottom: 0 }}
        >
          <DatePicker
            style={{ width: '100%' }}
            format="YYYY-MM-DD"
            placeholder="请选择访视日期"
          />
        </Form.Item>
      </FormSection>

      {/* 2. 生命体征 */}
      <FormSection title="生命体征" defaultActive>
        <Form.Item name="vital" style={{ marginBottom: 0 }}>
          <VitalSignsForm />
        </Form.Item>
      </FormSection>

      {/* 3. 上次访视后情况 */}
      <FormSection title="上次访视后情况" defaultActive>
        <Space size={24} wrap>
          <Form.Item name="hasAdverseEvent" label="是否发生不良事件" style={{ marginBottom: 0 }}>
            <Radio.Group disabled={locked} optionType="button" buttonStyle="solid">
              <Radio.Button value={true} onClick={() => !locked && setAeModalOpen(true)}>是</Radio.Button>
              <Radio.Button value={false}>否</Radio.Button>
            </Radio.Group>
          </Form.Item>
          {!locked && (
            <Button type="link" onClick={() => setAeModalOpen(true)} style={{ padding: 0 }}>
              + 新增不良事件
            </Button>
          )}
          <Form.Item name="hasNewConcomitantMed" label="是否合并用药变化" style={{ marginBottom: 0 }}>
            <Radio.Group disabled={locked} optionType="button" buttonStyle="solid">
              <Radio.Button value={true} onClick={() => !locked && setCmModalOpen(true)}>是</Radio.Button>
              <Radio.Button value={false}>否</Radio.Button>
            </Radio.Group>
          </Form.Item>
          {!locked && (
            <Button type="link" onClick={() => setCmModalOpen(true)} style={{ padding: 0 }}>
              + 新增合并用药
            </Button>
          )}
        </Space>
      </FormSection>

      {/* 4. VAS 评分 */}
      <FormSection title="VAS 评分" defaultActive>
        <Form.Item name="vas" style={{ marginBottom: 0 }}>
          <VASSlider />
        </Form.Item>
      </FormSection>

      {/* 5. 四分法症状评分 */}
      <FormSection title="四分法症状评分" defaultActive>
        <Form.Item name="four" style={{ marginBottom: 0 }}>
          <SymptomScoreCard />
        </Form.Item>
      </FormSection>

      {/* 6. RQLQ 问卷 */}
      <FormSection title="RQLQ 问卷" defaultActive>
        <Form.Item name="rqlq" style={{ marginBottom: 0 }}>
          <RQLQForm />
        </Form.Item>
      </FormSection>

      {/* 7. 中医证候评分 */}
      <FormSection title="中医证候评分" defaultActive>
        <Form.Item name="tcm" style={{ marginBottom: 0 }}>
          <TCMScoreForm />
        </Form.Item>
      </FormSection>

      {/* 8. 药物评分 */}
      <FormSection title="药物评分" defaultActive>
        <Form.Item name="med" style={{ marginBottom: 0 }}>
          <MedScoreForm />
        </Form.Item>
      </FormSection>

      {/* 8.5 实验室检查（V3 独有：血常规 + 尿常规 + 血生化） */}
      <FormSection title="实验室检查" defaultActive>
        <Form.Item name="lab" style={{ marginBottom: 0 }}>
          <LabResultsForm modules={['blood', 'urine', 'biochem']} />
        </Form.Item>
      </FormSection>

      {/* 9. 药物回收与发放 */}
      <FormSection title="药物回收与发放" defaultActive>
        <Form.Item name="drug" style={{ marginBottom: 0 }}>
          <DrugRecoveryForm />
        </Form.Item>
      </FormSection>

      {/* 10. 疗效评估 */}
      <FormSection title="疗效评估" required defaultActive>
        <Form.Item name="eff" style={{ marginBottom: 0 }}>
          <EfficacyForm baselineScore={baselineScore} currentScore={currentScore} />
        </Form.Item>
      </FormSection>

      <VisitFormFooter onSave={handleSave} onSubmit={handleSubmit} />
    </Form>

    <AdverseEventModal
      open={aeModalOpen}
      initial={null}
      onSave={handleAESave}
      onCancel={handleAECancel}
    />
    <ConcomitantMedModal
      open={cmModalOpen}
      initial={null}
      onSave={handleCMSave}
      onCancel={handleCMCancel}
    />
    </>
  );
}
