import { getAuthUserFromCookies } from '@/lib/auth';

export function requireAuthUserId(): string {
  const user = getAuthUserFromCookies();
  if (!user) {
    throw new Error('UNAUTHENTICATED');
  }
  return user.id;
}
