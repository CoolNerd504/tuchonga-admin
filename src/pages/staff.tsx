import { Helmet } from 'react-helmet-async';

import { CONFIG } from 'src/config-global';

import { StaffView } from 'src/sections/staff/view';

// ----------------------------------------------------------------------

export default function Page() {
  return (
    <>
      <Helmet>
        <title> {`Staff - ${CONFIG.appName}`}</title>
      </Helmet>

      <StaffView />
    </>
  );
}
