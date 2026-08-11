/**
 * LabResultsForm — 实验室检查表单 (plan.md §6.8, §5.4 模块J, §5.7 V4 血清总IgE)
 *
 * 受控组件：对外暴露 { value, onChange, disabled? } + modules 决定显示哪些子模块。
 * value 形如 { labBlood?, labUrine?, labBiochem?, feno?, ecg?, serumIgE? }。
 * 每改一个字段，用函数式更新构造完整子模块对象并 onChange 回传合并后的整个 value。
 */
import { useMemo } from 'react';
import {
  DatePicker,
  Form,
  Input,
  InputNumber,
  Radio,
  Select,
  Space,
  Switch,
  Typography,
} from 'antd';
import dayjs, { type Dayjs } from 'dayjs';
import type { LabResultsFormProps, LabModule } from './componentTypes';
import FormSection from './FormSection';
import type {
  LabStatus,
  LabItem,
  LabBloodRoutine,
  LabUrinalysis,
  LabBiochemistry,
  FeNO,
  ECG,
  SerumIgE,
} from '../types/visit';

const { Text } = Typography;

/** 结果判定四值 (LabStatus) */
const STATUS_OPTIONS: { label: string; value: LabStatus }[] = [
  { label: '未查', value: 'not_done' },
  { label: '正常', value: 'normal' },
  { label: '异常无临床意义', value: 'abnormal_no_significance' },
  { label: '异常有临床意义', value: 'abnormal_significant' },
];

/** 定性半定量三选项（蛋白/糖/酮体） */
const SENTI_OPTIONS = ['-', '±', '+', '++', '+++'];
const GLUCOSE_OPTIONS = [...SENTI_OPTIONS, '≥+++'];

/** 潜血/白细胞二值 */
const NEG_POS_OPTIONS = ['阴性', '阳性'];

const emptyBase = {};

function defaultItem(value: string): LabItem<string> {
  return { value, status: 'not_done' };
}

function defaultNumItem(): LabItem<number | null> {
  return { value: null, status: 'not_done' };
}

function defaultBlood(): LabBloodRoutine {
  return {
    sampleDate: '',
    hb: { ...defaultNumItem(), unit: 'g/L' },
    rbc: { ...defaultNumItem(), unit: '10^12/L' },
    wbc: { ...defaultNumItem(), unit: '10^9/L' },
    neu: { ...defaultNumItem(), unit: '10^9/L' },
    eos: { ...defaultNumItem(), unit: '10^9/L' },
    bas: { ...defaultNumItem(), unit: '10^9/L' },
    lym: { ...defaultNumItem(), unit: '10^9/L' },
    plt: { ...defaultNumItem(), unit: '10^9/L' },
  };
}

function defaultUrine(): LabUrinalysis {
  return {
    sampleDate: '',
    protein: defaultItem('-'),
    glucose: defaultItem('-'),
    ketone: defaultItem('-'),
    occultBlood: defaultItem('阴性'),
    leukocyte: defaultItem('阴性'),
  };
}

function defaultBiochem(): LabBiochemistry {
  return {
    sampleDate: '',
    alt: { ...defaultNumItem(), unit: 'U/L' },
    ast: { ...defaultNumItem(), unit: 'U/L' },
    bun: { ...defaultNumItem(), unit: 'mmol/L' },
    cr: { ...defaultNumItem(), unit: 'μmol/L' },
  };
}

const defaultFeno = (): FeNO => ({
  done: false,
});
const defaultEcg = (): ECG => ({ done: false });
const defaultIge = (): SerumIgE => ({ done: false });

/** 各子模块的必填最小结构（value 相关项为 undefined 时用于初始化） */
const MODULE_DEFAULT: Record<LabModule, () => any> = {
  blood: defaultBlood,
  urine: defaultUrine,
  biochem: defaultBiochem,
  feno: defaultFeno,
  ecg: defaultEcg,
  ige: defaultIge,
};

