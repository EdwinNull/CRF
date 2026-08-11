/**
 * 主布局：Ant Design Layout + Sider + Header + Content
 * 左侧导航含「患者列表」「数据导出」，右上角用户与登出。
 */
import { Layout, Typography, Menu, Space, Avatar, Dropdown, type MenuProps } from 'antd';
import { UserOutlined, LogoutOutlined, ClusterOutlined } from '@ant-design/icons';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import type { ReactNode } from 'react';
import { usePatientStore, useCurrentUser } from '../store/PatientContext';

const { Sider, Header, Content } = Layout;

export interface AppLayoutProps {
  /** 默认 @ v1 之外的自定义侧栏项（暂未用到，保留扩展） */
  extraMenu?: ReactNode;
}

export default function AppLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { dispatch } = usePatientStore();
  const user = useCurrentUser();

  const selectedKey = location.pathname.startsWith('/export') ? 'export' : 'patient';

  const menuItems: MenuProps['items'] = [
    { key: 'patient', icon: <UserOutlined />, label: '📋 患者列表' },
    { key: 'export', icon: <ClusterOutlined />, label: '📥 数据导出' },
  ];

  const userMenu: MenuProps['items'] = [
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: '退出登录',
      onClick: () => {
        dispatch({ type: 'LOGOUT' });
        navigate('/login');
      },
    },
  ];

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider width={200} theme="dark" breakpoint="lg" collapsedWidth={64}>
        <div
          style={{
            height: 56,
            margin: 12,
            color: '#fff',
            fontWeight: 700,
            fontSize: 15,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(255,255,255,0.08)',
            borderRadius: 6,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
          }}
        >
          荆防临床研究
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[selectedKey]}
          items={menuItems}
          onClick={({ key }) => navigate(key === 'export' ? '/export' : '/')}
        />
      </Sider>
      <Layout>
        <Header
          style={{
            background: '#fff',
            padding: '0 24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            boxShadow: '0 1px 4px rgba(0,21,41,0.08)',
          }}
        >
          <Typography.Text strong style={{ fontSize: 16 }}>
            荆防合剂治疗过敏性鼻炎临床研究
          </Typography.Text>
          <Space>
            {user && (
              <Dropdown menu={{ items: userMenu }} placement="bottomRight">
                <Space style={{ cursor: 'pointer' }}>
                  <Avatar size="small" icon={<UserOutlined />} />
                  <span>{user.username}</span>
                  <span style={{ color: '#888', fontSize: 12 }}>
                    中心 {user.centerId}
                  </span>
                </Space>
              </Dropdown>
            )}
          </Space>
        </Header>
        <Content style={{ margin: 16, padding: 0 }}>{<Outlet />}</Content>
      </Layout>
    </Layout>
  );
}
