import { usePage } from '@inertiajs/react';
import { LapPageClient } from '@/components/LapPageClient';

export default function LapDetailPage() {
  const { id: lapId } = usePage().props as unknown as { id: string };
  return <LapPageClient lapId={lapId} />;
}
