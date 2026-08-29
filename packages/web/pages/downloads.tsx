import React from 'react';
import Head from 'next/head';

import { LayoutComponent } from '../components/layout/layout.component';
import { DownloadsComponent } from '../components/downloads/downloads.component';
import { withApollo } from '../components/with-apollo';

function DownloadsPage() {
  return (
    <>
      <Head>
        <title>Bobarr - Downloads</title>
      </Head>
      <LayoutComponent>
        <DownloadsComponent />
      </LayoutComponent>
    </>
  );
}

export default withApollo(DownloadsPage);
