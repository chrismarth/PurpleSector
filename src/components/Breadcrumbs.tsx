/**
 * Breadcrumbs Component
 * 
 * Displays hierarchical navigation breadcrumbs
 */

import Link from 'next/link';
import { ChevronRight } from 'lucide-react';

export interface Breadcrumb {
  label: string;
  href: string;
  onClick?: (e: React.MouseEvent) => void;
}

interface BreadcrumbsProps {
  items: Breadcrumb[];
}

export function Breadcrumbs({ items }: BreadcrumbsProps) {
  if (!items || items.length === 0) {
    return null;
  }

  return (
    <nav className="flex items-center gap-2 text-sm text-muted-foreground">
      {items.map((crumb, index) => (
        <div key={index} className="flex items-center gap-2">
          {index > 0 && <ChevronRight className="h-4 w-4" />}
          {index === items.length - 1 ? (
            <span className="font-medium text-foreground">{crumb.label}</span>
          ) : crumb.onClick ? (
            <button
              onClick={crumb.onClick}
              className="hover:text-foreground transition-colors cursor-pointer"
            >
              {crumb.label}
            </button>
          ) : (
            <Link 
              href={crumb.href}
              className="hover:text-foreground transition-colors"
            >
              {crumb.label}
            </Link>
          )}
        </div>
      ))}
    </nav>
  );
}
