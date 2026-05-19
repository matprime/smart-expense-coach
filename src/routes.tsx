import Dashboard from './pages/Dashboard';
import UploadReceipt from './pages/UploadReceipt';
import TechStack from './pages/TechStack';
import Analytics from './pages/Analytics';
import type { ReactNode } from 'react';

export interface RouteConfig {
  name: string;
  path: string;
  element: ReactNode;
  visible?: boolean;
  /** Accessible without login. Routes without this flag require authentication. Has no effect when RouteGuard is not in use. */
  public?: boolean;
}

export const routes: RouteConfig[] = [
  {
    name: 'Dashboard',
    path: '/',
    element: <Dashboard />,
    public: true,
  },
  {
    name: 'Upload Receipt',
    path: '/upload',
    element: <UploadReceipt />,
    public: true,
  },
  {
    name: 'Analytics',
    path: '/analytics',
    element: <Analytics />,
    public: true,
  },
  {
    name: 'Tech Stack',
    path: '/tech-stack',
    element: <TechStack />,
    public: true,
  },
];

