import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  FileText,
  Bell,
  ClipboardList,
  BarChart3,
  Menu,
} from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
}

const menuItems = [
  { path: '/', icon: LayoutDashboard, label: '总览' },
  { path: '/certificates', icon: FileText, label: '证照库' },
  { path: '/reminders', icon: Bell, label: '提醒' },
  { path: '/records', icon: ClipboardList, label: '办理记录' },
  { path: '/statistics', icon: BarChart3, label: '统计' },
];

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = React.useState(false);

  return (
    <div className="flex h-screen bg-gray-100">
      <div
        className={`bg-white shadow-lg transition-all duration-300 ${
          collapsed ? 'w-20' : 'w-64'
        }`}
      >
        <div className="flex items-center h-16 px-4 border-b border-gray-200">
          <FileText className="w-8 h-8 text-blue-600" />
          {!collapsed && (
            <span className="ml-3 text-xl font-bold text-gray-800">
              证照管家
            </span>
          )}
        </div>

        <nav className="mt-6 px-2">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;

            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={`w-full flex items-center px-4 py-3 mb-2 rounded-lg transition-all ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <Icon className="w-5 h-5" />
                {!collapsed && <span className="ml-3 font-medium">{item.label}</span>}
              </button>
            );
          })}
        </nav>

        <div className="absolute bottom-4 left-0 right-0 px-2">
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="w-full flex items-center justify-center px-4 py-2 text-gray-500 hover:bg-gray-100 rounded-lg"
          >
            <Menu className="w-5 h-5" />
            {!collapsed && <span className="ml-2">收起菜单</span>}
          </button>
        </div>
      </div>

      <main className="flex-1 overflow-auto">
        <div className="p-6">{children}</div>
      </main>
    </div>
  );
};

export default Layout;
