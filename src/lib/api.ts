import type {
  BookmarkRecord,
  CollectionItem,
  DashboardStats,
  ReadingHistoryRecord,
  SiteSettings,
  User,
} from '../types';

let memoryToken: string | null = null;

export function setAuthToken(token: string | null) {
  memoryToken = token;
}

export function getAuthToken(): string | null {
  return memoryToken;
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers || {});
  if (memoryToken) {
    headers.set('Authorization', `Bearer ${memoryToken}`);
  }
  if (!(options.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const res = await fetch(path, { ...options, headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || `Permintaan gagal (${res.status})`);
  }
  return data as T;
}

export const api = {
  // Auth
  getAdminStatus: () => request<{ hasClaimedAdmin: boolean; hasEnvPasscode: boolean }>('/api/auth/admin/status'),
  claimAdmin: (payload: { name: string; email: string; password: string }) =>
    request<{ user: User; token: string }>('/api/auth/admin/claim', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  adminLogin: (payload: { email: string; password: string }) =>
    request<{ user: User; token: string }>('/api/auth/admin/login', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  register: (payload: { name: string; email: string; password: string; readingInterest?: string }) =>
    request<{ user: User; token: string }>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  login: (payload: { email: string; password: string }) =>
    request<{ user: User; token: string }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  me: () => request<{ user: User }>('/api/auth/me'),

  // Public site & collections
  getSiteSettings: () => request<SiteSettings>('/api/site-settings'),
  getCollections: (params?: Record<string, string>) => {
    const qs = params ? new URLSearchParams(params).toString() : '';
    return request<{ items: CollectionItem[] }>(`/api/collections${qs ? `?${qs}` : ''}`);
  },
  getCollection: (id: number) => request<{ item: CollectionItem }>(`/api/collections/${id}`),

  // User profile, bookmarks, reading history
  updateProfile: (payload: { name: string; bio: string; readingInterest: string }) =>
    request<{ user: User }>('/api/user/profile', {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),
  getBookmarks: () => request<{ bookmarks: BookmarkRecord[] }>('/api/user/bookmarks'),
  saveBookmark: (payload: { collectionId: number; note?: string; pageNumber?: number }) =>
    request<{ saved: boolean }>('/api/user/bookmarks', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  removeBookmark: (collectionId: number) =>
    request<{ removed: boolean }>(`/api/user/bookmarks/${collectionId}`, {
      method: 'DELETE',
    }),
  getReadingHistory: () => request<{ history: ReadingHistoryRecord[] }>('/api/user/reading-history'),
  saveReadingHistory: (payload: {
    collectionId: number;
    currentPage: number;
    totalPages: number;
    chapterIndex: number;
  }) =>
    request<{ saved: boolean; progressPercent: number }>('/api/user/reading-history', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  // Admin
  getAdminStats: () => request<DashboardStats>('/api/admin/stats'),
  uploadFile: (file: File, category: 'cover' | 'document' | 'audio' | 'video') => {
    const formData = new FormData();
    formData.append('category', category);
    formData.append('file', file);
    return request<{
      url: string;
      filename: string;
      format: string;
      extractedChapters?: Array<{ id: string; title: string; content: string }>;
    }>('/api/admin/upload', {
      method: 'POST',
      body: formData,
    });
  },
  createCollection: (payload: Partial<CollectionItem>) =>
    request<{ item: CollectionItem }>('/api/admin/collections', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  updateCollection: (id: number, payload: Partial<CollectionItem>) =>
    request<{ item: CollectionItem }>(`/api/admin/collections/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),
  deleteCollection: (id: number) =>
    request<{ deleted: boolean }>(`/api/admin/collections/${id}`, {
      method: 'DELETE',
    }),
  updateSiteSettings: (payload: Partial<SiteSettings>) =>
    request<SiteSettings>('/api/admin/site-settings', {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),
  getAdminUsers: () =>
    request<{ users: Array<User & { bookmarkCount: number }> }>('/api/admin/users'),
  updateAdminUser: (id: number, payload: { role?: 'member' | 'admin'; status?: 'active' | 'suspended' }) =>
    request<{ user: User }>(`/api/admin/users/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),
};
