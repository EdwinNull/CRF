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
import { useMemo, useState } from 'react';
import { DatePicker, Form, Radio, Space, Tag, Typography, message } from 'antd';
import dayjs, { type Dayjs } from 'dayjs';
import { useParams } from 'react-router-dom';
import { usePatientStore } from '../../store/PatientContext';
import type { LabModule } from '../../components/componentTypes';
import type { VisitData } from '../../types/visit';
import FormSection from '../../components/FormSection';
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

const { Text } = Typography;

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

  /** 首次挂载时用 store 数据回填表单 initialValues */
  const initial = useMemo<V4FormValues>(() => {
    return {
      visitDate: visit?.visitDate ? dayjs(visit.visitDate) : undefined,
      vitalSigns: visit?.vitalSigns,
      symptomFourScale: visit?.symptomFourScale,
      vasScores: visit?.vasScores,
      rqlqScores: visit?.rqlqScores,
      tcmScores: visit?.tcmScores,
      medScore: visit?.medScore,
      drugRecovery: visit?.drugRecovery,
      efficacy: visit?.efficacy,
      hasAdverseEvent: visit?.hasAdverseEvent,
      hasNewConcomitantMed: visit?.hasNewConcomitantMed,
      labResults: {
        labBlood: visit?.labBlood,
        labUrine: visit?.labUrine,
        labBiochem: visit?.labBiochem,
        feno: visit?.feno,
        ecg: visit?.ecg,
        serumIgE: visit?.serumIgE,
      },
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visit]);

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
    } catch (err) {
      message.warning('存在未填写或填写不符合要求的内容，请检查后重试');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <Space style={{ marginBottom: 12 }} wrap>
        <Typography.Title level={4} style={{ margin: 0 }}>
          V4 治疗期 D28 访视
        </Typography.Title>
        {visit.status === 'submitted' ? (
          <Tag color="green">已提交（只读）</Tag>
        ) : (
          <Tag color="orange">草稿</Tag>
        )}
      </Space>

      <Form form={form} layout="vertical" initialValues={initial} disabled={disabled}>
        {/* 访视日期 */}
        <FormSection title="访视日期" required defaultActive status={visit.visitDate ? 'complete' : 'empty'}>
          <Form.Item
            name="visitDate"
            rules={[{ required: true, message: '请选择访视日期' }]}
            style={{ maxWidth: 320 }}
          >
            <DatePicker
              allowClear={false}
              format="YYYY-MM-DD"
              style={{ width: '100%' }}
              disabled={disabled}
            />
          </Form.Item>
          <Text type="secondary">本次为治疗第 28 天访视。</Text>
        </FormSection>

        {/* 生命体征 */}
        <FormSection title="生命体征" status={visit.vitalSigns ? 'partial' : 'empty'}>
          <Form.Item name="vitalSigns" noStyle>
            <VitalSignsForm disabled={disabled} />
          </Form.Item>
        </FormSection>

        {/* 上次访视后情况 */}
        <FormSection title="上次访视后情况">
          <Space direction="vertical" style={{ width: '100%' }} size={16}>
            <Form.Item
              name="hasAdverseEvent"
              label="上次访视后是否发生不良事件"
              style={{ marginBottom: 0 }}
            >
              <Radio.Group
                disabled={disabled}
                options={[
                  { label: '否', value: false },
                  { label: '是（请至「不良事件」页登记）', value: true },
                ]}
              />
            </Form.Item>
            <Form.Item
              name="hasNewConcomitantMed"
              label="上次访视后是否新合并用药"
              style={{ marginBottom: 0 }}
            >
              <Radio.Group
                disabled={disabled}
                options={[
                  { label: '否', value: false },
                  { label: '是（请至「合并用药」页登记）', value: true },
                ]}
              />
            </Form.Item>
          </Space>
        </FormSection>

        {/* 药物评分 */}
        <FormSection title="药物评分">
          <Form.Item name="medScore" noStyle>
            <MedScoreForm disabled={disabled} />
          </Form.Item>
        </FormSection>

        {/* 药物回收 */}
        <FormSection title="药物回收">
          <Form.Item name="drugRecovery" noStyle>
            <DrugRecoveryForm disabled={disabled} />
          </Form.Item>
        </FormSection>

        {/* 疗效评估 */}
        <FormSection title="疗效评估" status={currentScore > 0 ? 'partial' : 'empty'}>
          <Form.Item name="efficacy" noStyle>
            <EfficacyForm baselineScore={baselineScore} currentScore={currentScore} disabled={disabled} />
          </Form.Item>
        </FormSection>

        {/* 实验室检查：血常规 + 尿常规 + 血生化 + FeNO + 心电图 + 血清总IgE */}
        <FormSection title="实验室检查" defaultActive>
          <Form.Item name="labResults" noStyle>
            <LabResultsForm modules={LAB_MODULES} disabled={disabled} />
          </Form.Item>
        </FormSection>

        {/* 四分法症状评分 */}
        <FormSection title="四分法鼻眼症状评分">
          <Form.Item name="symptomFourScale" noStyle>
            <SymptomScoreCard disabled={disabled} />
          </Form.Item>
        </FormSection>

        {/* VAS 评分 */}
        <FormSection title="VAS 视觉模拟评分">
          <Form.Item name="vasScores" noStyle>
            <VASSlider disabled={disabled} />
          </Form.Item>
        </FormSection>

        {/* RQLQ 问卷 */}
        <FormSection title="RQLQ 鼻炎生活质量问卷">
          <Form.Item name="rqlqScores" noStyle>
            <RQLQForm disabled={disabled} />
          </Form.Item>
        </FormSection>

        {/* 中医证候评分 */}
        <FormSection title="中医证候评分">
          <Form.Item name="tcmScores" noStyle>
            <TCMScoreForm disabled={disabled} />
          </Form.Item>
        </FormSection>
      </Form>

      {!disabled && (
        <VisitFormFooter submitting={submitting} onSave={handleSave} onSubmit={handleSubmit} />
      )}
    </div>
  );
}
