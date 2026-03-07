import { useEffect, useState } from "react";
import { Refine, Authenticated } from "@refinedev/core";
import routerProvider, { UnsavedChangesNotifier } from "@refinedev/react-router";
import { ConfigProvider, App as AntdApp, Avatar, Dropdown, Layout, Menu, Space, Typography, type MenuProps } from "antd";
import { BrowserRouter, Link, Navigate, Outlet, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { DownOutlined, LogoutOutlined, SettingOutlined, UserOutlined } from "@ant-design/icons";

import { adminResources, dashboardNavItem } from "./resources.js";
import { authProvider } from "./providers/authProvider.js";
import { dataProvider } from "./providers/dataProvider.js";
import {
  AccountPage,
  ApiTokensCreatePage,
  ApiTokensEditPage,
  ApiTokensListPage,
  ApiTokensShowPage,
  AssetsCreatePage,
  AssetsEditPage,
  AssetsListPage,
  AssetsShowPage,
  AuthDebugPage,
  BlueprintsCreatePage,
  BlueprintsEditPage,
  BlueprintsListPage,
  BlueprintsShowPage,
  DashboardPage,
  ForgotPasswordPage,
  LoginPage,
  MailLogListPage,
  MailLogShowPage,
  EmailTemplatesCreatePage,
  EmailTemplatesEditPage,
  EmailTemplatesListPage,
  EmailTemplatesShowPage,
  ProjectsEditPage,
  ProjectsCreatePage,
  ProjectsListPage,
  ProjectsShowPage,
  SettingsPage,
  TemplatesCreatePage,
  TemplatesEditPage,
  TemplatesListPage,
  TemplatesShowPage,
  UpdatePasswordPage,
  UsersCreatePage,
  UsersEditPage,
  UsersListPage,
  UsersShowPage,
  RolesListPage,
  RolesEditPage,
  RolesShowPage
} from "./pages.js";

const { Header, Sider, Content } = Layout;
const { Text, Title } = Typography;

const headerTheme = {
  colorPrimary: "#184a8c",
  colorInfo: "#184a8c",
  colorBgLayout: "#eef2f7",
  colorBgContainer: "#ffffff",
  colorBorder: "#d8e0ea",
  colorText: "#172231",
  colorTextSecondary: "#5e6b7c",
  colorSuccess: "#2e7d4f",
  colorWarning: "#c98618",
  colorError: "#b64242",
  borderRadius: 12
};

const AppLayout = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const [identity, setIdentity] = useState<{ name?: string; email?: string } | null>(null);

  useEffect(() => {
    let active = true;
    authProvider
      .getIdentity?.()
      .then((currentIdentity) => {
        const identity = currentIdentity as { name?: string; email?: string } | undefined;
        if (active) {
          setIdentity({
            name: identity?.name,
            email: identity?.email
          });
        }
      })
      .catch(() => {
        if (active) {
          setIdentity(null);
        }
      });

    return () => {
      active = false;
    };
  }, [location.pathname]);

  const menuItems = [
    dashboardNavItem,
    ...adminResources.map((resource) => ({
      key: resource.listPath,
      icon: resource.icon,
      label: resource.label
    }))
  ];

  const selectedKey =
    menuItems.find((item) => location.pathname === item.key || location.pathname.startsWith(`${item.key}/`))?.key ??
    "/dashboard";

  const handleLogout = async () => {
    await authProvider.logout?.({});
    navigate("/login", { replace: true });
  };

  const accountMenuItems: MenuProps["items"] = [
    {
      key: "identity",
      disabled: true,
      label: (
        <div className="admin-account-menu__identity">
          <div className="admin-account-menu__name">{identity?.name ?? "Admin"}</div>
          <div className="admin-account-menu__email">{identity?.email ?? "No email loaded"}</div>
        </div>
      )
    },
    {
      type: "divider"
    },
    {
      key: "account",
      icon: <SettingOutlined />,
      label: "My Account"
    },
    {
      key: "logout",
      icon: <LogoutOutlined />,
      danger: true,
      label: "Sign out"
    }
  ];

  const handleAccountMenuClick: MenuProps["onClick"] = ({ key }) => {
    if (key === "account") {
      navigate("/account");
      return;
    }

    if (key === "logout") {
      void handleLogout();
    }
  };

  useEffect(() => {
    const currentLabel = menuItems.find((item) => item.key === selectedKey)?.label ?? "Dashboard";
    document.title = `${currentLabel} · Flow2Print Admin`;
  }, [menuItems, selectedKey]);

  return (
    <Layout className="admin-shell">
      <Sider
        collapsible
        collapsed={collapsed}
        onCollapse={setCollapsed}
        width={260}
        collapsedWidth={88}
        className="admin-sider"
      >
        <div className="admin-brand">
          <div className="admin-brand-mark">F2P</div>
          {!collapsed ? (
            <div>
              <Title level={4}>Flow2Print</Title>
              <Text type="secondary">Admin workspace</Text>
            </div>
          ) : null}
        </div>
        <Menu
          mode="inline"
          selectedKeys={[selectedKey]}
          items={menuItems}
          onClick={({ key }) => navigate(String(key))}
          className="admin-menu"
        />
      </Sider>
      <Layout>
        <Header className="admin-header">
          <div className="admin-header-copy">
            <Text type="secondary">Flow2Print</Text>
            <Title level={4}>Admin workspace</Title>
          </div>
          <Dropdown
            trigger={["click"]}
            menu={{
              items: accountMenuItems,
              onClick: handleAccountMenuClick
            }}
            placement="bottomRight"
          >
            <button type="button" className="admin-header-account">
              <Avatar
                size={34}
                className="admin-header-account__avatar"
                icon={<UserOutlined />}
              />
              <span className="admin-header-account__meta">
                <span className="admin-header-account__label">My Account</span>
                <span className="admin-header-account__name">{identity?.name ?? "Admin"}</span>
              </span>
              <DownOutlined className="admin-header-account__caret" />
            </button>
          </Dropdown>
        </Header>
        <Content className="admin-content">
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
};

export const AdminApp = () => (
  <BrowserRouter>
    <ConfigProvider
      theme={{
        token: headerTheme
      }}
    >
      <AntdApp>
        <Refine
          authProvider={authProvider}
          dataProvider={dataProvider}
          routerProvider={routerProvider}
          resources={adminResources.map((resource) => ({
            name: resource.name,
            list: resource.listPath,
            create: resource.createPath,
            edit: resource.editPath,
            show: resource.showPath,
            meta: {
              label: resource.label,
              icon: resource.icon
            }
          }))}
          options={{
            syncWithLocation: true,
            warnWhenUnsavedChanges: true,
            title: {
              text: "Flow2Print Admin"
            }
          }}
        >
          <Routes>
            <Route
              element={
                <Authenticated key="anonymous-routes" fallback={<Outlet />}>
                  <Navigate to="/dashboard" replace />
                </Authenticated>
              }
            >
              <Route path="/login" element={<LoginPage />} />
              <Route path="/forgot-password" element={<ForgotPasswordPage />} />
              <Route path="/update-password" element={<UpdatePasswordPage />} />
            </Route>

            <Route
              element={
                <Authenticated key="protected-routes" fallback={<Navigate to="/login" replace />}>
                  <AppLayout />
                </Authenticated>
              }
            >
              <Route index element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/account" element={<AccountPage />} />

              <Route path="/projects" element={<ProjectsListPage />} />
              <Route path="/projects/create" element={<ProjectsCreatePage />} />
              <Route path="/projects/edit/:id" element={<ProjectsEditPage />} />
              <Route path="/projects/show/:id" element={<ProjectsShowPage />} />

              <Route path="/templates" element={<TemplatesListPage />} />
              <Route path="/templates/create" element={<TemplatesCreatePage />} />
              <Route path="/templates/edit/:id" element={<TemplatesEditPage />} />
              <Route path="/templates/show/:id" element={<TemplatesShowPage />} />

              <Route path="/blueprints" element={<BlueprintsListPage />} />
              <Route path="/blueprints/create" element={<BlueprintsCreatePage />} />
              <Route path="/blueprints/edit/:id" element={<BlueprintsEditPage />} />
              <Route path="/blueprints/show/:id" element={<BlueprintsShowPage />} />

              <Route path="/assets" element={<AssetsListPage />} />
              <Route path="/assets/create" element={<AssetsCreatePage />} />
              <Route path="/assets/edit/:id" element={<AssetsEditPage />} />
              <Route path="/assets/show/:id" element={<AssetsShowPage />} />

              <Route path="/users" element={<UsersListPage />} />
              <Route path="/users/create" element={<UsersCreatePage />} />
              <Route path="/users/edit/:id" element={<UsersEditPage />} />
              <Route path="/users/show/:id" element={<UsersShowPage />} />

              <Route path="/roles" element={<RolesListPage />} />
              <Route path="/roles/edit/:id" element={<RolesEditPage />} />
              <Route path="/roles/show/:id" element={<RolesShowPage />} />

              <Route path="/api-tokens" element={<ApiTokensListPage />} />
              <Route path="/api-tokens/create" element={<ApiTokensCreatePage />} />
              <Route path="/api-tokens/edit/:id" element={<ApiTokensEditPage />} />
              <Route path="/api-tokens/show/:id" element={<ApiTokensShowPage />} />

              <Route path="/mail-log" element={<MailLogListPage />} />
              <Route path="/mail-log/show/:id" element={<MailLogShowPage />} />

              <Route path="/email-templates" element={<EmailTemplatesListPage />} />
              <Route path="/email-templates/create" element={<EmailTemplatesCreatePage />} />
              <Route path="/email-templates/edit/:id" element={<EmailTemplatesEditPage />} />
              <Route path="/email-templates/show/:id" element={<EmailTemplatesShowPage />} />

              <Route path="/settings" element={<SettingsPage />} />
            </Route>

            <Route path="*" element={<AuthDebugPage />} />
          </Routes>
          <UnsavedChangesNotifier />
        </Refine>
      </AntdApp>
    </ConfigProvider>
  </BrowserRouter>
);
