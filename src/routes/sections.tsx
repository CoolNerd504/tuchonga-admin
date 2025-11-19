import { lazy, Suspense } from 'react';
import { getAuth } from 'firebase/auth';
import { Outlet, Navigate, useRoutes } from 'react-router-dom';

import Box from '@mui/material/Box';
import LinearProgress, { linearProgressClasses } from '@mui/material/LinearProgress';

import { app } from 'src/firebaseConfig';
import { varAlpha } from 'src/theme/styles';
import { DashboardLayout } from 'src/layouts/dashboard';

import { BusinessDetail } from 'src/sections/owner/view/owner-view-selected';
import { ProductDetail } from 'src/sections/product/view/product-view-selected';
import { ServiceDetail } from 'src/sections/service/view/service-view-selected';

// ----------------------------------------------------------------------

export const HomePage = lazy(() => import('src/pages/home'));
export const BlogPage = lazy(() => import('src/pages/blog'));
export const UserPage = lazy(() => import('src/pages/user'));
export const StaffPage = lazy(() => import('src/pages/staff'));
export const BusinessOwnerPage = lazy(() => import('src/pages/business/business'));
export const CategoryPage = lazy(() => import('src/pages/categories'));
export const ServicesPage = lazy(() => import('src/pages/services'));
export const SignInPage = lazy(() => import('src/pages/sign-in'));
export const ProductsPage = lazy(() => import('src/pages/products'));
export const Page404 = lazy(() => import('src/pages/page-not-found'));

// ----------------------------------------------------------------------

const auth = getAuth(app);
console.log("Current User", auth.currentUser?.uid);

const renderFallback = (
  <Box display="flex" alignItems="center" justifyContent="center" flex="1 1 auto">
    <LinearProgress
      sx={{
        width: 1,
        maxWidth: 320,
        bgcolor: (theme) => varAlpha(theme.vars.palette.text.primaryChannel, 0.16),
        [`& .${linearProgressClasses.bar}`]: { bgcolor: 'text.primary' },
      }}
    />
  </Box>
);

export function Router() {
  return useRoutes([
    {
      element: (
        <DashboardLayout>
          <Suspense fallback={renderFallback}>
            <Outlet />
          </Suspense>
        </DashboardLayout>
      ),
      children: [
        { path: '/', element: <HomePage /> },
        { path: 'user', element: <UserPage /> },
        { path: 'products', element: <ProductsPage /> },
        { path: 'products/:id', element: <ProductDetail /> },
        { path: 'services', element: <ServicesPage /> },
        { path: 'services/:id', element: <ServiceDetail /> },
        { path: 'staff', element: <StaffPage /> },
        { path: 'business', element: <BusinessOwnerPage /> },
        { path: 'categories', element: <CategoryPage /> },
        { path: 'business/:id', element: <BusinessDetail /> },
        { path: 'blog', element: <BlogPage /> },
      ],
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
