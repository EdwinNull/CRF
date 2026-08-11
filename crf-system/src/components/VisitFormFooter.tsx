/**
 * 访视表单共享组件：底部「暂存 / 提交」操作栏 + 提交校验回调。
 * 页面把页面自己的校验逻辑交给 onValidate -> Promise<boolean>，通过即更新状态。
 */
import { Button, Space, Popconfirm } from 'antd';
import { SaveOutlined, CheckCircleOutlined } from '@ant-design/icons';

export interface FooterProps {
  submitting?: boolean;
  onSave: () => void; // 暂存
  onSubmit: () => void; // 提交（页面负责校验 + dispatch + 锁定）
}

export default function VisitFormFooter({ submitting, onSave, onSubmit }: FooterProps) {
  return (
    <div
      className="no-print"
      style={{
        background: '#fff', borderRadius: 8, padding: '12px 20px', marginTop: 12,
        display: 'flex', justifyContent: 'flex-end', gap: 12,
        boxShadow: '0 -2px 8px rgba(0,21,41,0.06)', position: 'sticky', bottom: 0,
      }}
    >
      <Space>
        <Button icon={<SaveOutlined />} onClick={onSave} loading={submitting}>
          暂存
        </Button>
        <Popconfirm title="提交后将锁定该访视，确认提交？" onConfirm={onSubmit}>
          <Button type="primary" icon={<CheckCircleOutlined />} loading={submitting}>
            提交
          </Button>
        </Popconfirm>
      </Space>
    </div>
  );
}
