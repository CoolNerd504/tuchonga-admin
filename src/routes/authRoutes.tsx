import { lazy } from 'react';
import { Navigate, useRoutes } from 'react-router-dom';

import { AuthLayout } from 'src/layouts/auth';

// ----------------------------------------------------------------------

export const HomePage = lazy(() => import('src/pages/home'));
export const BlogPage = lazy(() => import('src/pages/blog'));
export const UserPage = lazy(() => import('src/pages/user'));
export const StaffPage = lazy(() => import('src/pages/staff'));
export const BusinessOwnerPage = lazy(() => import('src/pages/business/business'));
export const ServicesPage = lazy(() => import('src/pages/services'));
export const SignInPage = lazy(() => import('src/pages/sign-in'));
export const ProductsPage = lazy(() => import('src/pages/products'));
export const Page404 = lazy(() => import('src/pages/page-not-found'));
export const SuperAdminSetupPage = lazy(() => import('src/sections/admin/setup/super-admin-setup-view'));

// ----------------------------------------------------------------------

export function AuthRouter() {
  return useRoutes([
    {
      path: '/setup',
      element: <SuperAdminSetupPage />,
    },
    {
      path: '/',
      element: (
        <AuthLayout>
          <SignInPage />
        </AuthLayout>
      ),
    },
    {
      path: '404',
      element: <Page404 />,
    },
    {
      path: '*',
      element: <Navigate to="/404" replace />,
    },
  ]);
}
