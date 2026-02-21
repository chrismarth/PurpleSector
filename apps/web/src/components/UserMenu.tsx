'use client';

import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { LogOut, User as UserIcon } from 'lucide-react';

import { useAuth } from '@/components/AuthProvider';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';

interface UserMenuProps {
  compact?: boolean;
}

export function UserMenu({ compact }: UserMenuProps = {}) {
  const router = useRouter();
  const { user, loading, logout } = useAuth();

  if (!user) return null;

  const label = loading ? 'Loading...' : user.fullName || user.username;

  return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          {compact ? (
            <button
              className="flex items-center justify-center h-7 w-7 rounded-full overflow-hidden bg-muted hover:ring-2 hover:ring-purple-500 transition-all"
              disabled={loading}
            >
              {user.avatarUrl ? (
                <Image
                  src={user.avatarUrl}
                  alt=""
                  width={28}
                  height={28}
                  className="h-7 w-7 rounded-full object-cover"
                />
              ) : (
                <UserIcon className="h-4 w-4 text-muted-foreground" />
              )}
            </button>
          ) : (
            <Button variant="outline" className="gap-2" disabled={loading}>
              {user.avatarUrl ? (
                <Image
                  src={user.avatarUrl}
                  alt=""
                  width={20}
                  height={20}
                  className="h-5 w-5 rounded-full object-cover"
                />
              ) : (
                <UserIcon className="h-4 w-4" />
              )}
              <span className="max-w-[12rem] truncate">{label}</span>
            </Button>
          )}
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>
            {user ? (
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-full overflow-hidden bg-muted flex items-center justify-center flex-shrink-0">
                  {user.avatarUrl ? (
                    <Image
                      src={user.avatarUrl}
                      alt=""
                      width={32}
                      height={32}
                      className="object-cover"
                    />
                  ) : (
                    <UserIcon className="h-4 w-4 text-muted-foreground" />
                  )}
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-medium leading-none">{user.fullName}</span>
                  <span className="text-xs text-muted-foreground">{user.username}</span>
                </div>
              </div>
            ) : (
              'Not signed in'
            )}
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onSelect={async () => {
              await logout();
              router.refresh();
            }}
          >
            <LogOut className="mr-2 h-4 w-4" />
            Logout
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
  );
}
