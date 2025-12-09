import React from 'react';
import {Redirect} from '@docusaurus/router';
import useBaseUrl from '@docusaurus/useBaseUrl';

export default function Home() {
  // Redirect from docs root to the intro page, respecting baseUrl
  const introUrl = useBaseUrl('/intro');
  return <Redirect to={introUrl} />;
}
