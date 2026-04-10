'use client';

import { useParams } from 'next/navigation';
import { LapPageClient } from '@/components/LapPageClient';

export default function LapPage() {
  const params = useParams();
  const lapId = params.id as string;

  return <LapPageClient lapId={lapId} />;
}