/** value 里各子模块对应的 key */
const VALUE_KEY: Record<LabModule, string> = {
  blood: 'labBlood',
  urine: 'labUrine',
  biochem: 'labBiochem',
  feno: 'feno',
  ecg: 'ecg',
  ige: 'serumIgE',
};

/** 血常规项目：label, 字段名, 单位 */
const BLOOD_FIELDS: { label: string; key: keyof LabBloodRoutine; unit: string }[] = [
  { label: '血红蛋白 (Hb)', key: 'hb', unit: 'g/L' },
  { label: '红细胞计数 (RBC)', key: 'rbc', unit: '10^12/L' },
  { label: '白细胞计数 (WBC)', key: 'wbc', unit: '10^9/L' },
  { label: '中性粒细胞 (Neu)', key: 'neu', unit: '10^9/L' },
  { label: '嗜酸性粒细胞 (Eos)', key: 'eos', unit: '10^9/L' },
  { label: '嗜碱性粒细胞 (Bas)', key: 'bas', unit: '10^9/L' },
  { label: '淋巴细胞 (Lym)', key: 'lym', unit: '10^9/L' },
  { label: '血小板 (Plt)', key: 'plt', unit: '10^9/L' },
];

/** 血生化项目 */
const BIOCHEM_FIELDS: { label: string; key: keyof LabBiochemistry; unit: string }[] = [
  { label: '丙氨酸氨基转移酶 (ALT)', key: 'alt', unit: 'U/L' },
  { label: '天冬氨酸氨基转移酶 (AST)', key: 'ast', unit: 'U/L' },
  { label: '尿素氮 (BUN)', key: 'bun', unit: 'mmol/L' },
  { label: '肌酐 (Cr)', key: 'cr', unit: 'μmol/L' },
];

