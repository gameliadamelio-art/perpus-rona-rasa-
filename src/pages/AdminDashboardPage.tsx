import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  BookOpen,
  Check,
  Edit3,
  FileText,
  Film,
  LayoutTemplate,
  LogOut,
  Music,
  Plus,
  Search,
  Trash2,
  Upload,
  Users,
  X,
} from 'lucide-react';
import { ResilientImage } from '../components/ResilientImage';
import { useAuth } from '../context/AuthContext';
import { useSite } from '../context/SiteContext';
import { api } from '../lib/api';
import type {
  AlbumTrack,
  BookChapter,
  CollectionItem,
  CollectionType,
  DashboardStats,
  SiteSettings,
  User,
} from '../types';

interface AdminDashboardPageProps {
  onNavigate: (path: string) => void;
}

type AdminTab = 'summary' | 'collections' | 'cms' | 'users';

function createEmptyDraft(type: CollectionType = 'book'): Partial<CollectionItem> {
  return {
    type,
    title: '',
    creator: '',
    year: new Date().getFullYear(),
    genre: type === 'book' ? 'Fiksi Sastra' : type === 'poem' ? 'Puisi Kontemporer' : type === 'film' ? 'Drama Puitis' : 'Folk Akustik',
    subCategory:
      type === 'book'
        ? 'Novel'
        : type === 'poem'
        ? 'Puisi Individual'
        : type === 'film'
        ? 'Film Pendek'
        : 'Album Studio',
    description: '',
    coverUrl: '',
    fileUrl: '',
    mediaUrl: '',
    accessStatus: 'Tersedia Terbuka',
    isFeatured: false,
    metadata: {
      language: 'Bahasa Indonesia',
      digitalFormat: 'Teks Interaktif',
      chapters: type === 'book' ? [{ id: 'bab-1', title: 'Bagian Pertama', content: '' }] : [],
      tracks: type === 'album' ? [{ number: 1, title: '', duration: '03:00', audioUrl: '' }] : [],
    },
  };
}

