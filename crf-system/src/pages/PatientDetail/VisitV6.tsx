/**
 * V6 M3 随访期表单 (plan.md §5.9，与 V5 完全一致的精简版)
 *
 * 模块顺序：访视日期 / 生命体征 / VAS 评分 / 四分法症状评分 / RQLQ 问卷
 *          / 中医证候评分 / 药物评分 / 疗效评估。
 * 精简版无实验室检查、药物回收、不良事件/合并用药勾选。
 *
 * 组件受控约定（见 componentTypes.ts）：各评分组件放入 <Form.Item name=...>
 * 时由 AntD Form 注入 value/onChange，组件内部自行计算并回传含派生 total 的完整对象。
 * 暂存 / 提交分别 dispatch UPDATE_VISIT（visitNo='V6'，status draft/submitted），
 * submitted 后整表 disabled 只读。
 */
import { useMemo } from 'react';
import { Form, DatePicker, Alert, Empty, Spin } from 'antd';
import {
  CalendarOutlined,
  HeartOutlined,
  SlidersOutlined,
  BarsOutlined,
  FileTextOutlined,
  MedicineBoxOutlined,
  ExperimentOutlined,
  CheckCircleOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import type { VisitNo, VisitData, TCMScores, EfficacyAssessment } from '../../types/visit';
import { VISIT_LABEL } from '../../types/visit';
import { usePatient } from '../../utils/usePatient';
import { usePatientStore } from '../../store/PatientContext';
import { requiredRule, dateNotFuture } from '../../utils/validators';
import VitalSignsForm from '../../components/VitalSignsForm';
import VASSlider from '../../components/VASSlider';
import SymptomScoreCard from '../../components/SymptomScoreCard';
import RQLQForm from '../../components/RQLQForm';
import TCMScoreForm from '../../components/TCMScoreForm';
import MedScoreForm from '../../components/MedScoreForm';
import EfficacyForm from '../../components/EfficacyForm';
import FormSection, { type SectionStatus } from '../../components/FormSection';
import VisitFormFooter from '../../components/VisitFormFooter';

const VISIT_NO: VisitNo = 'V6';

/** 表单内部字段名 -> VisitData 存储字段名的映射（dispatch UPDATE_VISIT 时还原） */
type FormShape = {
  visitDate?: dayjs.Dayjs;
  vital?: VisitData['vitalSigns'];
  vas?: VisitData['vasScores'];
  four?: VisitData['symptomFourScale'];
  rqlq?: VisitData['rqlqScores'];
  tcm?: VisitData['tcmScores'];
  med?: VisitData['medScore'];
  eff?: VisitData['efficacy'];
};

/** 判断模块是否存在“已填写”的实质内容（任一字段非空/非零） */
function anyVal(v?: object | null): boolean {
  if (!v || typeof v !== 'object') return false;
  return Object.values(v).some(
    (x) => x != null && x !== '' && x !== false && x !== 0 && !(Array.isArray(x) && x.length === 0),
  );
}

/** 由存储模块数据推导 FormSection 折叠面板状态 */
function moduleStatus(editable: boolean, stored?: object | null): SectionStatus {
  if (editable) return 'complete'; // 已提交 → 展示已完成
  if (anyVal(stored)) return 'complete';
  return 'empty';
}

export default function VisitV6() {
  const { patient } = usePatient();
  const { dispatch } = usePatientStore();
  const [form] = Form.useForm<FormShape>();

  const visit = patient?.visits[VISIT_NO];
  const isSubmitted = visit?.status === 'submitted';

  // V1 中医证候积分作为疗效评估基线（治疗前积分）
  const baselineScore = patient?.visits['V1']?.tcmScores?.total ?? 0;
  // 实时监听本访视中医证候总分，随用户输入即时传给 EfficacyForm
  const currentTCM = Form.useWatch('tcm', form);
  const currentScore = (currentTCM as TCMScores | undefined)?.total ?? 0;

  const initialValues = useMemo<FormShape>(() => {
    return {
      visitDate: visit?.visitDate ? dayjs(visit.visitDate) : undefined,
      vital: visit?.vitalSigns,
      vas: visit?.vasScores,
      four: visit?.symptomFourScale,
      rqlq: visit?.rqlqScores,
      tcm: visit?.tcmScores,
      med: visit?.medScore,
      eff: visit?.efficacy,
    };
  }, [visit]);

  if (!patient) {
    return (
      <div style={{ padding: 40, textAlign: 'center' }}>
        <Empty description="未找到该患者" />
      </div>
    );
  }

  /** 读取当前表单值并映射回 VisitData 存储字段 */
  const buildData = (): Partial<VisitData> => {
    const v = form.getFieldsValue();
    const visitDate = v.visitDate ? dayjs(v.visitDate).format('YYYY-MM-DD') : undefined;
    return {
      visitDate,
      vitalSigns: v.vital,
      vasScores: v.vas,
      symptomFourScale: v.four,
      rqlqScores: v.rqlq,
      tcmScores: v.tcm,
      medScore: v.med,
      efficacy: v.eff,
    };
  };

  const dispatchSave = (status: VisitData['status']) => {
    dispatch({
      type: 'UPDATE_VISIT',
      payload: {
        patientId: patient.id,
        visitNo: VISIT_NO,
        data: buildData(),
        status,
      },
    });
  };

  const handleSave = () => dispatchSave('draft');

  const handleSubmit = async () => {
    try {
      await form.validateFields();
      dispatchSave('submitted');
    } catch {
      /* 校验未通过，交由 AntD 展示错误提示 */
    }
  };

  const dateStatus: SectionStatus = isSubmitted ? 'complete' : (visit?.visitDate ? 'complete' : 'empty');

  return (
    <Spin spinning={!patient} tip="加载中...">
      <Form
        form={form}
        layout="vertical"
        requiredMark
        disabled={isSubmitted}
        initialValues={initialValues}
      >
        {isSubmitted && (
          <Alert
            type="success"
            showIcon
            icon={<CheckCircleOutlined />}
            message={`${VISIT_LABEL[VISIT_NO]} 已提交，当前为只读状态`}
            description="如需修改，请联系管理员解锁该访视。"
            style={{ marginBottom: 12 }}
          />
        )}

        {/* 1. 访视日期 */}
        <FormSection
          title="访视日期"
          icon={<CalendarOutlined />}
          required
          status={dateStatus}
          defaultActive
        >
          <Form.Item
            name="visitDate"
            label="访视日期"
            rules={[requiredRule, dateNotFuture()]}
          >
            <DatePicker
              style={{ width: 240 }}
              placeholder="请选择访视日期"
              format="YYYY-MM-DD"
            />
          </Form.Item>
        </FormSection>

        {/* 2. 生命体征 */}
        <FormSection
          title="生命体征"
          icon={<HeartOutlined />}
          required
          status={moduleStatus(isSubmitted, visit?.vitalSigns)}
        >
          <Form.Item name="vital" noStyle>
            <VitalSignsForm />
          </Form.Item>
        </FormSection>

        {/* 3. VAS 评分 */}
        <FormSection
          title="VAS 评分"
          icon={<SlidersOutlined />}
          required
          status={moduleStatus(isSubmitted, visit?.vasScores)}
        >
          <Form.Item name="vas" noStyle>
            <VASSlider />
          </Form.Item>
        </FormSection>

        {/* 4. 四分法鼻眼症状评分 */}
        <FormSection
          title="四分法鼻眼症状评分"
          icon={<BarsOutlined />}
          required
          status={moduleStatus(isSubmitted, visit?.symptomFourScale)}
        >
          <Form.Item name="four" noStyle>
            <SymptomScoreCard />
          </Form.Item>
        </FormSection>

        {/* 5. RQLQ 问卷 */}
        <FormSection
          title="RQLQ 问卷"
          icon={<FileTextOutlined />}
          required
          status={moduleStatus(isSubmitted, visit?.rqlqScores)}
        >
          <Form.Item name="rqlq" noStyle>
            <RQLQForm />
          </Form.Item>
        </FormSection>

        {/* 6. 中医证候评分 */}
        <FormSection
          title="中医证候评分"
          icon={<ExperimentOutlined />}
          required
          status={moduleStatus(isSubmitted, visit?.tcmScores)}
        >
          <Form.Item name="tcm" noStyle>
            <TCMScoreForm />
          </Form.Item>
        </FormSection>

        {/* 7. 药物评分 */}
        <FormSection
          title="药物评分"
          icon={<MedicineBoxOutlined />}
          required
          status={moduleStatus(isSubmitted, visit?.medScore)}
        >
          <Form.Item name="med" noStyle>
            <MedScoreForm />
          </Form.Item>
        </FormSection>

        {/* 8. 疗效评估 */}
        <FormSection
          title="疗效评估"
          icon={<CheckCircleOutlined />}
          required
          status={
            isSubmitted
              ? 'complete'
              : (visit?.efficacy as EfficacyAssessment | undefined)?.efficacyIndex != null
                ? 'complete'
                : 'empty'
          }
        >
          <Form.Item name="eff" noStyle>
            <EfficacyForm baselineScore={baselineScore} currentScore={currentScore} />
          </Form.Item>
        </FormSection>
      </Form>

      {!isSubmitted && (
        <VisitFormFooter onSave={handleSave} onSubmit={handleSubmit} />
      )}
    </Spin>
  );
}
