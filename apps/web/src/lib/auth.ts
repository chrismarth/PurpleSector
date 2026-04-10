import { cookies } from 'next/headers';

export const AUTH_COOKIE_NAME = 'ps_user';

export type StubUserRole = 'ORG_ADMIN' | 'USER';

export interface AuthUser {
  id: string;
}

export function getAuthUserFromCookies(): AuthUser | null {
  const cookieStore = cookies();
  const userId = cookieStore.get(AUTH_COOKIE_NAME)?.value;
  if (!userId) return null;
  return { id: userId };
}

export function requireAuthUserId(): string {
  const user = getAuthUserFromCookies();
  if (!user) {
    throw new Error('UNAUTHENTICATED');
  }
  return user.id;
}
