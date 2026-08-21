/**
 * 多选 +「其他」备注：勾选「其他」后在同行显示请注明输入框。
 * 用嵌套 Form.Item 分别绑定选项数组与备注字段，便于提交时按勾选做必填校验。
 */
import { Checkbox, Form, Input, Space } from 'antd';

const OTHER = '其他';

export interface FormCheckboxGroupWithOtherProps {
  name: (string | number)[];
  otherName: (string | number)[];
  label: string;
  options: readonly string[];
  otherOption?: string;
  otherPlaceholder?: string;
  otherRequiredMessage: string;
}

export default function FormCheckboxGroupWithOther({
  name,
  otherName,
  label,
  options,
  otherOption = OTHER,
  otherPlaceholder = '请注明',
  otherRequiredMessage,
}: FormCheckboxGroupWithOtherProps) {
  const items = Form.useWatch(name) as string[] | undefined;
  const showOther = (items ?? []).includes(otherOption);

  return (
    <Form.Item label={label}>
      <Space wrap align="center" size={8}>
        <Form.Item name={name} noStyle initialValue={[]}>
          <Checkbox.Group options={[...options]} />
        </Form.Item>
        {showOther ? (
          <Form.Item
            name={otherName}
            noStyle
            rules={[
              {
                validator: async (_: unknown, value: unknown) => {
                  if (!String(value ?? '').trim()) {
                    return Promise.reject(new Error(otherRequiredMessage));
                  }
                },
              },
            ]}
          >
            <Input placeholder={otherPlaceholder} maxLength={50} style={{ width: 180 }} />
          </Form.Item>
        ) : null}
      </Space>
    </Form.Item>
  );
}
