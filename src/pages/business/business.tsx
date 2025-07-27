import { Helmet } from 'react-helmet-async';

import { CONFIG } from 'src/config-global';

import { OwnerView } from 'src/sections/owner/view';

// ----------------------------------------------------------------------

export default function Page() {
  return (
    <>
      <Helmet>
        <title> {`Business - ${CONFIG.appName}`}</title>
      </Helmet>

      <OwnerView />
    </>
  );
}
