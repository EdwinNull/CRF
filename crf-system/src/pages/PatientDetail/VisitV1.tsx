/**
 * VisitV1 — V1 筛查期表单 (plan.md §5.4)
 *
 * 整个系统最复杂的表单：17 个模块（A 知情同意 ~ R 发放研究药物）。
 * 以单一 AntD Form + FormSection(Collapse 折叠面板) 承载。
 *
 * 结构要点：
 * - 字段按命名空间拆分：consentDate / d.*(人口学) / vital / allergy / resp /
 *   family / prior / illness / tcmExam / lab / vas / four / rqlq / tcm /
 *   inclusion / exclusion / screening / dispensedCount / investigatorSignature / signatureDate。
 * - 评分模块（VAS/四分/RQLQ/中医证候/生命体征/实验室）均为受控组件，
 *   直接置于 <Form.Item name=...> 中，AntD 自动注入 value/onChange。
 * - 两个计算联动：
 *   1) BMI = 体重/(身高/100)^2（useWatch 监听，只读显示）。
 *   2) 入选(6)全为"是"且排除(11)全为"否" → 绿色 Alert；否则红色 Alert + 失败原因。
 * - 保存：暂存 → UPDATE_VISIT(status=saved draft)；提交 → 校验(不硬挡)+派生判定后
 *   UPDATE_VISIT(status=submitted) + UPDATE_PATIENT(顶层字段)。提交后锁定只读。
 */
