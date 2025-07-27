import { Helmet } from 'react-helmet-async';

import { CONFIG } from 'src/config-global';

import { BusinessDetail } from 'src/sections/owner/view/owner-view-selected';

// ----------------------------------------------------------------------

export default function Page() {
  return (
    <>
      <Helmet>
        <title> {`Business Details- ${CONFIG.appName}`}</title>
      </Helmet>

      <BusinessDetail />
    </>
  );
}
