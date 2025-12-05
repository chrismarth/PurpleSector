import { Suspense } from 'react';
import { NewSessionClient } from './NewSessionClient';

export default function NewSessionPage() {
  return (
    <Suspense fallback={null}>
      <NewSessionClient />
    </Suspense>
  );
}