import { useEffect, useMemo, useState } from 'react';
import {
  Form,
  Input,
  InputNumber,
  Radio,
  Checkbox,
  DatePicker,
  Button,
  Alert,
  Space,
  Divider,
  Typography,
  message,
} from 'antd';
import { MinusCircleOutlined, PlusOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';

// 组件
import FormSection from '../../components/FormSection';

// antd 6 不再从包根导出 CheckboxValueType，这里自行定义等价类型
type CheckboxValueType = string | number | boolean;
import VASSlider from '../../components/VASSlider';
import SymptomScoreCard from '../../components/SymptomScoreCard';
import RQLQForm from '../../components/RQLQForm';
import TCMScoreForm from '../../components/TCMScoreForm';
import VitalSignsForm from '../../components/VitalSignsForm';
import LabResultsForm from '../../components/LabResultsForm';
import VisitFormFooter from '../../components/VisitFormFooter';

// 数据 / 工具
import type { Patient, CurrentIllness, PriorTreatment } from '../../types/patient';
import type { VisitData } from '../../types/visit';
import { usePatient } from '../../utils/usePatient';
import { usePatientStore } from '../../store/PatientContext';
import { calcBMI } from '../../utils/scoring';
import { requiredRule, ageRule, nonNegativeRule, dateNotFuture } from '../../utils/validators';
import {
  ENVIRONMENT_EXPOSURE,
  DIET_HABIT,
  LIVING_ENVIRONMENT,
  CLIMATE,
  PERENNIAL_ALLERGEN,
  COMORBIDITIES,
  INCLUSION_CRITERIA,
  EXCLUSION_CRITERIA,
} from '../../mock/dictionaries';

const { Text } = Typography;

/** 结构化的评分对象在 Form 无值时回退为空对象，避免 reducer 写入 undefined */
const ensured = <T,>(v: unknown, fallback: T): T =>
  v === undefined || v === null ? fallback : (v as T);

/** 将完整 Form values 组装为可派发的 VisitData 载荷 */
function toVisitData(values: Record<string, any>, fallback: VisitData): Partial<VisitData> {
  return {
    visitDate: fallback?.visitDate || dayjs().format('YYYY-MM-DD'),
    vitalSigns: ensured(values.vital, fallback?.vitalSigns),
    vasScores: ensured(values.vas, fallback?.vasScores),
    symptomFourScale: ensured(values.four, fallback?.symptomFourScale),
    rqlqScores: ensured(values.rqlq, fallback?.rqlqScores),
    tcmScores: ensured(values.tcm, fallback?.tcmScores),
    // LabResultsForm value = { labBlood?, labUrine?, labBiochem?, feno?, ecg? }，直接展开
    ...(values.lab || {}),
  };
}

/** 把 Form values 中的人口学/病史/现病史等顶层字段组装为 Patient patch */
function toPatientPatch(
  values: Record<string, any>,
  screeningResult: 'pass' | 'fail',
): Partial<Patient> {
  return {
    demographics: ensured(values.d, {}) as Patient['demographics'],
    allergyHistory: ensured(values.allergy, {}) as Patient['allergyHistory'],
    respiratoryHistory: ensured(values.resp, {}) as Patient['respiratoryHistory'],
    familyHistory: ensured(values.family, {}) as Patient['familyHistory'],
    priorTreatment: ensured(values.prior, {}) as Patient['priorTreatment'],
    currentIllness: ensured(values.illness, {}) as Patient['currentIllness'],
    tcmFourExam: ensured(values.tcmExam, {}) as Patient['tcmFourExam'],
    consentDate: values.consentDate ? dayjs(values.consentDate).format('YYYY-MM-DD') : '',
    inclusionCriteria: Array.from(
      { length: INCLUSION_CRITERIA.length },
      (_: unknown, i: number) => values.inclusion?.[i] === true,
    ),
    exclusionCriteria: Array.from(
      { length: EXCLUSION_CRITERIA.length },
      (_: unknown, i: number) => values.exclusion?.[i] === true,
    ),
    screeningResult,
    screeningFailReason: values.screeningFailReason,
    dispensedCount: values.dispensedCount ?? 0,
    investigatorSignature: values.investigatorSignature,
    signatureDate: values.signatureDate ? dayjs(values.signatureDate).format('YYYY-MM-DD') : '',
  };
}

export default function VisitV1() {
  const { patient } = usePatient();
  const { dispatch } = usePatientStore();
  const [form] = Form.useForm();

  const visit = patient?.visits['V1'];
  const locked = visit?.status === 'submitted';
  const [saving, setSaving] = useState(false);

  /* ---------------- 初始化：把 patient / visit 值灌入 Form ---------------- */
  useEffect(() => {
    if (!patient || !visit) return;
    const d = patient.demographics;
    const init: Record<string, any> = {
      consentDate: patient.consentDate ? dayjs(patient.consentDate) : undefined,
      d: {
        gender: d.gender,
        age: d.age,
        household: d.household,
        weight: d.weight,
        height: d.height,
        bmi: d.bmi || calcBMI(d.weight, d.height),
        occupation: d.occupation,
        environmentExposure: d.environmentExposure ?? [],
        smokingHistory: d.smokingHistory,
        drinkingHistory: d.drinkingHistory,
        dietHabit: d.dietHabit ?? [],
        livingEnvironment: d.livingEnvironment ?? [],
        climate: d.climate ?? [],
      },
      vital: visit.vitalSigns,
      allergy: patient.allergyHistory,
      resp: patient.respiratoryHistory,
      family: patient.familyHistory,
      prior: patient.priorTreatment,
      illness: patient.currentIllness,
      tcmExam: patient.tcmFourExam,
      lab: {
        labBlood: visit.labBlood,
        labUrine: visit.labUrine,
        labBiochem: visit.labBiochem,
        feno: visit.feno,
        ecg: visit.ecg,
      },
      vas: visit.vasScores,
      four: visit.symptomFourScale,
      rqlq: visit.rqlqScores,
      tcm: visit.tcmScores,
      inclusion: patient.inclusionCriteria,
      exclusion: patient.exclusionCriteria,
      screening: patient.screeningResult,
      screeningFailReason: patient.screeningFailReason,
      dispensedCount: patient.dispensedCount,
      investigatorSignature: patient.investigatorSignature,
      signatureDate: patient.signatureDate ? dayjs(patient.signatureDate) : undefined,
    };
    form.setFieldsValue(init);
  }, [patient, visit, form]);

  /* ---------------- BMI 联动 ---------------- */
  const weight = Form.useWatch(['d', 'weight'], form);
  const height = Form.useWatch(['d', 'height'], form);
  useEffect(() => {
    form.setFieldValue(['d', 'bmi'], calcBMI(weight, height));
  }, [weight, height, form]);

  /* ---------------- 入选/排除 联动 → 基线判定 ---------------- */
  const inclusion = Form.useWatch('inclusion', form) as (boolean | undefined)[] | undefined;
  const exclusion = Form.useWatch('exclusion', form) as (boolean | undefined)[] | undefined;

  const { inclusionPass, exclusionPass, screeningPass } = useMemo(() => {
    const incArr: (boolean | undefined)[] = Array.from(
      { length: INCLUSION_CRITERIA.length },
      (_: unknown, i: number) => inclusion?.[i],
    );
    const excArr: (boolean | undefined)[] = Array.from(
      { length: EXCLUSION_CRITERIA.length },
      (_: unknown, i: number) => exclusion?.[i],
    );
    const inclusionPass = incArr.length === INCLUSION_CRITERIA.length && incArr.every((x) => x === true);
    const exclusionPass =
      excArr.length === EXCLUSION_CRITERIA.length && excArr.every((x) => x === false);
    return { inclusionPass, exclusionPass, screeningPass: inclusionPass && exclusionPass };
  }, [inclusion, exclusion]);

  /* ---------------- 环境暴露 / 合并疾病 "无" 互斥 ---------------- */
  const handleEnvChange = (next: CheckboxValueType[]) => {
    const arr = next.map(String);
    if (arr.includes('无')) form.setFieldValue(['d', 'environmentExposure'], ['无']);
    else form.setFieldValue(['d', 'environmentExposure'], arr);
  };
  const handleComorbidityChange = (next: CheckboxValueType[]) => {
    const arr = next.map(String);
    if (arr.includes('无')) form.setFieldValue(['illness', 'comorbidities'], ['无']);
    else form.setFieldValue(['illness', 'comorbidities'], arr);
  };

  /* ---------------- 嵌套对象状态（联动展开/收起）---------------- */
  const respHas = Form.useWatch(['resp', 'has'], form);
  const smkHas = Form.useWatch(['d', 'smokingHistory', 'has'], form);
  const drinkHas = Form.useWatch(['d', 'drinkingHistory', 'has'], form);
  const allergyHas = Form.useWatch(['allergy', 'has'], form);
  const familyHas = Form.useWatch(['family', 'has'], form);
  const priorHas = Form.useWatch(['prior', 'has'], form);
  const priorVal = Form.useWatch('prior', form) as PriorTreatment | undefined;
  const tcmHas = priorVal?.tcmHistory?.has;
  const immunoStatus = priorVal?.immunotherapy?.status;
  const illnessVal = Form.useWatch('illness', form) as CurrentIllness | undefined;
  const attackCycle = illnessVal?.attackCycle;
  const allergenDone = illnessVal?.allergenTest?.done;
  const triggerHas = illnessVal?.triggerFactors?.has;

  /* ---------------- 保存逻辑 ---------------- */
  const save = (status: 'draft' | 'submitted', needValidate: boolean) => {
    if (!patient) return;
    setSaving(true);
    const proceed = (values: Record<string, any>) => {
      const derived: 'pass' | 'fail' = screeningPass ? 'pass' : 'fail';
      dispatch({
        type: 'UPDATE_VISIT',
        payload: {
          patientId: patient.id,
          visitNo: 'V1',
          data: toVisitData(values, visit!),
          status,
        },
      });
      dispatch({
        type: 'UPDATE_PATIENT',
        payload: { patientId: patient.id, patch: toPatientPatch(values, derived) },
      });
      if (status === 'draft') {
        message.success('V1 草稿已暂存');
      }
      setSaving(false);
    };

    if (!needValidate) {
      proceed(form.getFieldsValue());
      return;
    }
    // 提交：校验通过才提交并锁定；校验失败则提示并停留在可编辑状态（不锁空表）
    form
      .validateFields()
      .then((values) => {
        if (!screeningPass) message.warning('入选/排除标准未全通过，已判定为筛选失败并保存');
        message.success('V1 已提交');
        proceed(values);
      })
      .catch(() => {
        message.error('存在未填写或填写不完整的必填项，请补齐后再提交');
        setSaving(false);
      });
  };

  if (!patient || !visit) return null;

  return (
    <Form form={form} layout="vertical" disabled={locked} requiredMark="optional">
      {/* ============ A 知情同意 ============ */}
      <FormSection title="A 知情同意" required defaultActive>
        <Form.Item name="consentDate" label="知情同意签署日期" rules={[requiredRule, dateNotFuture()]}>
          <DatePicker style={{ width: '100%' }} format="YYYY-MM-DD" allowClear={false} />
        </Form.Item>
      </FormSection>

      {/* ============ B 人口学资料 ============ */}
      <FormSection title="B 人口学资料" required>
        <Space direction="vertical" size={2} style={{ width: '100%' }}>
          <Space size={24} wrap>
            <Form.Item name={['d', 'gender']} label="性别" rules={[requiredRule]}>
              <Radio.Group
                options={[
                  { label: '男', value: '男' },
                  { label: '女', value: '女' },
                ]}
              />
            </Form.Item>
            <Form.Item name={['d', 'age']} label="年龄（岁）" rules={[requiredRule, ageRule()]}>
              <InputNumber min={0} style={{ width: 120 }} addonAfter="岁" />
            </Form.Item>
            <Form.Item name={['d', 'household']} label="户籍" rules={[requiredRule]}>
              <Input placeholder="请输入户籍" style={{ width: 200 }} />
            </Form.Item>
          </Space>
          <Space size={24} wrap>
            <Form.Item name={['d', 'weight']} label="体重" rules={[requiredRule, nonNegativeRule()]}>
              <InputNumber min={0} precision={1} style={{ width: 140 }} addonAfter="kg" />
            </Form.Item>
            <Form.Item name={['d', 'height']} label="身高" rules={[requiredRule, nonNegativeRule()]}>
              <InputNumber min={0} precision={1} style={{ width: 140 }} addonAfter="cm" />
            </Form.Item>
            <Form.Item name={['d', 'bmi']} label="BMI（自动计算）">
              <InputNumber disabled style={{ width: 140 }} />
            </Form.Item>
          </Space>
          <Space size={24} wrap align="start">
            <Form.Item name={['d', 'occupation']} label="职业" rules={[requiredRule]}>
              <Input placeholder="请输入职业" style={{ width: 200 }} />
            </Form.Item>
            <Form.Item
              name={['d', 'environmentExposure']}
              label="环境暴露（多选，选‘无’则互斥）"
              initialValue={[]}
            >
              <Checkbox.Group options={ENVIRONMENT_EXPOSURE as unknown as string[]} onChange={handleEnvChange} />
            </Form.Item>
          </Space>

          <Divider titlePlacement="start" plain style={{ fontSize: 13 }}>吸烟史</Divider>
          <Form.Item name={['d', 'smokingHistory', 'has']} label="有无吸烟史" initialValue={false}>
            <Radio.Group
              options={[
                { label: '无', value: false },
                { label: '有', value: true },
              ]}
            />
          </Form.Item>
          {smkHas && (
            <Space size={24} wrap>
              <Form.Item name={['d', 'smokingHistory', 'years']} label="烟龄（年）" rules={[nonNegativeRule()]}>
                <InputNumber min={0} style={{ width: 120 }} addonAfter="年" />
              </Form.Item>
              <Form.Item name={['d', 'smokingHistory', 'packsPerDay']} label="每日包数" rules={[nonNegativeRule()]}>
                <InputNumber min={0} style={{ width: 120 }} addonAfter="包/日" />
              </Form.Item>
              <Form.Item name={['d', 'smokingHistory', 'quitYears']} label="戒烟年数" rules={[nonNegativeRule()]}>
                <InputNumber min={0} style={{ width: 120 }} addonAfter="年" />
              </Form.Item>
            </Space>
          )}

          <Divider titlePlacement="start" plain style={{ fontSize: 13 }}>饮酒史</Divider>
          <Form.Item name={['d', 'drinkingHistory', 'has']} label="有无饮酒史" initialValue={false}>
            <Radio.Group
              options={[
                { label: '无', value: false },
                { label: '有', value: true },
              ]}
            />
          </Form.Item>
          {drinkHas && (
            <Space size={24} wrap>
              <Form.Item name={['d', 'drinkingHistory', 'years']} label="酒龄（年）" rules={[nonNegativeRule()]}>
                <InputNumber min={0} style={{ width: 120 }} addonAfter="年" />
              </Form.Item>
              <Form.Item name={['d', 'drinkingHistory', 'mlPerDay']} label="每日饮酒量" rules={[nonNegativeRule()]}>
                <InputNumber min={0} style={{ width: 140 }} addonAfter="ml/日" />
              </Form.Item>
              <Form.Item name={['d', 'drinkingHistory', 'quitYears']} label="戒酒年数" rules={[nonNegativeRule()]}>
                <InputNumber min={0} style={{ width: 120 }} addonAfter="年" />
              </Form.Item>
            </Space>
          )}

          <Space size={24} wrap align="start">
            <Form.Item name={['d', 'dietHabit']} label="饮食习惯" initialValue={[]}>
              <Checkbox.Group options={DIET_HABIT as unknown as string[]} />
            </Form.Item>
            <Form.Item name={['d', 'livingEnvironment']} label="居住环境" initialValue={[]}>
              <Checkbox.Group options={LIVING_ENVIRONMENT as unknown as string[]} />
            </Form.Item>
            <Form.Item name={['d', 'climate']} label="居住地气候" initialValue={[]}>
              <Checkbox.Group options={CLIMATE as unknown as string[]} />
            </Form.Item>
          </Space>
        </Space>
      </FormSection>

      {/* ============ C 生命体征 ============ */}
      <FormSection title="C 生命体征" required>
        <Form.Item name="vital" style={{ marginBottom: 0 }}>
          <VitalSignsForm />
        </Form.Item>
      </FormSection>

      {/* ============ D 过敏史 ============ */}
      <FormSection title="D 过敏史">
        <Form.Item name={['allergy', 'has']} label="有无过敏史" initialValue={false}>
          <Radio.Group
            options={[
              { label: '无', value: false },
              { label: '有', value: true },
            ]}
          />
        </Form.Item>
        {allergyHas && (
          <Space direction="vertical" style={{ width: '100%' }} size={4}>
            <Form.Item name={['allergy', 'drugAllergy']} label="药物过敏">
              <Input placeholder="请输入药物过敏详情" />
            </Form.Item>
            <Form.Item name={['allergy', 'nonDrugAllergy']} label="非药物过敏">
              <Input placeholder="请输入非药物过敏详情" />
            </Form.Item>
          </Space>
        )}
      </FormSection>

      {/* ============ E 既往呼吸系统疾病 ============ */}
      <FormSection title="E 既往呼吸系统疾病">
        <Form.Item name={['resp', 'has']} label="有无既往呼吸系统疾病" initialValue={false}>
          <Radio.Group
            options={[
              { label: '无', value: false },
              { label: '有', value: true },
            ]}
          />
        </Form.Item>
        {respHas && (
          <Form.List name={['resp', 'records']}>
            {(fields, { add, remove }) => (
              <Space direction="vertical" style={{ width: '100%' }} size={12}>
                {fields.map((field) => (
                  <div key={field.key} style={{ border: '1px solid #f0f0f0', borderRadius: 8, padding: 12 }}>
                    <Space size={16} wrap align="start">
                      <Form.Item name={[field.name, 'diseaseName']} label="疾病名称" rules={[requiredRule]} style={{ marginBottom: 8 }}>
                        <Input placeholder="请输入疾病名称" style={{ width: 180 }} />
                      </Form.Item>
                      <Form.Item name={[field.name, 'diagnosisDate']} label="确诊日期" rules={[dateNotFuture()]} style={{ marginBottom: 8 }}>
                        <DatePicker format="YYYY-MM-DD" allowClear={false} />
                      </Form.Item>
                      <Form.Item name={[field.name, 'isOngoing']} label="是否持续" initialValue={true} style={{ marginBottom: 8 }}>
                        <Radio.Group
                          options={[
                            { label: '已愈', value: false },
                            { label: '持续', value: true },
                          ]}
                        />
                      </Form.Item>
                    </Space>
                    {/* 结束日期：仅当是否持续 = 否 时展示 */}
                    <EndDateRow form={form} index={field.name} />
                    <Button
                      type="text"
                      danger
                      size="small"
                      icon={<MinusCircleOutlined />}
                      onClick={() => remove(field.name)}
                    >
                      删除该记录
                    </Button>
                  </div>
                ))}
                <Button type="dashed" onClick={() => add({ isOngoing: true })} icon={<PlusOutlined />} block>
                  添加疾病记录（最多 6 条）
                </Button>
              </Space>
            )}
          </Form.List>
        )}
      </FormSection>

      {/* ============ F 家族史 ============ */}
      <FormSection title="F 家族史">
        <Form.Item name={['family', 'has']} label="有无家族史" initialValue={false}>
          <Radio.Group
            options={[
              { label: '无', value: false },
              { label: '有', value: true },
            ]}
          />
        </Form.Item>
        {familyHas && (
          <Form.Item name={['family', 'detail']} label="家族史详情">
            <Input.TextArea rows={2} placeholder="请输入家族史详情" />
          </Form.Item>
        )}
      </FormSection>

      {/* ============ G 既往治疗史 ============ */}
      <FormSection title="G 既往治疗史">
        <Form.Item name={['prior', 'has']} label="有无既往治疗史" initialValue={false}>
          <Radio.Group
            options={[
              { label: '无', value: false },
              { label: '有', value: true },
            ]}
          />
        </Form.Item>
        {priorHas && (
          <>
            <Divider titlePlacement="start" plain style={{ fontSize: 13 }}>中药使用史</Divider>
            <Form.Item name={['prior', 'tcmHistory', 'has']} label="是否曾用中药治疗" initialValue={false}>
              <Radio.Group
                options={[
                  { label: '否', value: false },
                  { label: '是', value: true },
                ]}
              />
            </Form.Item>
            {tcmHas && (
              <Space size={24} wrap align="start">
                <Form.Item name={['prior', 'tcmHistory', 'formulaName']} label="方剂名称">
                  <Input placeholder="请输入方剂名" style={{ width: 180 }} />
                </Form.Item>
                <Form.Item name={['prior', 'tcmHistory', 'course']} label="疗程">
                  <Input placeholder="例如：4 周" style={{ width: 140 }} />
                </Form.Item>
                <Form.Item name={['prior', 'tcmHistory', 'efficacy']} label="疗效">
                  <Radio.Group
                    options={[
                      { label: '好', value: '好' },
                      { label: '一般', value: '一般' },
                      { label: '差', value: '差' },
                    ]}
                  />
                </Form.Item>
              </Space>
            )}

            <Divider titlePlacement="start" plain style={{ fontSize: 13 }}>过敏原免疫治疗</Divider>
            <Form.Item name={['prior', 'immunotherapy', 'status']} label="过敏原免疫治疗" initialValue="未接受">
              <Radio.Group
                options={['未接受', '接受中', '已完成'].map((s) => ({ label: s, value: s }))}
              />
            </Form.Item>
            {immunoStatus && immunoStatus !== '未接受' && (
              <Space size={24} wrap align="start">
                <Form.Item name={['prior', 'immunotherapy', 'course']} label="疗程">
                  <Input placeholder="例如：3 年" style={{ width: 140 }} />
                </Form.Item>
                <Form.Item name={['prior', 'immunotherapy', 'endTime']} label="结束时间">
                  <DatePicker format="YYYY-MM-DD" allowClear={false} />
                </Form.Item>
                <Form.Item name={['prior', 'immunotherapy', 'efficacy']} label="疗效">
                  <Radio.Group
                    options={[
                      { label: '好', value: '好' },
                      { label: '一般', value: '一般' },
                      { label: '差', value: '差' },
                    ]}
                  />
                </Form.Item>
              </Space>
            )}

            <Divider titlePlacement="start" plain style={{ fontSize: 13 }}>当前用药</Divider>
            <Form.List name={['prior', 'currentMedications']}>
              {(fields, { add, remove }) => (
                <Space direction="vertical" style={{ width: '100%' }} size={12}>
                  {fields.map((field) => (
                    <div key={field.key} style={{ border: '1px solid #f0f0f0', borderRadius: 8, padding: 12 }}>
                      <Space size={16} wrap align="start">
                        <Form.Item name={[field.name, 'drugName']} label="药物名称" rules={[requiredRule]} style={{ marginBottom: 8 }}>
                          <Input placeholder="药物名称" style={{ width: 150 }} />
                        </Form.Item>
                        <Form.Item name={[field.name, 'dailyDose']} label="日剂量" style={{ marginBottom: 8 }}>
                          <Input style={{ width: 110 }} />
                        </Form.Item>
                        <Form.Item name={[field.name, 'unit']} label="单位" style={{ marginBottom: 8 }}>
                          <Input placeholder="如 mg" style={{ width: 90 }} />
                        </Form.Item>
                        <Form.Item name={[field.name, 'route']} label="给药途径" style={{ marginBottom: 8 }}>
                          <Input placeholder="如口服" style={{ width: 100 }} />
                        </Form.Item>
                        <Form.Item name={[field.name, 'startDate']} label="开始日期" style={{ marginBottom: 8 }}>
                          <DatePicker format="YYYY-MM-DD" allowClear={false} />
                        </Form.Item>
                        <Form.Item name={[field.name, 'isOngoing']} label="是否持续" initialValue={true} style={{ marginBottom: 8 }}>
                          <Radio.Group
                            options={[
                              { label: '已停', value: false },
                              { label: '持续', value: true },
                            ]}
                          />
                        </Form.Item>
                      </Space>
                      <MedEndDateRow form={form} index={field.name} />
                      <Button type="text" danger size="small" icon={<MinusCircleOutlined />} onClick={() => remove(field.name)}>
                        删除该用药
                      </Button>
                    </div>
                  ))}
                  <Button type="dashed" onClick={() => add({ isOngoing: true })} icon={<PlusOutlined />} block>
                    添加当前用药
                  </Button>
                </Space>
              )}
            </Form.List>
          </>
        )}
      </FormSection>

      {/* ============ H 现病史 ============ */}
      <FormSection title="H 现病史" required>
        <Space direction="vertical" style={{ width: '100%' }} size={2}>
          <Form.Item name={['illness', 'diagnosisDate']} label="确诊时间" rules={[requiredRule, dateNotFuture()]}>
            <DatePicker style={{ width: 220 }} format="YYYY-MM-DD" allowClear={false} />
          </Form.Item>
          <Form.Item name={['illness', 'attackCycle']} label="发作周期" rules={[requiredRule]}>
            <Radio.Group
              options={[
                { label: '常年性', value: '常年性' },
                { label: '季节性', value: '季节性' },
              ]}
            />
          </Form.Item>
          {attackCycle === '常年性' && (
            <Form.Item name={['illness', 'perennialAllergen']} label="常年性过敏原" initialValue={[]}>
              <Checkbox.Group options={PERENNIAL_ALLERGEN as unknown as string[]} />
            </Form.Item>
          )}
          {attackCycle === '季节性' && (
            <Space size={24} wrap align="start">
              <Form.Item name={['illness', 'seasonalSeason']} label="季节">
                <Input placeholder="如：春季" style={{ width: 140 }} />
              </Form.Item>
              <Form.Item name={['illness', 'seasonalAllergen']} label="季节过敏原">
                <Input placeholder="如：花粉" style={{ width: 140 }} />
              </Form.Item>
            </Space>
          )}
          <Form.Item name={['illness', 'comorbidities']} label="合并疾病（多选，选‘无’则互斥）" initialValue={[]}>
            <Checkbox.Group options={COMORBIDITIES as unknown as string[]} onChange={handleComorbidityChange} />
          </Form.Item>

          <Divider titlePlacement="start" plain style={{ fontSize: 13 }}>过敏原检测</Divider>
          <Form.Item name={['illness', 'allergenTest', 'done']} label="是否做过过敏原检测" initialValue={false}>
            <Radio.Group
              options={[
                { label: '否', value: false },
                { label: '是', value: true },
              ]}
            />
          </Form.Item>
          {allergenDone && (
            <Space size={24} wrap align="start">
              <Form.Item name={['illness', 'allergenTest', 'testDate']} label="检测日期" rules={[dateNotFuture()]}>
                <DatePicker format="YYYY-MM-DD" allowClear={false} />
              </Form.Item>
              <Form.Item name={['illness', 'allergenTest', 'totalIgE']} label="总IgE (IU/mL)" rules={[nonNegativeRule()]}>
                <InputNumber min={0} style={{ width: 130 }} />
              </Form.Item>
              <Form.Item name={['illness', 'allergenTest', 'skinPrickPositive']} label="皮肤点刺">
                <Radio.Group
                  options={[
                    { label: '阴性', value: false },
                    { label: '阳性', value: true },
                  ]}
                />
              </Form.Item>
              <Form.Item name={['illness', 'allergenTest', 'serumIgE']} label="血清特异性IgE" rules={[nonNegativeRule()]}>
                <InputNumber min={0} style={{ width: 130 }} />
              </Form.Item>
              <Form.Item name={['illness', 'allergenTest', 'nasalChallengePositive']} label="鼻内激发">
                <Radio.Group
                  options={[
                    { label: '阴性', value: false },
                    { label: '阳性', value: true },
                  ]}
                />
              </Form.Item>
            </Space>
          )}

          <Form.Item name={['illness', 'triggerFactors', 'has']} label="有无诱发因素" initialValue={false}>
            <Radio.Group
              options={[
                { label: '无', value: false },
                { label: '有', value: true },
              ]}
            />
          </Form.Item>
          {triggerHas && (
            <Form.Item name={['illness', 'triggerFactors', 'detail']} label="诱发因素详情">
              <Input.TextArea rows={2} placeholder="请输入诱发因素详情" />
            </Form.Item>
          )}
        </Space>
      </FormSection>

      {/* ============ I 中医四诊 ============ */}
      <FormSection title="I 中医四诊">
        <Space size={24} wrap align="start">
          <Form.Item name={['tcmExam', 'nasalMucosa']} label="鼻黏膜">
            <Radio.Group options={[{ label: '淡白肿胀', value: '淡白肿胀' }, { label: '红肿充血', value: '红肿充血' }]} />
          </Form.Item>
          <Form.Item name={['tcmExam', 'nasalDischarge']} label="涕质">
            <Radio.Group options={[{ label: '清稀如水', value: '清稀如水' }, { label: '黄黏成缕', value: '黄黏成缕' }]} />
          </Form.Item>
          <Form.Item name={['tcmExam', 'tongueBody']} label="舌质">
            <Radio.Group options={[{ label: '淡红', value: '淡红' }, { label: '淡白', value: '淡白' }, { label: '红赤', value: '红赤' }]} />
          </Form.Item>
        </Space>
        <Space size={24} wrap align="start">
          <Form.Item name={['tcmExam', 'tongueCoating']} label="舌苔">
            <Radio.Group options={[{ label: '薄白', value: '薄白' }, { label: '薄黄', value: '薄黄' }]} />
          </Form.Item>
          <Form.Item name={['tcmExam', 'throat']} label="咽喉">
            <Radio.Group options={[{ label: '咽壁淡红、不肿', value: '咽壁淡红、不肿' }, { label: '咽峡充血、微肿', value: '咽峡充血、微肿' }]} />
          </Form.Item>
          <Form.Item name={['tcmExam', 'sneeze']} label="喷嚏">
            <Radio.Group options={[{ label: '低频有力', value: '低频有力' }, { label: '高频短促', value: '高频短促' }]} />
          </Form.Item>
        </Space>
        <Space size={24} wrap align="start">
          <Form.Item name={['tcmExam', 'worseCondition']} label="症状加重">
            <Radio.Group options={[{ label: '遇冷', value: '遇冷' }, { label: '遇热', value: '遇热' }, { label: '无', value: '无' }]} />
          </Form.Item>
          <Form.Item name={['tcmExam', 'stool']} label="大便">
            <Radio.Group options={[{ label: '溏', value: '溏' }, { label: '干', value: '干' }, { label: '正常', value: '正常' }]} />
          </Form.Item>
          <Form.Item name={['tcmExam', 'urine']} label="小便">
            <Radio.Group options={[{ label: '清', value: '清' }, { label: '黄赤', value: '黄赤' }]} />
          </Form.Item>
          <Form.Item name={['tcmExam', 'pulse']} label="脉象">
            <Radio.Group options={[{ label: '浮紧', value: '浮紧' }, { label: '浮缓', value: '浮缓' }, { label: '浮数', value: '浮数' }]} />
          </Form.Item>
        </Space>
      </FormSection>

      {/* ============ J 实验室检查 ============ */}
      <FormSection title="J 实验室检查" required>
        <Form.Item name="lab" style={{ marginBottom: 0 }}>
          <LabResultsForm modules={['blood', 'urine', 'biochem', 'feno', 'ecg']} />
        </Form.Item>
      </FormSection>

      {/* ============ K VAS 评分 ============ */}
      <FormSection title="K VAS 评分" required>
        <Form.Item name="vas" style={{ marginBottom: 0 }}>
          <VASSlider />
        </Form.Item>
      </FormSection>

      {/* ============ L 四分法鼻眼症状评分 ============ */}
      <FormSection title="L 四分法鼻眼症状评分" required>
        <Form.Item name="four" style={{ marginBottom: 0 }}>
          <SymptomScoreCard />
        </Form.Item>
      </FormSection>

      {/* ============ M RQLQ 问卷 ============ */}
      <FormSection title="M RQLQ 问卷" required>
        <Form.Item name="rqlq" style={{ marginBottom: 0 }}>
          <RQLQForm />
        </Form.Item>
      </FormSection>

      {/* ============ N 中医证候评分 ============ */}
      <FormSection title="N 中医证候评分" required>
        <Form.Item name="tcm" style={{ marginBottom: 0 }}>
          <TCMScoreForm />
        </Form.Item>
      </FormSection>

      {/* ============ O 入选标准 ============ */}
      <FormSection title="O 入选标准（6 项均选“是”）" required>
        {INCLUSION_CRITERIA.map((c, i) => (
          <Form.Item key={c} name={['inclusion', i]} label={`${i + 1}. ${c}`}>
            <Radio.Group
              options={[
                { label: '是', value: true },
                { label: '否', value: false },
              ]}
            />
          </Form.Item>
        ))}
        <Alert
          type={inclusionPass ? 'success' : 'error'}
          showIcon
          message={inclusionPass ? '符合入选标准' : '不符合入选标准（存在“否”或未填写项）'}
        />
      </FormSection>

      {/* ============ P 排除标准 ============ */}
      <FormSection title="P 排除标准（11 项均选“否”）" required>
        {EXCLUSION_CRITERIA.map((c, i) => (
          <Form.Item key={c} name={['exclusion', i]} label={`${i + 1}. ${c}`}>
            <Radio.Group
              options={[
                { label: '是', value: true },
                { label: '否', value: false },
              ]}
            />
          </Form.Item>
        ))}
        <Alert
          type={exclusionPass ? 'success' : 'error'}
          showIcon
          message={exclusionPass ? '未触及排除标准' : '已触及排除标准（存在“是”或未填写项）'}
        />
      </FormSection>

      {/* ============ Q 基线判定 ============ */}
      <FormSection title="Q 基线判定" required>
        {screeningPass ? (
          <Alert type="success" showIcon description="所有入选标准均满足，且未触及任何排除标准。" message="最终筛选成功" />
        ) : (
          <>
            <Alert type="error" showIcon description="请核对入选/排除标准。" message="最终筛选失败" />
            <Form.Item name="screeningFailReason" label="筛选失败原因" style={{ marginTop: 12 }}>
              <Input.TextArea rows={2} placeholder="请填写筛选失败的原因" />
            </Form.Item>
          </>
        )}
      </FormSection>

      {/* ============ R 发放研究药物 ============ */}
      <FormSection title="R 发放研究药物" defaultActive>
        <Space size={24} wrap align="start">
          <Form.Item name="dispensedCount" label="研究药物支数" rules={[requiredRule, nonNegativeRule()]}>
            <InputNumber min={0} style={{ width: 140 }} addonAfter="支" />
          </Form.Item>
          <Form.Item name="investigatorSignature" label="负责医师签字" rules={[requiredRule]}>
            <Input placeholder="请输入医师签字" style={{ width: 200 }} />
          </Form.Item>
          <Form.Item name="signatureDate" label="签字日期" rules={[requiredRule, dateNotFuture()]}>
            <DatePicker format="YYYY-MM-DD" allowClear={false} />
          </Form.Item>
        </Space>
      </FormSection>

      {/* ============ 底部操作栏 ============ */}
      {!locked && (
        <VisitFormFooter
          submitting={saving}
          onSave={() => save('draft', false)}
          onSubmit={() => save('submitted', true)}
        />
      )}
      {locked && (
        <div style={{ textAlign: 'center', color: '#999', padding: 8, borderTop: '1px dashed #e5e5e5' }}>
          <Text type="secondary">该访视已提交并锁定，如需修改请联系管理员。</Text>
        </div>
      )}
    </Form>
  );
}

/**
 * EndDateRow — 既往呼吸疾病记录行的“结束日期”，仅当 是否持续 = 否 时展示。
 * Form.List 内用一个“隐藏的 isOngoing 值”做不到完美监听，这里改为直接监听同一 namePath。
 */
function EndDateRow({ form, index }: { form: any; index: number }) {
  const ongoing = Form.useWatch(['resp', 'records', index, 'isOngoing'], form);
  if (ongoing !== false) return null;
  return (
    <Form.Item name={['resp', 'records', index, 'endDate']} label="结束日期" rules={[dateNotFuture()]}>
      <DatePicker format="YYYY-MM-DD" allowClear={false} />
    </Form.Item>
  );
}

/**
 * MedEndDateRow — 当前用药行的“结束日期”，仅当 是否持续 = 否 时展示。
 */
function MedEndDateRow({ form, index }: { form: any; index: number }) {
  const ongoing = Form.useWatch(['prior', 'currentMedications', index, 'isOngoing'], form);
  if (ongoing !== false) return null;
  return (
    <Form.Item name={['prior', 'currentMedications', index, 'endDate']} label="结束日期" rules={[dateNotFuture()]}>
      <DatePicker format="YYYY-MM-DD" allowClear={false} />
    </Form.Item>
  );
}
