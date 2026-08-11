/**
 * 登录页 (plan.md §5.1)
 * 居中卡片式登录，任意用户名/密码即可进入，选择研究中心。
 * centerId 存入全局 store。
 */
import { useState } from 'react';
import { Card, Form, Input, Select, Button, Typography, Space, message } from 'antd';
import { UserOutlined, LockOutlined, LoginOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { CENTERS } from '../../mock/dictionaries';
import { usePatientStore } from '../../store/PatientContext';
import { apiLogin } from '../../api/client';
import { setToken } from '../../api/http';
import { apiErrorText } from '../../api/http';
import type { CenterId } from '../../types/patient';

interface FormValues {
  centerId: CenterId;
  username: string;
  password: string;
}

export default function Login() {
  const [loading, setLoading] = useState(false);
  const { dispatch } = usePatientStore();
  const navigate = useNavigate();

  const onFinish = async (v: FormValues) => {
    setLoading(true);
    try {
      // 真实后端登录：验证用户名/密码/研究中心
      const { token, user } = await apiLogin(v.username, v.password, v.centerId);
      setToken(token.access_token);
      dispatch({
        type: 'LOGIN',
        payload: {
          username: user.username,
          centerId: v.centerId,
          role: user.role === 'admin' ? 'admin' : 'doctor',
        },
      });
      message.success('登录成功');
      navigate('/');
    } catch (e) {
      message.error(apiErrorText(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #e8f2ff 0%, #f7fbff 100%)',
        padding: 16,
      }}
    >
      <Card style={{ width: 400, boxShadow: '0 8px 30px rgba(0,21,41,0.1)', borderRadius: 12 }}>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <Typography.Title level={4} style={{ margin: 0 }}>
            荆防合剂治疗过敏性鼻炎的临床研究
          </Typography.Title>
          <Typography.Text type="secondary">CRF 电子化录入系统</Typography.Text>
        </div>
        <Form<FormValues> layout="vertical" onFinish={onFinish} initialValues={{ centerId: '01' }}>
          <Form.Item
            name="centerId"
            label="研究中心"
            rules={[{ required: true, message: '请选择研究中心' }]}
          >
            <Select
              placeholder="请选择研究中心"
              options={CENTERS.map((c) => ({ label: `${c.id} — ${c.name}`, value: c.id }))}
            />
          </Form.Item>
          <Form.Item
            name="username"
            label="用户名"
            rules={[{ required: true, message: '请输入用户名' }]}
          >
            <Input prefix={<UserOutlined />} placeholder="请输入用户名" autoComplete="username" />
          </Form.Item>
          <Form.Item
            name="password"
            label="密码"
            rules={[{ required: true, message: '请输入密码' }]}
          >
            <Input.Password prefix={<LockOutlined />} placeholder="请输入密码" autoComplete="current-password" />
          </Form.Item>
          <Form.Item style={{ marginBottom: 0 }}>
            <Button type="primary" htmlType="submit" block loading={loading} icon={<LoginOutlined />}>
              进入系统
            </Button>
          </Form.Item>
          <Space style={{ marginTop: 8 }} direction="vertical">
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              测试账号：admin / admin@crf2026，doctor01‑04 / Doctor@0系列（详见后端已建用户）
            </Typography.Text>
          </Space>
        </Form>
      </Card>
    </div>
  );
}