export default function LabResultsForm({ value, onChange, disabled, modules }: LabResultsFormProps) {
  /** 组装当前完整 value（含懒初始化被显示子模块的最小结构） */
  const fullValue = useMemo(() => {
    const out: Record<string, any> = { ...(value ?? emptyBase) };
    for (const m of modules) {
      const k = VALUE_KEY[m];
      if (out[k] == null) out[k] = MODULE_DEFAULT[m]();
    }
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, modules.join(',')]);

  /** 更新某个子模块并 onChange 回传合并后的完整 value */
  function patch(module: LabModule, patchFn: (m: any) => any) {
    const k = VALUE_KEY[module];
    onChange?.({
      ...(value ?? {}),
      [k]: patchFn(fullValue[k]),
    });
  }

  function updateItem(module: LabModule, field: string, item: LabItem<any>) {
    patch(module, (m) => ({ ...m, [field]: item }));
  }

  const dateProps = {
    allowClear: false,
    format: 'YYYY-MM-DD',
    style: { width: '100%' },
  };

  function renderSampleRow(node: React.ReactNode) {
    return (
      <Form.Item label="采样日期" style={{ maxWidth: 320, marginBottom: 16 }}>
        {node}
      </Form.Item>
    );
  }

  return (
    <div>
      {modules.includes('blood') && (
        <FormSection title="血常规" defaultActive>
          {(() => {
            const m = fullValue.labBlood as LabBloodRoutine;
            return (
              <Space direction="vertical" style={{ width: '100%' }} size={4}>
                {renderSampleRow(
                  <DatePicker
                    {...dateProps}
                    value={m.sampleDate ? dayjs(m.sampleDate) : null}
                    disabled={disabled}
                    onChange={(d: Dayjs | null) =>
                      patch('blood', (mm) => ({ ...mm, sampleDate: d ? d.format('YYYY-MM-DD') : '' }))
                    }
                  />,
                )}
                {BLOOD_FIELDS.map(({ label, key, unit }) => (
                  <div
                    key={key}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'minmax(220px, 1fr) 140px 120px 1fr',
                      gap: 12,
                      alignItems: 'center',
                      padding: '6px 0',
                    }}
                  >
                    <Text>{label}</Text>
                    <InputNumber
                      placeholder="实测值"
                      min={0}
                      style={{ width: '100%' }}
                      value={(m[key] as LabItem<number | null>).value}
                      disabled={disabled}
                      onChange={(v: number | null) =>
                        updateItem('blood', key, {
                          ...(m[key] as LabItem<number | null>),
                          value: v ?? null,
                        })
                      }
                    />
                    <Text type="secondary">{unit}</Text>
                    <Select
                      placeholder="结果判定"
                      options={STATUS_OPTIONS}
                      value={(m[key] as LabItem<number | null>).status}
                      disabled={disabled}
                      onChange={(s: LabStatus) =>
                        updateItem('blood', key, {
                          ...(m[key] as LabItem<number | null>),
                          status: s,
                        })
                      }
                    />
                  </div>
                ))}
              </Space>
            );
          })()}
        </FormSection>
      )}

      {modules.includes('urine') && (
        <FormSection title="尿常规">
          {(() => {
            const m = fullValue.labUrine as LabUrinalysis;
            const semiFields: { label: string; key: keyof LabUrinalysis; opts: string[] }[] = [
              { label: '蛋白 (PRO)', key: 'protein', opts: SENTI_OPTIONS },
              { label: '葡萄糖 (GLU)', key: 'glucose', opts: GLUCOSE_OPTIONS },
              { label: '酮体 (KET)', key: 'ketone', opts: SENTI_OPTIONS },
              { label: '潜血 (BLD)', key: 'occultBlood', opts: NEG_POS_OPTIONS },
              { label: '白细胞 (LEU)', key: 'leukocyte', opts: NEG_POS_OPTIONS },
            ];
            return (
              <Space direction="vertical" style={{ width: '100%' }} size={12}>
                {renderSampleRow(
                  <DatePicker
                    {...dateProps}
                    value={m.sampleDate ? dayjs(m.sampleDate) : null}
                    disabled={disabled}
                    onChange={(d: Dayjs | null) =>
                      patch('urine', (mm) => ({ ...mm, sampleDate: d ? d.format('YYYY-MM-DD') : '' }))
                    }
                  />,
                )}
                {semiFields.map(({ label, key, opts }) => (
                  <Form.Item label={label} key={key} style={{ marginBottom: 0 }}>
                    <Space style={{ width: '100%', justifyContent: 'space-between' }} align="center">
                      <Radio.Group
                        options={opts}
                        value={(m[key] as LabItem<string>).value}
                        disabled={disabled}
                        onChange={(e) =>
                          updateItem('urine', key, {
                            ...(m[key] as LabItem<string>),
                            value: e.target.value as string,
                          })
                        }
                      />
                      <Select
                        placeholder="结果判定"
                        style={{ width: 200 }}
                        options={STATUS_OPTIONS}
                        value={(m[key] as LabItem<string>).status}
                        disabled={disabled}
                        onChange={(s: LabStatus) =>
                          updateItem('urine', key, {
                            ...(m[key] as LabItem<string>),
                            status: s,
                          })
                        }
                      />
                    </Space>
                  </Form.Item>
                ))}
              </Space>
            );
          })()}
        </FormSection>
      )}

      {modules.includes('biochem') && (
        <FormSection title="血生化">
          {(() => {
            const m = fullValue.labBiochem as LabBiochemistry;
            return (
              <Space direction="vertical" style={{ width: '100%' }} size={4}>
                {renderSampleRow(
                  <DatePicker
                    {...dateProps}
                    value={m.sampleDate ? dayjs(m.sampleDate) : null}
                    disabled={disabled}
                    onChange={(d: Dayjs | null) =>
                      patch('biochem', (mm) => ({ ...mm, sampleDate: d ? d.format('YYYY-MM-DD') : '' }))
                    }
                  />,
                )}
                {BIOCHEM_FIELDS.map(({ label, key, unit }) => (
                  <div
                    key={key}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'minmax(200px, 1fr) 140px 120px 1fr',
                      gap: 12,
                      alignItems: 'center',
                      padding: '6px 0',
                    }}
                  >
                    <Text>{label}</Text>
                    <InputNumber
                      placeholder="实测值"
                      min={0}
                      style={{ width: '100%' }}
                      value={(m[key] as LabItem<number | null>).value}
                      disabled={disabled}
                      onChange={(v: number | null) =>
                        updateItem('biochem', key, {
                          ...(m[key] as LabItem<number | null>),
                          value: v ?? null,
                        })
                      }
                    />
                    <Text type="secondary">{unit}</Text>
                    <Select
                      placeholder="结果判定"
                      options={STATUS_OPTIONS}
                      value={(m[key] as LabItem<number | null>).status}
                      disabled={disabled}
                      onChange={(s: LabStatus) =>
                        updateItem('biochem', key, {
                          ...(m[key] as LabItem<number | null>),
                          status: s,
                        })
                      }
                    />
                  </div>
                ))}
              </Space>
            );
          })()}
        </FormSection>
      )}

      {modules.includes('feno') && (
        <FormSection title="FeNO 呼气一氧化氮">
          {(() => {
            const m = fullValue.feno as FeNO;
            return (
              <Space direction="vertical" style={{ width: '100%' }}>
                <Form.Item label="是否检查" style={{ marginBottom: 0 }}>
                  <Switch
                    checked={m.done}
                    checkedChildren="已检查"
                    unCheckedChildren="未检查"
                    disabled={disabled}
                    onChange={(checked) => patch('feno', (mm) => ({ ...mm, done: checked }))}
                  />
                </Form.Item>
                {m.done && (
                  <>
                    <Form.Item label="检查日期" style={{ marginBottom: 0, maxWidth: 320 }}>
                      <DatePicker
                        {...dateProps}
                        value={m.testDate ? dayjs(m.testDate) : null}
                        disabled={disabled}
                        onChange={(d: Dayjs | null) =>
                          patch('feno', (mm) => ({ ...mm, testDate: d ? d.format('YYYY-MM-DD') : undefined }))
                        }
                      />
                    </Form.Item>
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr 140px 240px',
                        gap: 12,
                        alignItems: 'center',
                        padding: '4px 0',
                      }}
                    >
                      <Text>口腔值 (ppb)</Text>
                      <InputNumber
                        min={0}
                        style={{ width: '100%' }}
                        value={m.oralValue}
                        disabled={disabled}
                        onChange={(v: number | null) => patch('feno', (mm) => ({ ...mm, oralValue: v ?? undefined }))}
                      />
                      <Select
                        placeholder="正常/升高"
                        options={[
                          { label: '正常', value: '正常' },
                          { label: '升高', value: '升高' },
                        ]}
                        value={m.oralStatus}
                        disabled={disabled}
                        onChange={(v: '正常' | '升高') => patch('feno', (mm) => ({ ...mm, oralStatus: v }))}
                      />
                    </div>
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr 140px 240px',
                        gap: 12,
                        alignItems: 'center',
                        padding: '4px 0',
                      }}
                    >
                      <Text>鼻腔值 (ppb)</Text>
                      <InputNumber
                        min={0}
                        style={{ width: '100%' }}
                        value={m.nasalValue}
                        disabled={disabled}
                        onChange={(v: number | null) => patch('feno', (mm) => ({ ...mm, nasalValue: v ?? undefined }))}
                      />
                      <Select
                        placeholder="正常/升高"
                        options={[
                          { label: '正常', value: '正常' },
                          { label: '升高', value: '升高' },
                        ]}
                        value={m.nasalStatus}
                        disabled={disabled}
                        onChange={(v: '正常' | '升高') => patch('feno', (mm) => ({ ...mm, nasalStatus: v }))}
                      />
                    </div>
                  </>
                )}
              </Space>
            );
          })()}
        </FormSection>
      )}

      {modules.includes('ecg') && (
        <FormSection title="心电图">
          {(() => {
            const m = fullValue.ecg as ECG;
            return (
              <Space direction="vertical" style={{ width: '100%' }}>
                <Form.Item label="是否检查" style={{ marginBottom: 0 }}>
                  <Switch
                    checked={m.done}
                    checkedChildren="已检查"
                    unCheckedChildren="未检查"
                    disabled={disabled}
                    onChange={(checked) => patch('ecg', (mm) => ({ ...mm, done: checked }))}
                  />
                </Form.Item>
                {m.done && (
                  <>
                    <Form.Item label="检查日期" style={{ marginBottom: 0, maxWidth: 320 }}>
                      <DatePicker
                        {...dateProps}
                        value={m.testDate ? dayjs(m.testDate) : null}
                        disabled={disabled}
                        onChange={(d: Dayjs | null) =>
                          patch('ecg', (mm) => ({ ...mm, testDate: d ? d.format('YYYY-MM-DD') : undefined }))
                        }
                      />
                    </Form.Item>
                    <Form.Item label="结果" style={{ marginBottom: 0 }}>
                      <Select
                        placeholder="请选择心电图结果"
                        style={{ width: 320 }}
                        options={[
                          { label: '正常', value: '正常' },
                          { label: '异常无临床意义', value: '异常无临床意义' },
                          { label: '异常有临床意义', value: '异常有临床意义' },
                        ]}
                        value={m.result}
                        disabled={disabled}
                        onChange={(v: '正常' | '异常无临床意义' | '异常有临床意义') =>
                          patch('ecg', (mm) => ({ ...mm, result: v }))
                        }
                      />
                    </Form.Item>
                    <Form.Item label="详细描述" style={{ marginBottom: 0 }}>
                      <Input.TextArea
                        rows={3}
                        placeholder="心电图异常描述"
                        value={m.detail}
                        disabled={disabled}
                        onChange={(e) => patch('ecg', (mm) => ({ ...mm, detail: e.target.value }))}
                      />
                    </Form.Item>
                  </>
                )}
              </Space>
            );
          })()}
        </FormSection>
      )}

      {modules.includes('ige') && (
        <FormSection title="血清总IgE">
          {(() => {
            const m = fullValue.serumIgE as SerumIgE;
            return (
              <Space direction="vertical" style={{ width: '100%' }}>
                <Form.Item label="是否检查" style={{ marginBottom: 0 }}>
                  <Switch
                    checked={m.done}
                    checkedChildren="已检查"
                    unCheckedChildren="未检查"
                    disabled={disabled}
                    onChange={(checked) => patch('ige', (mm) => ({ ...mm, done: checked }))}
                  />
                </Form.Item>
                {m.done && (
                  <>
                    <Form.Item label="检查日期" style={{ marginBottom: 0, maxWidth: 320 }}>
                      <DatePicker
                        {...dateProps}
                        value={m.testDate ? dayjs(m.testDate) : null}
                        disabled={disabled}
                        onChange={(d: Dayjs | null) =>
                          patch('ige', (mm) => ({ ...mm, testDate: d ? d.format('YYYY-MM-DD') : undefined }))
                        }
                      />
                    </Form.Item>
                    <Form.Item label="血清总IgE 值 (IU/mL)" style={{ marginBottom: 0, maxWidth: 320 }}>
                      <InputNumber
                        min={0}
                        style={{ width: '100%' }}
                        value={m.value}
                        disabled={disabled}
                        onChange={(v: number | null) => patch('ige', (mm) => ({ ...mm, value: v ?? undefined }))}
                      />
                    </Form.Item>
                  </>
                )}
              </Space>
            );
          })()}
        </FormSection>
      )}
    </div>
  );
}
