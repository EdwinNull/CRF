/**
 * V4 治疗期 D28 访视表单 (plan.md §5.7)
 *
 * = V3 全部模块 + 新增三项实验室检查：
 *   - FeNO 呼气一氧化氮（口 + 鼻）
 *   - 血清总 IgE
 *   - 心电图
 *
 * 实验室大模块由 LabResultsForm 渲染，modules 同时包含
 * blood / urine / biochem / feno / ecg / ige 六个子面板。
 *
 * 其余模块与 V2/V3 一致：
 *   访视日期 → 生命体征 → 上次访视后情况(不良事件/合并用药) →
 *   药物评分 → 药物回收 → 疗效评估 → 实验室 → 四分法 → VAS → RQLQ → 中医证候
 *
 * 疗效评估 baselineScore 取自 V1 中医证候总分，currentScore 由 antd
 * Form.useWatch 实时监听本访视 tcmScores.total 传入。
 *
 * submitted -> 全表单只读（Form disabled + 控件显式 disabled）。
 */
import { useState, useEffect } from 'react';
import { DatePicker, Form, Radio, Space, Typography, Button, message } from 'antd';
import dayjs, { type Dayjs } from 'dayjs';
import { useParams } from 'react-router-dom';
import { usePatientStore } from '../../store/PatientContext';
import { aeId, medId } from '../../mock/patients';
import type { LabModule } from '../../components/componentTypes';
import type { VisitData } from '../../types/visit';
import type { AdverseEvent } from '../../types/adverseEvent';
import type { ConcomitantMed } from '../../types/concomitantMed';
import FormSection from '../../components/FormSection';
import ConcomitantMedModal from '../../components/ConcomitantMedModal';
import VitalSignsForm from '../../components/VitalSignsForm';
import SymptomScoreCard from '../../components/SymptomScoreCard';
import VASSlider from '../../components/VASSlider';
import RQLQForm from '../../components/RQLQForm';
import TCMScoreForm from '../../components/TCMScoreForm';
import MedScoreForm from '../../components/MedScoreForm';
import DrugRecoveryForm from '../../components/DrugRecoveryForm';
import EfficacyForm from '../../components/EfficacyForm';
import LabResultsForm from '../../components/LabResultsForm';
import VisitFormFooter from '../../components/VisitFormFooter';
import AdverseEventModal from '../../components/AdverseEventModal';

const { Title } = Typography;

/** V4 实验室子模块：V3 三项 + 新增 FeNO / 血清IgE / 心电图 */
const LAB_MODULES: LabModule[] = ['blood', 'urine', 'biochem', 'feno', 'ecg', 'ige'];

/** 访视整体表单值形状（Form.Item name 路径与 store 字段一一对应，实验室合并为一个 labResults） */
interface V4FormValues {
  visitDate?: Dayjs;
  vitalSigns?: VisitData['vitalSigns'];
  symptomFourScale?: VisitData['symptomFourScale'];
  vasScores?: VisitData['vasScores'];
  rqlqScores?: VisitData['rqlqScores'];
  tcmScores?: VisitData['tcmScores'];
  medScore?: VisitData['medScore'];
  drugRecovery?: VisitData['drugRecovery'];
  efficacy?: VisitData['efficacy'];
  hasAdverseEvent?: boolean;
  hasNewConcomitantMed?: boolean;
  labResults?: {
    labBlood?: VisitData['labBlood'];
    labUrine?: VisitData['labUrine'];
    labBiochem?: VisitData['labBiochem'];
    feno?: VisitData['feno'];
    ecg?: VisitData['ecg'];
    serumIgE?: VisitData['serumIgE'];
  };
}