export function AdminDashboardPage({ onNavigate }: AdminDashboardPageProps) {
  const { user, logout } = useAuth();
  const { settings, refreshSettings } = useSite();

  const [activeTab, setActiveTab] = useState<AdminTab>('summary');
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [collections, setCollections] = useState<CollectionItem[]>([]);
  const [usersList, setUsersList] = useState<Array<User & { bookmarkCount: number }>>([]);
  const [loading, setLoading] = useState(true);
  const [bannerMsg, setBannerMsg] = useState('');

  // Collection filters & editor
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [draft, setDraft] = useState<Partial<CollectionItem>>(createEmptyDraft('book'));
  const [uploadingField, setUploadingField] = useState('');
  const [savingCollection, setSavingCollection] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);

  // CMS Settings draft
  const [cmsDraft, setCmsDraft] = useState<SiteSettings>(settings);
  const [savingCms, setSavingCms] = useState(false);

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [sRes, cRes, uRes] = await Promise.all([
        api.getAdminStats(),
        api.getCollections({ sort: 'newest' }),
        api.getAdminUsers(),
      ]);
      setStats(sRes);
      setCollections(cRes.items);
      setUsersList(uRes.users);
    } catch (err) {
      setBannerMsg(err instanceof Error ? err.message : 'Gagal memuat data dashboard.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!user) {
      onNavigate('/admin/login');
      return;
    }
    if (user.role !== 'admin') {
      onNavigate('/');
      return;
    }
    loadAll();
  }, [user, onNavigate, loadAll]);

  useEffect(() => {
    setCmsDraft(settings);
  }, [settings]);

  if (!user || user.role !== 'admin') {
    return null;
  }

  const showNotice = (msg: string) => {
    setBannerMsg(msg);
    setTimeout(() => setBannerMsg(''), 4000);
  };

  const openNewCollection = (type: CollectionType = 'book') => {
    setEditingId(null);
    setDraft(createEmptyDraft(type));
    setEditorOpen(true);
  };

  const openEditCollection = (item: CollectionItem) => {
    setEditingId(item.id);
    setDraft(JSON.parse(JSON.stringify(item)));
    setEditorOpen(true);
  };

  const handleUploadAsset = async (
    file: File,
    category: 'cover' | 'document' | 'audio' | 'video',
    onSuccess: (res: {
      url: string;
      format: string;
      extractedChapters?: BookChapter[];
    }) => void
  ) => {
    setUploadingField(category);
    try {
      const res = await api.uploadFile(file, category);
      onSuccess(res);
      showNotice(`Berkas "${res.filename}" berhasil diunggah.`);
    } catch (err) {
      showNotice(err instanceof Error ? err.message : 'Gagal mengunggah berkas.');
    } finally {
      setUploadingField('');
    }
  };

  const handleSaveCollection = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingCollection(true);
    try {
      if (editingId) {
        await api.updateCollection(editingId, draft);
        showNotice('Koleksi berhasil diperbarui.');
      } else {
        await api.createCollection(draft);
        showNotice('Koleksi baru berhasil ditambahkan ke perpustakaan.');
      }
      setEditorOpen(false);
      await loadAll();
    } catch (err) {
      showNotice(err instanceof Error ? err.message : 'Gagal menyimpan koleksi.');
    } finally {
      setSavingCollection(false);
    }
  };

  const handleDeleteCollection = async (id: number) => {
    try {
      await api.deleteCollection(id);
      setConfirmDeleteId(null);
      showNotice('Koleksi telah dihapus.');
      await loadAll();
    } catch (err) {
      showNotice(err instanceof Error ? err.message : 'Gagal menghapus koleksi.');
    }
  };

  const handleSaveCms = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingCms(true);
    try {
      await api.updateSiteSettings(cmsDraft);
      await refreshSettings();
      showNotice('Perubahan halaman website berhasil disimpan dan langsung tayang.');
    } catch (err) {
      showNotice(err instanceof Error ? err.message : 'Gagal menyimpan pengaturan halaman.');
    } finally {
      setSavingCms(false);
    }
  };

  const handleToggleUserStatus = async (target: User) => {
    const nextStatus = target.status === 'active' ? 'suspended' : 'active';
    try {
      await api.updateAdminUser(target.id, { status: nextStatus });
      showNotice(`Status akun ${target.name} diubah menjadi ${nextStatus}.`);
      await loadAll();
    } catch (err) {
      showNotice(err instanceof Error ? err.message : 'Gagal memperbarui status pengguna.');
    }
  };

  const handleToggleUserRole = async (target: User) => {
    const nextRole = target.role === 'admin' ? 'member' : 'admin';
    try {
      await api.updateAdminUser(target.id, { role: nextRole });
      showNotice(`Peran ${target.name} diubah menjadi ${nextRole}.`);
      await loadAll();
    } catch (err) {
      showNotice(err instanceof Error ? err.message : 'Gagal mengubah peran pengguna.');
    }
  };

  const filteredCollections = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return collections.filter((item) => {
      if (typeFilter !== 'all' && item.type !== typeFilter) return false;
      if (q) {
        return (
          item.title.toLowerCase().includes(q) ||
          item.creator.toLowerCase().includes(q) ||
          item.genre.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [collections, typeFilter, searchTerm]);

  const updateMeta = (patch: Record<string, unknown>) => {
    setDraft((prev) => ({
      ...prev,
      metadata: {
        ...(prev.metadata || {}),
        ...patch,
      },
    }));
  };

  const chapters = draft.metadata?.chapters || [];
  const tracks = draft.metadata?.tracks || [];

  return (
    <div className="min-h-screen bg-[#FAF9F3]">
      {/* Top Admin Header */}
      <div className="bg-[#E8F0E3] border-b border-[#405344]/15">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-widest text-[#405344]">
              Dashboard Pustakawan · {user.name}
            </p>
            <h1 className="font-serif-display text-2xl sm:text-3xl font-medium text-[#222B24] mt-0.5">
              Pengelolaan Perpustakaan Rona Rasa
            </h1>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => openNewCollection('book')}
              className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium bg-[#405344] text-[#FAF9F3] rounded-lg hover:bg-[#2A382D] transition-colors whitespace-nowrap"
            >
              <Plus className="w-4 h-4" aria-hidden="true" />
              Tambah Koleksi
            </button>
            <button
              type="button"
              onClick={() => onNavigate('/')}
              className="px-4 py-2.5 text-sm font-medium text-[#405344] bg-[#FAF9F3] border border-[#405344]/20 rounded-lg hover:bg-[#DCE8D5] transition-colors whitespace-nowrap"
            >
              Lihat Website Publik
            </button>
            <button
              type="button"
              onClick={() => {
                logout();
                onNavigate('/');
              }}
              aria-label="Keluar dari akun admin"
              className="p-2.5 text-[#405344] bg-[#FAF9F3] border border-[#405344]/20 rounded-lg hover:bg-[#DCE8D5]"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex items-center gap-2 overflow-x-auto pb-0">
          {[
            { id: 'summary', label: 'Ringkasan', icon: BookOpen },
            { id: 'collections', label: 'Manajemen Koleksi', icon: FileText },
            { id: 'cms', label: 'Manajemen Halaman Website', icon: LayoutTemplate },
            { id: 'users', label: 'Manajemen Pengguna', icon: Users },
          ].map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as AdminTab)}
                className={`inline-flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap shrink-0 ${
                  active
                    ? 'border-[#405344] text-[#222B24] bg-[#FAF9F3]/70'
                    : 'border-transparent text-[#556358] hover:text-[#222B24]'
                }`}
              >
                <Icon className="w-4 h-4" aria-hidden="true" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        {bannerMsg && (
          <div
            role="status"
            className="mb-6 p-4 rounded-xl bg-[#E8F0E3] border border-[#405344]/25 text-sm text-[#222B24] flex items-center justify-between"
          >
            <span>{bannerMsg}</span>
            <button type="button" onClick={() => setBannerMsg('')} aria-label="Tutup pemberitahuan">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* TAB 1: SUMMARY */}
        {activeTab === 'summary' && (
          <div className="space-y-8">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {[
                { label: 'Total Buku', value: stats?.totalBooks ?? 0 },
                { label: 'Total Puisi', value: stats?.totalPoems ?? 0 },
                { label: 'Total Film', value: stats?.totalFilms ?? 0 },
                { label: 'Album Musik', value: stats?.totalAlbums ?? 0 },
                { label: 'Pengguna Terdaftar', value: stats?.totalUsers ?? 0 },
                { label: 'Koleksi Baru (30h)', value: stats?.recentlyAddedCount ?? 0 },
              ].map((kpi) => (
                <div
                  key={kpi.label}
                  className="p-5 rounded-xl bg-[#F3F7EF] border border-[#405344]/15"
                >
                  <p className="text-xs text-[#556358]">{kpi.label}</p>
                  <p className="font-serif-display text-3xl font-semibold text-[#222B24] tabular-nums mt-2">
                    {loading ? '—' : kpi.value}
                  </p>
                </div>
              ))}
            </div>

            <div className="p-6 rounded-xl bg-[#F3F7EF] border border-[#405344]/15 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="font-serif-display text-xl font-medium text-[#222B24]">
                  Tambah Koleksi Baru dengan Cepat
                </h2>
                <p className="text-sm text-[#556358] mt-1">
                  Unggah buku PDF/EPUB, tulis bab bacaan langsung, tambahkan puisi, arsip film, atau album musik.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {(
                  [
                    ['book', '+ Buku'],
                    ['poem', '+ Puisi'],
                    ['film', '+ Film'],
                    ['album', '+ Musik'],
                  ] as const
                ).map(([t, label]) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => openNewCollection(t)}
                    className="px-3.5 py-2 text-xs font-medium bg-[#FAF9F3] text-[#405344] border border-[#405344]/25 rounded-lg hover:bg-[#E8F0E3] whitespace-nowrap"
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-[#FAF9F3] border border-[#405344]/15 rounded-xl overflow-hidden">
              <div className="px-6 py-4 border-b border-[#405344]/10 flex items-center justify-between">
                <h2 className="font-serif-display text-lg font-medium text-[#222B24]">
                  Koleksi Terbaru di Database
                </h2>
                <button
                  type="button"
                  onClick={() => setActiveTab('collections')}
                  className="text-xs font-medium text-[#405344] hover:underline"
                >
                  Kelola semua →
                </button>
              </div>
              <div className="divide-y divide-[#405344]/10">
                {collections.slice(0, 6).map((item) => (
                  <div
                    key={item.id}
                    className="px-6 py-3.5 flex items-center justify-between gap-4 hover:bg-[#F3F7EF]/60"
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className="w-10 h-12 rounded overflow-hidden bg-[#E8F0E3] shrink-0">
                        <ResilientImage src={item.coverUrl} alt={item.title} type={item.type} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-[#222B24] truncate">{item.title}</p>
                        <p className="text-xs text-[#556358] truncate">
                          {item.creator} · <span className="tabular-nums">{item.year}</span> ·{' '}
                          {item.type.toUpperCase()}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => openEditCollection(item)}
                      className="text-xs font-medium text-[#405344] hover:underline shrink-0"
                    >
                      Sunting
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: COLLECTIONS MANAGEMENT */}
        {activeTab === 'collections' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-1.5 bg-[#E8F0E3] p-1 rounded-lg border border-[#405344]/15">
                {[
                  ['all', 'Semua'],
                  ['book', 'Buku'],
                  ['poem', 'Puisi'],
                  ['film', 'Film'],
                  ['album', 'Musik'],
                ].map(([id, label]) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setTypeFilter(id)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                      typeFilter === id
                        ? 'bg-[#FAF9F3] text-[#222B24]'
                        : 'text-[#556358] hover:text-[#222B24]'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              <div className="relative w-full sm:w-72">
                <Search className="w-4 h-4 text-[#556358] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="search"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Cari judul atau pengarang..."
                  className="w-full pl-9 pr-3 py-2 text-sm bg-[#FAF9F3] border border-[#405344]/20 rounded-lg"
                />
              </div>
            </div>

            <div className="bg-[#FAF9F3] border border-[#405344]/15 rounded-xl overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-[#405344]/15 bg-[#F3F7EF] text-xs text-[#556358]">
                    <th className="py-3 px-4 font-medium">Koleksi</th>
                    <th className="py-3 px-4 font-medium">Jenis / Kategori</th>
                    <th className="py-3 px-4 font-medium">Tahun</th>
                    <th className="py-3 px-4 font-medium">Akses</th>
                    <th className="py-3 px-4 font-medium text-right">Tindakan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#405344]/10 text-sm">
                  {filteredCollections.map((item) => (
                    <tr key={item.id} className="hover:bg-[#F3F7EF]/50">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-12 rounded overflow-hidden bg-[#E8F0E3] shrink-0">
                            <ResilientImage src={item.coverUrl} alt={item.title} type={item.type} />
                          </div>
                          <div>
                            <p className="font-medium text-[#222B24]">{item.title}</p>
                            <p className="text-xs text-[#556358]">{item.creator}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-xs text-[#556358]">
                        {item.subCategory || item.type} · {item.genre}
                        {item.isFeatured && (
                          <span className="block text-[#405344] font-medium mt-0.5">
                            Unggulan Beranda
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 font-mono-tabular text-xs text-[#222B24]">
                        {item.year}
                      </td>
                      <td className="py-3 px-4 text-xs text-[#556358]">{item.accessStatus}</td>
                      <td className="py-3 px-4 text-right">
                        <div className="inline-flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => openEditCollection(item)}
                            aria-label={`Sunting ${item.title}`}
                            className="p-2 rounded-md text-[#405344] hover:bg-[#E8F0E3]"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>

                          {confirmDeleteId === item.id ? (
                            <div className="inline-flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => handleDeleteCollection(item.id)}
                                className="px-2.5 py-1 text-xs font-medium bg-[#9A3412] text-white rounded"
                              >
                                Hapus
                              </button>
                              <button
                                type="button"
                                onClick={() => setConfirmDeleteId(null)}
                                className="px-2 py-1 text-xs text-[#556358]"
                              >
                                Batal
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteId(item.id)}
                              aria-label={`Hapus ${item.title}`}
                              className="p-2 rounded-md text-[#556358] hover:text-[#9A3412] hover:bg-[#9A3412]/10"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 3: CMS SITE SETTINGS */}
        {activeTab === 'cms' && (
          <form onSubmit={handleSaveCms} className="space-y-8 max-w-4xl">
            <section className="p-6 rounded-xl bg-[#F3F7EF] border border-[#405344]/15 space-y-5">
              <h2 className="font-serif-display text-2xl font-medium text-[#222B24]">
                Identitas &amp; Halaman Beranda
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-[#222B24] mb-1">
                    Nama Perpustakaan
                  </label>
                  <input
                    type="text"
                    value={cmsDraft.libraryName}
                    onChange={(e) => setCmsDraft({ ...cmsDraft, libraryName: e.target.value })}
                    className="w-full px-3 py-2 text-sm bg-[#FAF9F3] border border-[#405344]/20 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#222B24] mb-1">Tagline</label>
                  <input
                    type="text"
                    value={cmsDraft.tagline}
                    onChange={(e) => setCmsDraft({ ...cmsDraft, tagline: e.target.value })}
                    className="w-full px-3 py-2 text-sm bg-[#FAF9F3] border border-[#405344]/20 rounded-lg"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-[#222B24] mb-1">
                  Judul Utama Beranda (Hero Title)
                </label>
                <input
                  type="text"
                  value={cmsDraft.heroTitle}
                  onChange={(e) => setCmsDraft({ ...cmsDraft, heroTitle: e.target.value })}
                  className="w-full px-3 py-2 text-sm bg-[#FAF9F3] border border-[#405344]/20 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#222B24] mb-1">
                  Deskripsi Singkat Perpustakaan
                </label>
                <textarea
                  rows={2}
                  value={cmsDraft.heroDescription}
                  onChange={(e) => setCmsDraft({ ...cmsDraft, heroDescription: e.target.value })}
                  className="w-full px-3 py-2 text-sm bg-[#FAF9F3] border border-[#405344]/20 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#222B24] mb-1">
                  Teks Sambutan Beranda
                </label>
                <textarea
                  rows={2}
                  value={cmsDraft.welcomeText}
                  onChange={(e) => setCmsDraft({ ...cmsDraft, welcomeText: e.target.value })}
                  className="w-full px-3 py-2 text-sm bg-[#FAF9F3] border border-[#405344]/20 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#222B24] mb-1">
                  Foto Banner Beranda
                </label>
                <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
                  <input
                    type="text"
                    value={cmsDraft.heroBannerUrl}
                    onChange={(e) => setCmsDraft({ ...cmsDraft, heroBannerUrl: e.target.value })}
                    className="flex-1 w-full px-3 py-2 text-sm bg-[#FAF9F3] border border-[#405344]/20 rounded-lg"
                  />
                  <label className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium bg-[#E8F0E3] text-[#405344] border border-[#405344]/20 rounded-lg cursor-pointer hover:bg-[#DCE8D5] shrink-0">
                    <Upload className="w-3.5 h-3.5" />
                    Unggah Foto Banner
                    <input
                      type="file"
                      accept="image/*"
                      className="sr-only"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          handleUploadAsset(file, 'cover', (res) =>
                            setCmsDraft((prev) => ({ ...prev, heroBannerUrl: res.url }))
                          );
                        }
                      }}
                    />
                  </label>
                </div>
              </div>

              <div>
                <p className="text-xs font-medium text-[#222B24] mb-2">
                  Koleksi Unggulan yang Ditampilkan di Beranda
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-56 overflow-y-auto p-3 rounded-lg bg-[#FAF9F3] border border-[#405344]/15">
                  {collections.map((col) => {
                    const checked = cmsDraft.featuredCollectionIds.includes(col.id);
                    return (
                      <label key={col.id} className="flex items-center gap-2.5 text-sm cursor-pointer">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(e) => {
                            const next = e.target.checked
                              ? [...cmsDraft.featuredCollectionIds, col.id]
                              : cmsDraft.featuredCollectionIds.filter((id) => id !== col.id);
                            setCmsDraft({ ...cmsDraft, featuredCollectionIds: next });
                          }}
                          className="accent-[#405344]"
                        />
                        <span className="truncate">
                          {col.title} <span className="text-xs text-[#556358]">({col.type})</span>
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>
            </section>

            <section className="p-6 rounded-xl bg-[#F3F7EF] border border-[#405344]/15 space-y-5">
              <h2 className="font-serif-display text-2xl font-medium text-[#222B24]">
                Konten Halaman About Perpustakaan
              </h2>

              {[
                ['aboutHistory', 'Sejarah & Latar Belakang'],
                ['aboutVision', 'Visi Perpustakaan'],
                ['aboutMission', 'Misi Perpustakaan'],
                ['aboutGoals', 'Tujuan Perpustakaan'],
                ['aboutCollectionFocus', 'Fokus Koleksi'],
                ['aboutContribution', 'Kontribusi Pelestarian Sastra & Budaya'],
              ].map(([key, label]) => (
                <div key={key}>
                  <label className="block text-xs font-medium text-[#222B24] mb-1">{label}</label>
                  <textarea
                    rows={3}
                    value={String(cmsDraft[key as keyof SiteSettings] || '')}
                    onChange={(e) => setCmsDraft({ ...cmsDraft, [key]: e.target.value })}
                    className="w-full px-3 py-2 text-sm bg-[#FAF9F3] border border-[#405344]/20 rounded-lg"
                  />
                </div>
              ))}

              <div>
                <label className="block text-xs font-medium text-[#222B24] mb-1">
                  Foto Ruang Baca (Halaman About)
                </label>
                <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
                  <input
                    type="text"
                    value={cmsDraft.aboutImageUrl}
                    onChange={(e) => setCmsDraft({ ...cmsDraft, aboutImageUrl: e.target.value })}
                    className="flex-1 w-full px-3 py-2 text-sm bg-[#FAF9F3] border border-[#405344]/20 rounded-lg"
                  />
                  <label className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium bg-[#E8F0E3] text-[#405344] border border-[#405344]/20 rounded-lg cursor-pointer hover:bg-[#DCE8D5] shrink-0">
                    <Upload className="w-3.5 h-3.5" />
                    Unggah Foto
                    <input
                      type="file"
                      accept="image/*"
                      className="sr-only"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          handleUploadAsset(file, 'cover', (res) =>
                            setCmsDraft((prev) => ({ ...prev, aboutImageUrl: res.url }))
                          );
                        }
                      }}
                    />
                  </label>
                </div>
              </div>
            </section>

            <button
              type="submit"
              disabled={savingCms}
              className="inline-flex items-center gap-2 px-6 py-3 text-sm font-medium bg-[#405344] text-[#FAF9F3] rounded-lg hover:bg-[#2A382D] transition-colors"
            >
              <Check className="w-4 h-4" />
              {savingCms ? 'Menyimpan Perubahan...' : 'Simpan Semua Perubahan Halaman'}
            </button>
          </form>
        )}

        {/* TAB 4: USERS MANAGEMENT */}
        {activeTab === 'users' && (
          <div className="bg-[#FAF9F3] border border-[#405344]/15 rounded-xl overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#405344]/15 bg-[#F3F7EF] text-xs text-[#556358]">
                  <th className="py-3 px-4 font-medium">Nama &amp; Email</th>
                  <th className="py-3 px-4 font-medium">Peran</th>
                  <th className="py-3 px-4 font-medium">Status</th>
                  <th className="py-3 px-4 font-medium">Bookmark</th>
                  <th className="py-3 px-4 font-medium text-right">Pengaturan Akses</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#405344]/10 text-sm">
                {usersList.map((u) => {
                  const isSelf = u.id === user.id;
                  return (
                    <tr key={u.id} className="hover:bg-[#F3F7EF]/50">
                      <td className="py-3 px-4">
                        <p className="font-medium text-[#222B24]">{u.name}</p>
                        <p className="text-xs text-[#556358]">{u.email}</p>
                      </td>
                      <td className="py-3 px-4 text-xs font-medium text-[#405344]">
                        {u.role === 'admin' ? 'Admin / Pustakawan' : 'Anggota'}
                      </td>
                      <td className="py-3 px-4 text-xs">
                        <span
                          className={
                            u.status === 'active' ? 'text-[#405344] font-medium' : 'text-[#9A3412]'
                          }
                        >
                          {u.status === 'active' ? 'Aktif' : 'Dinonaktifkan'}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono-tabular text-xs">{u.bookmarkCount}</td>
                      <td className="py-3 px-4 text-right space-x-2">
                        {isSelf ? (
                          <span className="text-xs text-[#556358]">Akun Anda saat ini</span>
                        ) : (
                          <>
                            <button
                              type="button"
                              onClick={() => handleToggleUserRole(u)}
                              className="px-3 py-1.5 text-xs font-medium border border-[#405344]/25 rounded-md text-[#405344] hover:bg-[#E8F0E3]"
                            >
                              Ubah ke {u.role === 'admin' ? 'Anggota' : 'Admin'}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleToggleUserStatus(u)}
                              className="px-3 py-1.5 text-xs font-medium border border-[#405344]/25 rounded-md text-[#222B24] hover:bg-[#E8F0E3]"
                            >
                              {u.status === 'active' ? 'Nonaktifkan' : 'Aktifkan'}
                            </button>
                          </>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </main>

      {/* COLLECTION CREATE / EDIT MODAL */}
      {editorOpen && (
        <div className="fixed inset-0 z-50 bg-black/45 flex items-center justify-center p-4 overflow-y-auto">
          <div
            role="dialog"
            aria-modal="true"
            aria-label={editingId ? 'Sunting Koleksi' : 'Tambah Koleksi Baru'}
            className="bg-[#FAF9F3] border border-[#405344]/20 rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto p-6 sm:p-8 space-y-6"
          >
            <div className="flex items-center justify-between pb-4 border-b border-[#405344]/15">
              <h2 className="font-serif-display text-2xl font-medium text-[#222B24]">
                {editingId ? 'Sunting Koleksi' : 'Tambah Koleksi Baru'}
              </h2>
              <button
                type="button"
                onClick={() => setEditorOpen(false)}
                aria-label="Tutup jendela"
                className="p-2 rounded-lg hover:bg-[#E8F0E3]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveCollection} className="space-y-5">
              {/* Type selector */}
              {!editingId && (
                <div>
                  <p className="text-xs font-medium text-[#222B24] mb-2">Jenis Koleksi</p>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {[
                      { id: 'book', label: 'Buku Sastra', icon: BookOpen },
                      { id: 'poem', label: 'Puisi', icon: FileText },
                      { id: 'film', label: 'Sastra Film', icon: Film },
                      { id: 'album', label: 'Album Musik', icon: Music },
                    ].map((opt) => {
                      const Icon = opt.icon;
                      const active = draft.type === opt.id;
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => setDraft(createEmptyDraft(opt.id as CollectionType))}
                          className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-xs font-medium border transition-colors ${
                            active
                              ? 'bg-[#405344] text-[#FAF9F3] border-[#405344]'
                              : 'bg-[#F3F7EF] text-[#556358] border-[#405344]/20'
                          }`}
                        >
                          <Icon className="w-4 h-4" />
                          {opt.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Core Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-[#222B24] mb-1">
                    {draft.type === 'album' ? 'Nama Album' : 'Judul Karya'} *
                  </label>
                  <input
                    type="text"
                    required
                    value={draft.title || ''}
                    onChange={(e) => setDraft({ ...draft, title: e.target.value })}
                    className="w-full px-3 py-2 text-sm bg-white border border-[#405344]/20 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#222B24] mb-1">
                    {draft.type === 'book'
                      ? 'Pengarang'
                      : draft.type === 'poem'
                      ? 'Nama Penyair'
                      : draft.type === 'film'
                      ? 'Sutradara'
                      : 'Musisi / Band'}{' '}
                    *
                  </label>
                  <input
                    type="text"
                    required
                    value={draft.creator || ''}
                    onChange={(e) => setDraft({ ...draft, creator: e.target.value })}
                    className="w-full px-3 py-2 text-sm bg-white border border-[#405344]/20 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#222B24] mb-1">
                    Tahun Terbit / Rilis *
                  </label>
                  <input
                    type="number"
                    required
                    value={draft.year || 2025}
                    onChange={(e) => setDraft({ ...draft, year: Number(e.target.value) })}
                    className="w-full px-3 py-2 text-sm bg-white border border-[#405344]/20 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#222B24] mb-1">Genre *</label>
                  <input
                    type="text"
                    required
                    value={draft.genre || ''}
                    onChange={(e) => setDraft({ ...draft, genre: e.target.value })}
                    className="w-full px-3 py-2 text-sm bg-white border border-[#405344]/20 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#222B24] mb-1">
                    Kategori / Sub-jenis
                  </label>
                  <input
                    type="text"
                    value={draft.subCategory || ''}
                    onChange={(e) => setDraft({ ...draft, subCategory: e.target.value })}
                    placeholder="Novel / Kumpulan Cerpen / Puisi Individual..."
                    className="w-full px-3 py-2 text-sm bg-white border border-[#405344]/20 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#222B24] mb-1">
                    Status Ketersediaan Akses
                  </label>
                  <select
                    value={draft.accessStatus || 'Tersedia Terbuka'}
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        accessStatus: e.target.value as CollectionItem['accessStatus'],
                      })
                    }
                    className="w-full px-3 py-2 text-sm bg-white border border-[#405344]/20 rounded-lg"
                  >
                    <option value="Tersedia Terbuka">Tersedia Terbuka</option>
                    <option value="Khusus Anggota">Khusus Anggota</option>
                    <option value="Arsip Terbatas">Arsip Terbatas</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-[#222B24] mb-1">
                  {draft.type === 'film' ? 'Sinopsis Film *' : 'Deskripsi / Sinopsis *'}
                </label>
                <textarea
                  rows={3}
                  required
                  value={draft.description || ''}
                  onChange={(e) => setDraft({ ...draft, description: e.target.value })}
                  className="w-full px-3 py-2 text-sm bg-white border border-[#405344]/20 rounded-lg"
                />
              </div>

              {/* Cover Upload */}
              <div className="p-4 rounded-xl bg-[#F3F7EF] border border-[#405344]/15 space-y-2">
                <label className="block text-xs font-medium text-[#222B24]">
                  {draft.type === 'film'
                    ? 'Poster Film'
                    : draft.type === 'album'
                    ? 'Cover Album'
                    : 'Cover Buku / Ilustrasi'}
                </label>
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="text"
                    value={draft.coverUrl || ''}
                    onChange={(e) => setDraft({ ...draft, coverUrl: e.target.value })}
                    placeholder="URL gambar atau unggah dari perangkat"
                    className="flex-1 px-3 py-2 text-sm bg-white border border-[#405344]/20 rounded-lg"
                  />
                  <label className="inline-flex items-center justify-center gap-2 px-4 py-2 text-xs font-medium bg-[#405344] text-[#FAF9F3] rounded-lg cursor-pointer hover:bg-[#2A382D] shrink-0">
                    <Upload className="w-3.5 h-3.5" />
                    {uploadingField === 'cover' ? 'Mengunggah...' : 'Unggah Cover'}
                    <input
                      type="file"
                      accept="image/*"
                      className="sr-only"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          handleUploadAsset(file, 'cover', (res) =>
                            setDraft((prev) => ({ ...prev, coverUrl: res.url }))
                          );
                        }
                      }}
                    />
                  </label>
                </div>
              </div>

              {/* BOOK SPECIFIC METADATA & CHAPTERS */}
              {draft.type === 'book' && (
                <div className="space-y-4 pt-2 border-t border-[#405344]/15">
                  <h3 className="font-serif-display text-lg font-medium text-[#222B24]">
                    Metadata Bibliografis &amp; Isi Buku Digital
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs text-[#556358] mb-1">Penerbit</label>
                      <input
                        type="text"
                        value={draft.metadata?.publisher || ''}
                        onChange={(e) => updateMeta({ publisher: e.target.value })}
                        className="w-full px-3 py-2 text-sm bg-white border border-[#405344]/20 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-[#556358] mb-1">ISBN / Klasifikasi</label>
                      <input
                        type="text"
                        value={draft.metadata?.isbn || ''}
                        onChange={(e) => updateMeta({ isbn: e.target.value })}
                        className="w-full px-3 py-2 text-sm bg-white border border-[#405344]/20 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-[#556358] mb-1">Jumlah Halaman</label>
                      <input
                        type="number"
                        value={draft.metadata?.pageCount || ''}
                        onChange={(e) => updateMeta({ pageCount: Number(e.target.value) })}
                        className="w-full px-3 py-2 text-sm bg-white border border-[#405344]/20 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-[#556358] mb-1">Bahasa</label>
                      <input
                        type="text"
                        value={draft.metadata?.language || 'Bahasa Indonesia'}
                        onChange={(e) => updateMeta({ language: e.target.value })}
                        className="w-full px-3 py-2 text-sm bg-white border border-[#405344]/20 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-[#556358] mb-1">Subjek</label>
                      <input
                        type="text"
                        value={draft.metadata?.subject || ''}
                        onChange={(e) => updateMeta({ subject: e.target.value })}
                        className="w-full px-3 py-2 text-sm bg-white border border-[#405344]/20 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-[#556358] mb-1">Format Digital</label>
                      <select
                        value={draft.metadata?.digitalFormat || 'Teks Interaktif'}
                        onChange={(e) => updateMeta({ digitalFormat: e.target.value })}
                        className="w-full px-3 py-2 text-sm bg-white border border-[#405344]/20 rounded-lg"
                      >
                        <option value="Teks Interaktif">Teks Interaktif</option>
                        <option value="PDF">PDF</option>
                        <option value="EPUB">EPUB</option>
                      </select>
                    </div>
                  </div>

                  {/* PDF / EPUB Upload */}
                  <div className="p-4 rounded-xl bg-[#E8F0E3]/60 border border-[#405344]/15 space-y-2">
                    <label className="block text-xs font-medium text-[#222B24]">
                      Unggah File Buku Digital (PDF atau EPUB) — Opsional
                    </label>
                    <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-center">
                      <input
                        type="text"
                        value={draft.fileUrl || ''}
                        onChange={(e) => setDraft({ ...draft, fileUrl: e.target.value })}
                        placeholder="Path berkas PDF/EPUB"
                        className="flex-1 w-full px-3 py-2 text-sm bg-white border border-[#405344]/20 rounded-lg"
                      />
                      <label className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium bg-[#405344] text-[#FAF9F3] rounded-lg cursor-pointer hover:bg-[#2A382D] shrink-0">
                        <Upload className="w-3.5 h-3.5" />
                        {uploadingField === 'document' ? 'Memproses...' : 'Unggah PDF / EPUB'}
                        <input
                          type="file"
                          accept=".pdf,.epub"
                          className="sr-only"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              handleUploadAsset(file, 'document', (res) => {
                                setDraft((prev) => ({
                                  ...prev,
                                  fileUrl: res.url,
                                  metadata: {
                                    ...(prev.metadata || {}),
                                    digitalFormat: res.format === 'EPUB' ? 'EPUB' : 'PDF',
                                    chapters:
                                      res.extractedChapters && res.extractedChapters.length > 0
                                        ? res.extractedChapters
                                        : prev.metadata?.chapters || [],
                                  },
                                }));
                              });
                            }
                          }}
                        />
                      </label>
                    </div>
                    <p className="text-xs text-[#556358]">
                      Jika mengunggah EPUB, bab-bab buku otomatis diekstrak ke dalam Digital Book Reader di bawah.
                    </p>
                  </div>

                  {/* Chapters Editor */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-[#222B24]">
                        Isi Bab Buku (untuk pembaca internal)
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          updateMeta({
                            chapters: [
                              ...chapters,
                              {
                                id: `bab-${chapters.length + 1}`,
                                title: `Bagian ${chapters.length + 1}`,
                                content: '',
                              },
                            ],
                          })
                        }
                        className="text-xs font-medium text-[#405344] hover:underline"
                      >
                        + Tambah Bab
                      </button>
                    </div>

                    {chapters.map((chap, idx) => (
                      <div
                        key={chap.id}
                        className="p-4 rounded-xl bg-[#F3F7EF] border border-[#405344]/15 space-y-2"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <input
                            type="text"
                            value={chap.title}
                            onChange={(e) => {
                              const next = [...chapters];
                              next[idx] = { ...chap, title: e.target.value };
                              updateMeta({ chapters: next });
                            }}
                            placeholder="Judul bab"
                            className="flex-1 px-3 py-1.5 text-sm font-medium bg-white border border-[#405344]/20 rounded-lg"
                          />
                          {chapters.length > 1 && (
                            <button
                              type="button"
                              onClick={() =>
                                updateMeta({
                                  chapters: chapters.filter((_, i) => i !== idx),
                                })
                              }
                              className="text-xs text-[#9A3412] px-2 py-1"
                            >
                              Hapus Bab
                            </button>
                          )}
                        </div>
                        <textarea
                          rows={4}
                          value={chap.content}
                          onChange={(e) => {
                            const next = [...chapters];
                            next[idx] = { ...chap, content: e.target.value };
                            updateMeta({ chapters: next });
                          }}
                          placeholder="Tulis teks isi bab di sini..."
                          className="w-full px-3 py-2 text-sm bg-white border border-[#405344]/20 rounded-lg"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* POEM SPECIFIC METADATA */}
              {draft.type === 'poem' && (
                <div className="space-y-4 pt-2 border-t border-[#405344]/15">
                  <h3 className="font-serif-display text-lg font-medium text-[#222B24]">
                    Metadata &amp; Teks Puisi
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs text-[#556358] mb-1">Sumber Publikasi</label>
                      <input
                        type="text"
                        value={draft.metadata?.publicationSource || ''}
                        onChange={(e) => updateMeta({ publicationSource: e.target.value })}
                        className="w-full px-3 py-2 text-sm bg-white border border-[#405344]/20 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-[#556358] mb-1">Tema</label>
                      <input
                        type="text"
                        value={draft.metadata?.theme || ''}
                        onChange={(e) => updateMeta({ theme: e.target.value })}
                        className="w-full px-3 py-2 text-sm bg-white border border-[#405344]/20 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-[#556358] mb-1">Periode Sastra</label>
                      <input
                        type="text"
                        value={draft.metadata?.era || ''}
                        onChange={(e) => updateMeta({ era: e.target.value })}
                        placeholder="Sastra Klasik / Kontemporer"
                        className="w-full px-3 py-2 text-sm bg-white border border-[#405344]/20 rounded-lg"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[#222B24] mb-1">
                      Isi Puisi Lengkap
                    </label>
                    <textarea
                      rows={8}
                      value={draft.metadata?.poemText || ''}
                      onChange={(e) => updateMeta({ poemText: e.target.value })}
                      placeholder="Tuliskan bait-bait puisi..."
                      className="w-full px-3 py-2 text-sm font-serif-display bg-white border border-[#405344]/20 rounded-lg leading-relaxed"
                    />
                  </div>
                </div>
              )}

              {/* FILM SPECIFIC METADATA */}
              {draft.type === 'film' && (
                <div className="space-y-4 pt-2 border-t border-[#405344]/15">
                  <h3 className="font-serif-display text-lg font-medium text-[#222B24]">
                    Metadata &amp; Berkas Film
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-[#556358] mb-1">Durasi</label>
                      <input
                        type="text"
                        value={draft.metadata?.duration || ''}
                        onChange={(e) => updateMeta({ duration: e.target.value })}
                        placeholder="Contoh: 24 menit"
                        className="w-full px-3 py-2 text-sm bg-white border border-[#405344]/20 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-[#556358] mb-1">Rumah Produksi</label>
                      <input
                        type="text"
                        value={draft.metadata?.productionHouse || ''}
                        onChange={(e) => updateMeta({ productionHouse: e.target.value })}
                        className="w-full px-3 py-2 text-sm bg-white border border-[#405344]/20 rounded-lg"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-xs text-[#556358] mb-1">Pemeran</label>
                      <input
                        type="text"
                        value={draft.metadata?.castMembers || ''}
                        onChange={(e) => updateMeta({ castMembers: e.target.value })}
                        className="w-full px-3 py-2 text-sm bg-white border border-[#405344]/20 rounded-lg"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-xs text-[#556358] mb-1">Informasi Akses</label>
                      <input
                        type="text"
                        value={draft.metadata?.accessInfo || ''}
                        onChange={(e) => updateMeta({ accessInfo: e.target.value })}
                        className="w-full px-3 py-2 text-sm bg-white border border-[#405344]/20 rounded-lg"
                      />
                    </div>
                  </div>
                  <div className="p-4 rounded-xl bg-[#E8F0E3]/60 border border-[#405344]/15 space-y-2">
                    <label className="block text-xs font-medium text-[#222B24]">
                      Video Berlisensi (MP4/WebM) atau Tautan Sematan Resmi (YouTube/Vimeo/Archive.org)
                    </label>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <input
                        type="text"
                        value={draft.mediaUrl || ''}
                        onChange={(e) => setDraft({ ...draft, mediaUrl: e.target.value })}
                        placeholder="https://... atau unggah berkas video"
                        className="flex-1 px-3 py-2 text-sm bg-white border border-[#405344]/20 rounded-lg"
                      />
                      <label className="inline-flex items-center justify-center gap-2 px-4 py-2 text-xs font-medium bg-[#405344] text-[#FAF9F3] rounded-lg cursor-pointer shrink-0">
                        <Upload className="w-3.5 h-3.5" />
                        {uploadingField === 'video' ? 'Mengunggah...' : 'Unggah Video'}
                        <input
                          type="file"
                          accept=".mp4,.webm,.ogv"
                          className="sr-only"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              handleUploadAsset(file, 'video', (res) =>
                                setDraft((prev) => ({ ...prev, mediaUrl: res.url }))
                              );
                            }
                          }}
                        />
                      </label>
                    </div>
                  </div>
                </div>
              )}

              {/* ALBUM SPECIFIC METADATA */}
              {draft.type === 'album' && (
                <div className="space-y-4 pt-2 border-t border-[#405344]/15">
                  <h3 className="font-serif-display text-lg font-medium text-[#222B24]">
                    Metadata Album &amp; Daftar Lagu
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-[#556358] mb-1">Label Rekaman</label>
                      <input
                        type="text"
                        value={draft.metadata?.recordLabel || ''}
                        onChange={(e) => updateMeta({ recordLabel: e.target.value })}
                        className="w-full px-3 py-2 text-sm bg-white border border-[#405344]/20 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-[#556358] mb-1">Informasi Akses</label>
                      <input
                        type="text"
                        value={draft.metadata?.accessInfo || ''}
                        onChange={(e) => updateMeta({ accessInfo: e.target.value })}
                        className="w-full px-3 py-2 text-sm bg-white border border-[#405344]/20 rounded-lg"
                      />
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-[#222B24]">Daftar Lagu (Tracklist)</span>
                      <button
                        type="button"
                        onClick={() =>
                          updateMeta({
                            tracks: [
                              ...tracks,
                              {
                                number: tracks.length + 1,
                                title: '',
                                duration: '03:00',
                                audioUrl: '',
                              },
                            ],
                          })
                        }
                        className="text-xs font-medium text-[#405344] hover:underline"
                      >
                        + Tambah Lagu
                      </button>
                    </div>

                    {tracks.map((track: AlbumTrack, idx: number) => (
                      <div
                        key={idx}
                        className="p-3.5 rounded-xl bg-[#F3F7EF] border border-[#405344]/15 grid grid-cols-1 sm:grid-cols-12 gap-2 items-center"
                      >
                        <input
                          type="number"
                          value={track.number}
                          onChange={(e) => {
                            const next = [...tracks];
                            next[idx] = { ...track, number: Number(e.target.value) };
                            updateMeta({ tracks: next });
                          }}
                          className="sm:col-span-1 px-2 py-1.5 text-xs bg-white border border-[#405344]/20 rounded"
                        />
                        <input
                          type="text"
                          value={track.title}
                          onChange={(e) => {
                            const next = [...tracks];
                            next[idx] = { ...track, title: e.target.value };
                            updateMeta({ tracks: next });
                          }}
                          placeholder="Judul lagu"
                          className="sm:col-span-5 px-2.5 py-1.5 text-xs bg-white border border-[#405344]/20 rounded"
                        />
                        <input
                          type="text"
                          value={track.duration}
                          onChange={(e) => {
                            const next = [...tracks];
                            next[idx] = { ...track, duration: e.target.value };
                            updateMeta({ tracks: next });
                          }}
                          placeholder="03:15"
                          className="sm:col-span-2 px-2 py-1.5 text-xs bg-white border border-[#405344]/20 rounded"
                        />
                        <div className="sm:col-span-4 flex items-center gap-2">
                          <label className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium bg-[#405344] text-[#FAF9F3] rounded cursor-pointer shrink-0">
                            <Upload className="w-3 h-3" />
                            Audio
                            <input
                              type="file"
                              accept=".mp3,.wav,.ogg,.m4a"
                              className="sr-only"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  handleUploadAsset(file, 'audio', (res) => {
                                    const next = [...tracks];
                                    next[idx] = { ...track, audioUrl: res.url };
                                    updateMeta({ tracks: next });
                                  });
                                }
                              }}
                            />
                          </label>
                          {track.audioUrl && (
                            <span className="text-[11px] text-[#405344] truncate">Tersimpan</span>
                          )}
                          {tracks.length > 1 && (
                            <button
                              type="button"
                              onClick={() =>
                                updateMeta({
                                  tracks: tracks.filter((_, i) => i !== idx),
                                })
                              }
                              className="text-xs text-[#9A3412] ml-auto"
                            >
                              ×
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <label className="flex items-center gap-2.5 text-sm text-[#222B24] cursor-pointer pt-2">
                <input
                  type="checkbox"
                  checked={Boolean(draft.isFeatured)}
                  onChange={(e) => setDraft({ ...draft, isFeatured: e.target.checked })}
                  className="accent-[#405344]"
                />
                Tandai sebagai Koleksi Unggulan
              </label>

              <div className="pt-4 border-t border-[#405344]/15 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setEditorOpen(false)}
                  className="px-4 py-2.5 text-sm font-medium text-[#556358] hover:text-[#222B24]"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={savingCollection}
                  className="px-6 py-2.5 text-sm font-medium bg-[#405344] text-[#FAF9F3] rounded-lg hover:bg-[#2A382D]"
                >
                  {savingCollection ? 'Menyimpan...' : editingId ? 'Simpan Perubahan' : 'Tambahkan Koleksi'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
