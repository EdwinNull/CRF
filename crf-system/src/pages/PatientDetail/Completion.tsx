/**
 * 完成情况总结页 (plan.md §5.13, CRF p41)
 */
import { useEffect } from 'react';
import {
  Button, Form, Radio, DatePicker, Input, InputNumber, Select, Space, message, Divider, Alert,
} from 'antd';
import dayjs, { type Dayjs } from 'dayjs';
import { usePatient } from '../../utils/usePatient';
import { usePatientStore } from '../../store/PatientContext';
import { WITHDRAWAL_REASONS } from '../../mock/dictionaries';
import type { CompletionSummary, WithdrawalReasonCode } from '../../types/concomitantMed';

interface FormValues {
  completedTreatment: boolean;
  completionDate?: Dayjs;
  lastDoseDate?: Dayjs;
  hadFinalVisit?: boolean;
  noFinalVisitReason?: string;
  withdrawalReason?: WithdrawalReasonCode;
  withdrawalDetail?: string;
  aeSeqNo?: number;
  deathDate?: Dayjs;
  deathCause?: string;
}

export default function Completion() {
  const { patient } = usePatient();
  const { dispatch } = usePatientStore();
  const [form] = Form.useForm();
  // 已「完成治疗」或「已退出」的患者，完成情况视为最终结论，禁止再改
  const locked = patient?.status === 'completed' || patient?.status === 'withdrawn';

  useEffect(() => {
    if (!patient) return;
    const c = patient.completion;
    form.setFieldsValue({
      completedTreatment: c?.completedTreatment ?? true,
      completionDate: c?.completionDate ? dayjs(c.completionDate) : undefined,
      lastDoseDate: c?.lastDoseDate ? dayjs(c.lastDoseDate) : undefined,
      hadFinalVisit: c?.hadFinalVisit ?? true,
      noFinalVisitReason: c?.noFinalVisitReason,
      withdrawalReason: c?.withdrawalReason,
      withdrawalDetail: c?.withdrawalDetail,
      aeSeqNo: c?.aeSeqNo,
      deathDate: c?.deathDate ? dayjs(c.deathDate) : undefined,
      deathCause: c?.deathCause,
    });
  }, [patient, form]);

  if (!patient) return null;

  const save = () => {
    form.validateFields().then((v: FormValues) => {
      const completion: CompletionSummary = {
        completedTreatment: v.completedTreatment,
        completionDate: v.completedTreatment ? v.completionDate?.format('YYYY-MM-DD') : undefined,
        lastDoseDate: v.completedTreatment ? undefined : v.lastDoseDate?.format('YYYY-MM-DD'),
        hadFinalVisit: v.completedTreatment ? undefined : v.hadFinalVisit,
        noFinalVisitReason: v.hadFinalVisit === false ? v.noFinalVisitReason : undefined,
        withdrawalReason: v.completedTreatment ? undefined : v.withdrawalReason,
        withdrawalDetail: !v.completedTreatment && v.withdrawalReason === 9 ? v.withdrawalDetail : undefined,
        aeSeqNo: !v.completedTreatment && v.withdrawalReason === 5 ? v.aeSeqNo : undefined,
        deathDate: !v.completedTreatment && v.withdrawalReason === 7 ? v.deathDate?.format('YYYY-MM-DD') : undefined,
        deathCause: !v.completedTreatment && v.withdrawalReason === 7 ? v.deathCause : undefined,
      };
      dispatch({ type: 'UPDATE_COMPLETION', payload: { patientId: patient.id, completion } });
      message.success('完成情况已保存');
    });
  };

  return (
    <div>
      <Form form={form} layout="vertical" disabled={locked} initialValues={{ completedTreatment: true, hadFinalVisit: true }}>
        <Form.Item name="completedTreatment" label="是否完成28天治疗" rules={[{ required: true, message: '请选择' }]}>
          <Radio.Group>
            <Radio value={true}>是，完成治疗</Radio>
            <Radio value={false}>否，中途退出/未完成</Radio>
          </Radio.Group>
        </Form.Item>

        <Form.Item noStyle shouldUpdate>
          {({ getFieldValue }) => {
            const done = getFieldValue('completedTreatment') === true;
            return (
              <>
                {done ? (
                  <Form.Item name="completionDate" label="研究完成日期" rules={[{ required: true, message: '请选择' }]}>
                    <DatePicker />
                  </Form.Item>
                ) : (
                  <Form.Item name="lastDoseDate" label="末次给药日期">
                    <DatePicker />
                  </Form.Item>
                )}
              </>
            );
          }}
        </Form.Item>

        <Form.Item noStyle shouldUpdate>
          {({ getFieldValue }) =>
            getFieldValue('completedTreatment') === false ? (
              <>
                <Divider titlePlacement="start" plain style={{ fontSize: 13, margin: '8px 0' }}>
                  退出 / 试验终止信息
                </Divider>
                <Form.Item name="hadFinalVisit" label="是否进行末次访视">
                  <Radio.Group>
                    <Radio value={true}>是</Radio>
                    <Radio value={false}>否</Radio>
                  </Radio.Group>
                </Form.Item>
                <Form.Item noStyle shouldUpdate>
                  {({ getFieldValue: g }) =>
                    g('hadFinalVisit') === false ? (
                      <Form.Item name="noFinalVisitReason" label="未进行末次访视原因">
                        <Input />
                      </Form.Item>
                    ) : null
                  }
                </Form.Item>
                <Form.Item name="withdrawalReason" label="退出原因" rules={[{ required: true, message: '请选择退出原因' }]}>
                  <Select options={WITHDRAWAL_REASONS} placeholder="请选择" />
                </Form.Item>
                <Form.Item noStyle shouldUpdate>
                  {({ getFieldValue: g }) => {
                    const r = g('withdrawalReason');
                    return (
                      <Space direction="vertical" style={{ width: '100%' }}>
                        {r === 5 && (
                          <Form.Item name="aeSeqNo" label="对应不良事件编号 (AE编号)">
                            <InputNumber min={1} placeholder="如 1" />
                          </Form.Item>
                        )}
                        {r === 7 && (
                          <>
                            <Form.Item name="deathDate" label="死亡日期"><DatePicker /></Form.Item>
                            <Form.Item name="deathCause" label="死亡原因"><Input /></Form.Item>
                          </>
                        )}
                        {r === 9 && (
                          <Form.Item name="withdrawalDetail" label="其他退出原因详情"><Input /></Form.Item>
                        )}
                      </Space>
                    );
                  }}
                </Form.Item>
                <Alert type="info" showIcon message="退出受试者将不再进行后续访视与随访期评估。" style={{ marginBottom: 16 }} />
              </>
            ) : null
          }
        </Form.Item>

        <Divider />
        <Button type="primary" onClick={save} disabled={locked}>
          {locked ? '已完成归档（不可修改）' : '保存完成情况'}
        </Button>
      </Form>
    </div>
  );
}
