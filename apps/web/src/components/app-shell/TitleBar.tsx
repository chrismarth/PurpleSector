'use client';

import Image from 'next/image';

export function TitleBar() {
  return (
    <header className="flex items-center h-12 pl-1 pr-3 border-b bg-gray-50 dark:bg-gray-700 shadow-sm shrink-0">
      <Image
        src="/images/purpleSector_logo.svg"
        alt="Purple Sector"
        width={200}
        height={36}
        className="h-8 w-auto"
        priority
      />
    </header>
  );
}
