import React, { useEffect, useState } from 'react';
import { BookOpen, Bookmark, LogOut, ShieldCheck, Trash2 } from 'lucide-react';
import { ResilientImage } from '../components/ResilientImage';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';
import type { BookmarkRecord, ReadingHistoryRecord } from '../types';

interface ProfilePageProps {
  onNavigate: (path: string) => void;
}

export function ProfilePage({ onNavigate }: ProfilePageProps) {
  const { user, setUser, logout } = useAuth();
  const [bookmarks, setBookmarks] = useState<BookmarkRecord[]>([]);
  const [history, setHistory] = useState<ReadingHistoryRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const [name, setName] = useState(user?.name || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [readingInterest, setReadingInterest] = useState(user?.readingInterest || '');
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState('');

  useEffect(() => {
    if (!user) {
      onNavigate('/masuk');
      return;
    }
    setName(user.name);
    setBio(user.bio);
    setReadingInterest(user.readingInterest);

    Promise.all([api.getBookmarks(), api.getReadingHistory()])
      .then(([bRes, hRes]) => {
        setBookmarks(bRes.bookmarks);
        setHistory(hRes.history);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user, onNavigate]);

  if (!user) return null;

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setFeedback('');
    try {
      const res = await api.updateProfile({ name, bio, readingInterest });
      setUser(res.user);
      setFeedback('Profil berhasil diperbarui.');
    } catch (err) {
      setFeedback(err instanceof Error ? err.message : 'Gagal memperbarui profil.');
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveBookmark = async (collectionId: number) => {
    try {
      await api.removeBookmark(collectionId);
      setBookmarks((prev) => prev.filter((b) => b.collectionId !== collectionId));
    } catch {
      // ignore
    }
  };

  return (
    <main className="max-w-6xl mx-auto px-4 sm:px-6 py-12 space-y-12">
      <header className="pb-8 border-b border-[#405344]/15 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-widest text-[#556358]">
            Profil Anggota · {user.role === 'admin' ? 'Pustakawan' : 'Anggota Pembaca'}
          </p>
          <h1 className="font-serif-display text-3xl sm:text-4xl font-medium text-[#222B24] mt-1">
            {user.name}
          </h1>
          <p className="text-sm text-[#556358] mt-1">{user.email}</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {user.role === 'admin' && (
            <button
              type="button"
              onClick={() => onNavigate('/admin')}
              className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium bg-[#405344] text-[#FAF9F3] rounded-lg hover:bg-[#2A382D] transition-colors"
            >
              <ShieldCheck className="w-4 h-4" aria-hidden="true" />
              Buka Dashboard Admin
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              logout();
              onNavigate('/');
            }}
            className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-[#405344] bg-[#E8F0E3] border border-[#405344]/20 rounded-lg hover:bg-[#DCE8D5] transition-colors"
          >
            <LogOut className="w-4 h-4" aria-hidden="true" />
            Keluar
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        {/* Edit Profile Column */}
        <section className="lg:col-span-4">
          <div className="p-6 rounded-xl bg-[#F3F7EF] border border-[#405344]/15">
            <h2 className="font-serif-display text-xl font-medium text-[#222B24] mb-4">
              Informasi Akun
            </h2>

            <form onSubmit={handleSaveProfile} className="space-y-4">
              <div>
                <label htmlFor="prof-name" className="block text-xs font-medium text-[#222B24] mb-1">
                  Nama Lengkap
                </label>
                <input
                  id="prof-name"
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-[#FAF9F3] border border-[#405344]/20 rounded-lg"
                />
              </div>

              <div>
                <label
                  htmlFor="prof-interest"
                  className="block text-xs font-medium text-[#222B24] mb-1"
                >
                  Minat Bacaan
                </label>
                <input
                  id="prof-interest"
                  type="text"
                  value={readingInterest}
                  onChange={(e) => setReadingInterest(e.target.value)}
                  placeholder="Novel, puisi, sastra klasik..."
                  className="w-full px-3 py-2 text-sm bg-[#FAF9F3] border border-[#405344]/20 rounded-lg"
                />
              </div>

              <div>
                <label htmlFor="prof-bio" className="block text-xs font-medium text-[#222B24] mb-1">
                  Catatan Singkat / Bio
                </label>
                <textarea
                  id="prof-bio"
                  rows={3}
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Ceritakan sedikit tentang minat sastra Anda..."
                  className="w-full px-3 py-2 text-sm bg-[#FAF9F3] border border-[#405344]/20 rounded-lg"
                />
              </div>

              {feedback && <p className="text-xs text-[#405344] font-medium">{feedback}</p>}

              <button
                type="submit"
                disabled={saving}
                className="w-full py-2.5 px-4 text-sm font-medium bg-[#405344] text-[#FAF9F3] rounded-lg hover:bg-[#2A382D] transition-colors"
              >
                {saving ? 'Menyimpan...' : 'Simpan Perubahan'}
              </button>
            </form>
          </div>
        </section>

        {/* Continue Reading & Bookmarks */}
        <div className="lg:col-span-8 space-y-10">
          <section>
            <h2 className="font-serif-display text-2xl font-medium text-[#222B24] mb-4">
              Lanjutkan Membaca
            </h2>
            {loading ? (
              <div className="h-32 rounded-xl bg-[#E8F0E3]/60 animate-pulse" />
            ) : history.length === 0 ? (
              <div className="p-6 rounded-xl bg-[#F3F7EF] border border-[#405344]/15 text-sm text-[#556358]">
                Anda belum membuka buku apa pun. Jelajahi Ruang Sastra untuk mulai membaca.
              </div>
            ) : (
              <div className="space-y-4">
                {history.map((item) => (
                  <div
                    key={item.id}
                    className="p-4 sm:p-5 rounded-xl bg-[#FAF9F3] border border-[#405344]/15 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-20 rounded-lg overflow-hidden bg-[#E8F0E3] shrink-0 border border-[#405344]/10">
                        <ResilientImage
                          src={item.collection?.coverUrl}
                          alt={item.collection?.title || 'Sampul buku'}
                          type={item.collection?.type}
                        />
                      </div>
                      <div>
                        <h3 className="font-serif-display text-lg font-medium text-[#222B24]">
                          {item.collection?.title}
                        </h3>
                        <p className="text-xs text-[#556358] mt-0.5">
                          {item.collection?.creator} · Halaman{' '}
                          <span className="tabular-nums">
                            {item.currentPage} dari {item.totalPages}
                          </span>{' '}
                          (<span className="tabular-nums">{item.progressPercent}%</span>)
                        </p>
                        <div className="w-44 h-1.5 bg-[#E8F0E3] rounded-full mt-2 overflow-hidden">
                          <div
                            className="h-full bg-[#405344]"
                            style={{ width: `${item.progressPercent}%` }}
                          />
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        onNavigate(`/baca/${item.collectionId}?page=${item.currentPage}`)
                      }
                      className="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium bg-[#405344] text-[#FAF9F3] rounded-lg hover:bg-[#2A382D] whitespace-nowrap shrink-0"
                    >
                      <BookOpen className="w-4 h-4" aria-hidden="true" />
                      Lanjutkan Membaca
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section>
            <h2 className="font-serif-display text-2xl font-medium text-[#222B24] mb-4">
              Koleksi Favorit &amp; Bookmark
            </h2>
            {loading ? (
              <div className="h-32 rounded-xl bg-[#E8F0E3]/60 animate-pulse" />
            ) : bookmarks.length === 0 ? (
              <div className="p-6 rounded-xl bg-[#F3F7EF] border border-[#405344]/15 text-sm text-[#556358]">
                Belum ada koleksi yang disimpan. Klik tombol “Simpan Bookmark” pada buku, puisi, film, atau album yang Anda sukai.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {bookmarks.map((bm) => (
                  <div
                    key={bm.id}
                    className="p-4 rounded-xl bg-[#FAF9F3] border border-[#405344]/15 flex items-start justify-between gap-3"
                  >
                    <button
                      type="button"
                      onClick={() => onNavigate(`/koleksi/${bm.collectionId}`)}
                      className="text-left flex items-start gap-3 flex-1 min-w-0"
                    >
                      <Bookmark className="w-4 h-4 text-[#405344] mt-1 shrink-0" aria-hidden="true" />
                      <div className="min-w-0">
                        <h3 className="font-serif-display text-base font-medium text-[#222B24] truncate">
                          {bm.collection?.title}
                        </h3>
                        <p className="text-xs text-[#556358] truncate">{bm.collection?.creator}</p>
                        {bm.note && <p className="text-xs text-[#405344] mt-1">{bm.note}</p>}
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleRemoveBookmark(bm.collectionId)}
                      aria-label={`Hapus bookmark ${bm.collection?.title}`}
                      className="p-1.5 text-[#556358] hover:text-[#9A3412] transition-colors shrink-0"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}
