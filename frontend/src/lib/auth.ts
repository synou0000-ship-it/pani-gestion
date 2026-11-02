import { User } from '../types';

export function getToken(): string | null {
  return localStorage.getItem('pani_token');
}

export function setToken(token: string): void {
  localStorage.setItem('pani_token', token);
}

export function getUser(): User | null {
  const user = localStorage.getItem('pani_user');
  if (!user) return null;
  try {
    return JSON.parse(user) as User;
  } catch {
    return null;
  }
}

export function setUser(user: User): void {
  localStorage.setItem('pani_user', JSON.stringify(user));
}

export function removeAuth(): void {
  localStorage.removeItem('pani_token');
  localStorage.removeItem('pani_user');
}

export function isAuthenticated(): boolean {
  return Boolean(getToken());
}

