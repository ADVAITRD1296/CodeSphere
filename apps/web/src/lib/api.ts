import { useAuthStore } from '../store/useAuthStore';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://10.17.248.240:4000/api/v1';

export async function apiFetch<T = any>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const accessToken = useAuthStore.getState().accessToken;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };

  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`;
  }

  let response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
    credentials: 'include',
  });

  // Handle Token Refresh on 401 Unauthorized
  if (response.status === 401 && accessToken) {
    try {
      const refreshed = await useAuthStore.getState().refreshToken();
      if (refreshed) {
        const newAccessToken = useAuthStore.getState().accessToken;
        headers['Authorization'] = `Bearer ${newAccessToken}`;
        response = await fetch(`${API_BASE_URL}${endpoint}`, {
          ...options,
          headers,
          credentials: 'include',
        });
      }
    } catch (err) {
      useAuthStore.getState().logout();
    }
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `Request failed with status ${response.status}`);
  }

  return response.json();
}
