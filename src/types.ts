export type CollectionType = 'book' | 'poem' | 'film' | 'album';

export type UserRole = 'member' | 'admin';
export type UserStatus = 'active' | 'suspended';

export interface User {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  bio: string;
  readingInterest: string;
  createdAt: string;
}

export interface BookChapter {
  id: string;
  title: string;
  content: string;
}

export interface AlbumTrack {
  number: number;
  title: string;
  duration: string;
  audioUrl?: string;
}

export interface CollectionMetadata {
  // Book fields
  publisher?: string;
  isbn?: string;
  pageCount?: number;
  language?: string;
  subject?: string;
  digitalFormat?: 'Teks Interaktif' | 'PDF' | 'EPUB';
  chapters?: BookChapter[];

  // Poem fields
  publicationSource?: string;
  theme?: string;
  era?: string;
  poemText?: string;

  // Film fields
  duration?: string;
  castMembers?: string;
  productionHouse?: string;
  accessInfo?: string;

  // Album fields
  recordLabel?: string;
  tracks?: AlbumTrack[];
}

export interface CollectionItem {
  id: number;
  type: CollectionType;
  title: string;
  creator: string;
  year: number;
  genre: string;
  subCategory: string;
  description: string;
  coverUrl: string;
  fileUrl: string;
  mediaUrl: string;
  accessStatus: 'Tersedia Terbuka' | 'Khusus Anggota' | 'Arsip Terbatas';
  isFeatured: boolean;
  metadata: CollectionMetadata;
  createdAt: string;
  updatedAt: string;
}

export interface BookmarkRecord {
  id: number;
  userId: number;
  collectionId: number;
  note: string;
  pageNumber: number;
  createdAt: string;
  collection?: CollectionItem;
}

export interface ReadingHistoryRecord {
  id: number;
  userId: number;
  collectionId: number;
  currentPage: number;
  totalPages: number;
  chapterIndex: number;
  progressPercent: number;
  lastReadAt: string;
  collection?: CollectionItem;
}

export interface SiteSettings {
  libraryName: string;
  tagline: string;
  heroTitle: string;
  heroDescription: string;
  welcomeText: string;
  heroBannerUrl: string;
  featuredCollectionIds: number[];
  aboutHistory: string;
  aboutVision: string;
  aboutMission: string;
  aboutGoals: string;
  aboutCollectionFocus: string;
  aboutContribution: string;
  aboutImageUrl: string;
  updatedAt: string;
}

export interface DashboardStats {
  totalBooks: number;
  totalPoems: number;
  totalFilms: number;
  totalAlbums: number;
  totalUsers: number;
  recentlyAddedCount: number;
}
