import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

export const navData = [
  {
    title: 'Dashboard',
    path: '/',
    icon: <Iconify icon="solar:graph-up-bold" width={24} />,
  },
  {
    title: 'Staff Member',
    path: '/staff',
    icon: <Iconify icon="solar:users-group-two-rounded-bold" width={24} />,
  },
  {
    title: 'Users',
    path: '/user',
    icon: <Iconify icon="solar:users-group-rounded-bold" width={24} />,
  },
  {
    title: 'Categories',
    path: '/categories',
    icon: <Iconify icon="solar:folder-bold" width={24} />,
  },
  {
    title: 'Products',
    path: '/products',
    icon: <Iconify icon="solar:bag-heart-bold" width={24} />,
  },
  {
    title: 'Services',
    path: '/services',
    icon: <Iconify icon="solar:widget-bold" width={24} />,
  },
  {
    title: 'Business Owners',
    path: '/business',
    icon: <Iconify icon="solar:buildings-bold" width={24} />,
  },
];