export default function VisitV4() {
  const { id } = useParams<{ id: string }>();
  const { state, dispatch } = usePatientStore();
  const patient = id ? state.patients.find((p) => p.id === id) : undefined;

  // V4 访视恒存在（mock 中对全员预置 emptyVisit），仅与当前患者同生命周期
  const visit = patient?.visits['V4'];

  const [form] = Form.useForm<V4FormValues>();
  const [submitting, setSubmitting] = useState(false);

  // Hooks 必须无条件调用
  const disabled = visit?.status === 'submitted';

  /** V1 中医证候总分 = 疗效评估基线 */
  const baselineScore = patient?.visits['V1']?.tcmScores?.total ?? 0;

  /** 当前中医证候总分（实时监听本访视 tcmScores），供疗效评估实时派生 */
  const watchedTcm = Form.useWatch('tcmScores', form);
  const currentScore = watchedTcm?.total ?? visit?.tcmScores?.total ?? 0;

  /* ---------------- 不良事件 / 合并用药弹窗 ---------------- */
  // 由“是”按钮自身的点击事件直接触发，避免依赖 Form.useWatch 的前后值判断在
  // 首次回填、切换患者时漏掉弹窗。
  const [aeModalOpen, setAeModalOpen] = useState(false);
  const [cmModalOpen, setCmModalOpen] = useState(false);

  const handleAESave = (payload: AdverseEvent) => {
    if (!patient) return;
    const seqNo = patient.adverseEvents.length
      ? Math.max(...patient.adverseEvents.map((x) => x.seqNo)) + 1
      : 1;
    const next: AdverseEvent = { ...payload, id: aeId(), seqNo };
    dispatch({ type: 'ADD_ADVERSE_EVENT', payload: { patientId: patient.id, event: next } });
    // 完成弹窗填表即把 V4 的“发生不良事件”状态一并保存为草稿，
    // 即使用户暂时离开 V4，也不会丢失这次登记的上下文。
    dispatch({
      type: 'UPDATE_VISIT',
      payload: { patientId: patient.id, visitNo: 'V4', data: { hasAdverseEvent: true }, status: 'draft' },
    });
    form.setFieldValue('hasAdverseEvent', true);
    setAeModalOpen(false);
    message.success(`已同步新增不良事件（编号 ${seqNo}）`);
  };
  const handleAECancel = () => {
    setAeModalOpen(false);
    // 取消时保持"是"状态（因为可能有多条不良事件要记录）
  };

  const openAEForm = () => {
    if (!disabled) {
      form.setFieldValue('hasAdverseEvent', true);
      setAeModalOpen(true);
    }
  };

  const handleCMSave = (payload: ConcomitantMed) => {
    if (!patient) return;
    const seqNo = patient.concomitantMeds.length
      ? Math.max(...patient.concomitantMeds.map((x) => x.seqNo)) + 1
      : 1;
    const next: ConcomitantMed = { ...payload, id: medId(), seqNo };
    dispatch({ type: 'ADD_CONCOMITANT_MED', payload: { patientId: patient.id, med: next } });
    dispatch({
      type: 'UPDATE_VISIT',
      payload: { patientId: patient.id, visitNo: 'V4', data: { hasNewConcomitantMed: true }, status: 'draft' },
    });
    form.setFieldValue('hasNewConcomitantMed', true);
    setCmModalOpen(false);
    message.success(`已同步新增合并用药（编号 ${seqNo}）`);
  };
  const handleCMCancel = () => {
    setCmModalOpen(false);
    // 取消时保持"是"状态（因为可能有多条合并用药要记录）
  };

  const openCMForm = () => {
    if (!disabled) {
      form.setFieldValue('hasNewConcomitantMed', true);
      setCmModalOpen(true);
    }
  };

  /** 初始化：把访视对象按命名空间回填进 Form */
  useEffect(() => {
    if (!patient || !visit) return;
    form.setFieldsValue({
      visitDate: visit.visitDate ? dayjs(visit.visitDate) : undefined,
      vitalSigns: visit.vitalSigns,
      symptomFourScale: visit.symptomFourScale,
      vasScores: visit.vasScores,
      rqlqScores: visit.rqlqScores,
      tcmScores: visit.tcmScores,
      medScore: visit.medScore,
      drugRecovery: visit.drugRecovery,
      efficacy: visit.efficacy,
      hasAdverseEvent: visit.hasAdverseEvent ?? false,
      hasNewConcomitantMed: visit.hasNewConcomitantMed ?? false,
      labResults: {
        labBlood: visit.labBlood,
        labUrine: visit.labUrine,
        labBiochem: visit.labBiochem,
        feno: visit.feno,
        ecg: visit.ecg,
        serumIgE: visit.serumIgE,
      },
    });
    // 仅在切换患者时回填，避免保存弹窗记录时覆盖 V4 中尚未暂存的其他输入。
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patient?.id]);

  if (!patient || !visit) {
    return null;
  }

  /** 组织待写入 store 的 VisitData 片段（实验室展开到顶层字段） */
  const collect = (values: V4FormValues): Partial<VisitData> => {
    const lab = values.labResults ?? {};
    return {
      visitDate: values.visitDate ? dayjs(values.visitDate).format('YYYY-MM-DD') : visit.visitDate ?? '',
      vitalSigns: values.vitalSigns,
      symptomFourScale: values.symptomFourScale,
      vasScores: values.vasScores,
      rqlqScores: values.rqlqScores,
      tcmScores: values.tcmScores,
      medScore: values.medScore,
      drugRecovery: values.drugRecovery,
      efficacy: values.efficacy,
      hasAdverseEvent: values.hasAdverseEvent,
      hasNewConcomitantMed: values.hasNewConcomitantMed,
      ...lab,
    };
  };

  /** 暂存：写入 draft，不强制校验 */
  const handleSave = () => {
    const values = form.getFieldsValue();
    dispatch({
      type: 'UPDATE_VISIT',
      payload: { patientId: patient.id, visitNo: 'V4', data: collect(values), status: 'draft' },
    });
    message.success('已暂存 V4 访视数据');
  };

  /** 提交：校验通过后写入 submitted（锁定只读） */
  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setSubmitting(true);
      dispatch({
        type: 'UPDATE_VISIT',
        payload: { patientId: patient.id, visitNo: 'V4', data: collect(values as V4FormValues), status: 'submitted' },
      });
      message.success('V4 访视已提交并锁定');
    } catch {
      message.warning('存在未填写或填写不符合要求的内容，请检查后重试');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Form form={form} layout="vertical" disabled={disabled} requiredMark>
        <Title level={4} style={{ marginTop: 0 }}>V4 治疗期（D28）</Title>

        {/* 访视日期 */}
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

        {/* 生命体征 */}
        <FormSection title="生命体征" defaultActive>
          <Form.Item name="vitalSigns" style={{ marginBottom: 0 }}>
            <VitalSignsForm disabled={disabled} />
          </Form.Item>
        </FormSection>

        {/* 上次访视后情况 */}
        <FormSection title="上次访视后情况" defaultActive>
          <Space size={24} wrap>
            <Form.Item name="hasAdverseEvent" label="是否发生不良事件" style={{ marginBottom: 0 }}>
              <Radio.Group disabled={disabled} optionType="button" buttonStyle="solid">
                <Radio.Button value={true} onClick={openAEForm}>是</Radio.Button>
                <Radio.Button value={false}>否</Radio.Button>
              </Radio.Group>
            </Form.Item>
            {!disabled && (
              <Button type="link" onClick={openAEForm} style={{ padding: 0 }}>
                + 新增不良事件
              </Button>
            )}
            <Form.Item name="hasNewConcomitantMed" label="是否合并用药变化" style={{ marginBottom: 0 }}>
              <Radio.Group disabled={disabled} optionType="button" buttonStyle="solid">
                <Radio.Button value={true} onClick={openCMForm}>是</Radio.Button>
                <Radio.Button value={false}>否</Radio.Button>
              </Radio.Group>
            </Form.Item>
            {!disabled && (
              <Button type="link" onClick={openCMForm} style={{ padding: 0 }}>
                + 新增合并用药
              </Button>
            )}
          </Space>
        </FormSection>

        {/* VAS 评分 */}
        <FormSection title="VAS 评分" defaultActive>
          <Form.Item name="vasScores" style={{ marginBottom: 0 }}>
            <VASSlider disabled={disabled} />
          </Form.Item>
        </FormSection>

        {/* 四分法症状评分 */}
        <FormSection title="四分法症状评分" defaultActive>
          <Form.Item name="symptomFourScale" style={{ marginBottom: 0 }}>
            <SymptomScoreCard disabled={disabled} />
          </Form.Item>
        </FormSection>

        {/* RQLQ 问卷 */}
        <FormSection title="RQLQ 问卷" defaultActive>
          <Form.Item name="rqlqScores" style={{ marginBottom: 0 }}>
            <RQLQForm disabled={disabled} />
          </Form.Item>
        </FormSection>

        {/* 中医证候评分 */}
        <FormSection title="中医证候评分" defaultActive>
          <Form.Item name="tcmScores" style={{ marginBottom: 0 }}>
            <TCMScoreForm disabled={disabled} />
          </Form.Item>
        </FormSection>

        {/* 药物评分 */}
        <FormSection title="药物评分" defaultActive>
          <Form.Item name="medScore" style={{ marginBottom: 0 }}>
            <MedScoreForm disabled={disabled} />
          </Form.Item>
        </FormSection>

        {/* 实验室检查：V3 三项 + FeNO / 心电图 / 血清总 IgE */}
        <FormSection title="实验室检查" defaultActive>
          <Form.Item name="labResults" style={{ marginBottom: 0 }}>
            <LabResultsForm modules={LAB_MODULES} disabled={disabled} />
          </Form.Item>
        </FormSection>

        {/* 药物回收与发放 */}
        <FormSection title="药物回收与发放" defaultActive>
          <Form.Item name="drugRecovery" style={{ marginBottom: 0 }}>
            <DrugRecoveryForm disabled={disabled} />
          </Form.Item>
        </FormSection>

        {/* 疗效评估 */}
        <FormSection title="疗效评估" required defaultActive>
          <Form.Item name="efficacy" style={{ marginBottom: 0 }}>
            <EfficacyForm baselineScore={baselineScore} currentScore={currentScore} disabled={disabled} />
          </Form.Item>
        </FormSection>
      </Form>

      {!disabled && (
        <VisitFormFooter submitting={submitting} onSave={handleSave} onSubmit={handleSubmit} />
      )}

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
