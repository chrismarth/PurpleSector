"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useNavUiStore } from '@/stores/navUiStore';

export default function HomePage() {
  const router = useRouter();
  const selectedNodeId = useNavUiStore((s) => s.selectedNodeId);

  useEffect(() => {
    if (!selectedNodeId) return;

    const eventMatch = selectedNodeId.match(/^event:(.+)$/);
    const sessionMatch = selectedNodeId.match(/^session(?:-current)?:(.+)$/);
    const lapMatch = selectedNodeId.match(/^lap:(.+)$/);

    if (lapMatch) {
      router.replace(`/lap/${lapMatch[1]}`);
    } else if (sessionMatch) {
      router.replace(`/session/${sessionMatch[1]}`);
    } else if (eventMatch) {
      router.replace(`/event/${eventMatch[1]}`);
    }
  }, [selectedNodeId, router]);

  return (
    <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
      Select an event, session, or lap from the navigation pane.
    </div>
  );
}
