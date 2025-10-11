/**
 * Global Header Component
 * 
 * Displays the Purple Sector branding on all pages
 */

import Link from 'next/link';
import Image from 'next/image';

export default function Header() {
  return (
    <header className="border-b bg-gray-100 dark:bg-gray-800 shadow-sm">
      <div className="container mx-auto px-4 pt-4 pb-2">
        <Link href="/" className="inline-block">
          <Image 
            src="/images/purpleSector_logo.svg" 
            alt="Purple Sector"
            width={300}
            height={56}
            className="h-14 w-auto"
            priority
          />
        </Link>
      </div>
    </header>
  );
}

export { Header };
