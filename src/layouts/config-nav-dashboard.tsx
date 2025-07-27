import { Label } from 'src/components/label';
import { SvgColor } from 'src/components/svg-color';

// ----------------------------------------------------------------------

const icon = (name: string) => (
  <SvgColor width="100%" height="100%" src={`/assets/icons/navbar/${name}.svg`} />
);

export const navData = [
  {
    title: 'Dashboard',
    path: '/',
    icon: icon('ic-analytics'),
  },
  {
    title: 'Staff Member',
    path: '/staff',
    icon: icon('ic-user'),
  },
  {
    title: 'Users ',
    path: '/user',
    icon: icon('ic-user'),
  },
  {
    title: 'Categories',
    path: '/categories',
    icon: icon('ic-glass-bag'),
    // info: (
    //   <Label color="error" variant="inverted">
    //     +3
    //   </Label>
    // ),
  },
  {
    title: 'Product',
    path: '/products',
    icon: icon('ic-cart'),
    // info: (
    //   <Label color="error" variant="inverted">
    //     +3
    //   </Label>
    // ),
  },
  {
    title: 'Services',
    path: '/services',
    icon: icon('ic-cart'),
    // info: (
    //   <Label color="error" variant="inverted">
    //     +3
    //   </Label>
    // ),
  },
  {
    title: 'Business Owners ',
    path: '/business',
    icon: icon('ic-user'),
  },

];
