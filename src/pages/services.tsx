import { Helmet } from 'react-helmet-async';

import { CONFIG } from 'src/config-global';

import { ServicesView } from 'src/sections/service/view';

// ----------------------------------------------------------------------

export default function Page() {
  return (
    <>
      <Helmet>
        <title> {`Services - ${CONFIG.appName}`}</title>
      </Helmet>

      <ServicesView />
    </>
  );
}
