import { cookies } from 'next/headers';

export const AUTH_COOKIE_NAME = 'ps_user';

export type StubUserRole = 'ORG_ADMIN' | 'USER';

export interface AuthUser {
  id: string;
  username: string;
  role: StubUserRole;
  fullName: string;
  avatarUrl: string | null;
}

export function getAuthUserFromCookies(): AuthUser | null {
  const cookieStore = cookies();
  const username = cookieStore.get(AUTH_COOKIE_NAME)?.value;

  if (username === 'admin') {
    return {
      id: 'admin',
      username: 'admin',
      role: 'ORG_ADMIN',
      fullName: 'Admin User',
      avatarUrl: null,
    };
  }

  if (username === 'user') {
    return {
      id: 'user',
      username: 'user',
      role: 'USER',
      fullName: 'Regular User',
      avatarUrl: null,
    };
  }

  return null;
}
