import { useEffect, useRef, useState } from 'react';
import {
  ArrowLeft,
  Bookmark,
  BookOpen,
  Film,
  Minus,
  Pause,
  Play,
  Plus,
  SkipBack,
  SkipForward,
  Volume2,
} from 'lucide-react';
import { ResilientImage } from '../components/ResilientImage';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';
import type { AlbumTrack, CollectionItem } from '../types';

interface CollectionDetailPageProps {
  collectionId: number;
  onNavigate: (path: string) => void;
}

function getSafeEmbedUrl(rawUrl: string): { kind: 'video' | 'iframe' | 'none'; src: string } {
  const url = rawUrl.trim();
  if (!url) return { kind: 'none', src: '' };
  if (url.startsWith('/uploads/videos/') && /\.(mp4|webm|ogv)$/i.test(url)) {
    return { kind: 'video', src: url };
  }
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'https:') return { kind: 'none', src: '' };
    const host = parsed.hostname.toLowerCase();
    if (/\.(mp4|webm|ogv)$/i.test(parsed.pathname)) {
      return { kind: 'video', src: url };
    }
    if (host === 'www.youtube.com' || host === 'youtube.com' || host === 'youtube-nocookie.com') {
      const vid = parsed.searchParams.get('v');
      if (vid && /^[a-zA-Z0-9_-]{6,20}$/.test(vid)) {
        return { kind: 'iframe', src: `https://www.youtube-nocookie.com/embed/${vid}` };
      }
      if (parsed.pathname.startsWith('/embed/')) {
        return { kind: 'iframe', src: `https://www.youtube-nocookie.com${parsed.pathname}` };
      }
    }
    if (host === 'youtu.be') {
      const vid = parsed.pathname.replace('/', '');
      if (vid && /^[a-zA-Z0-9_-]{6,20}$/.test(vid)) {
        return { kind: 'iframe', src: `https://www.youtube-nocookie.com/embed/${vid}` };
      }
    }
    if (host === 'player.vimeo.com' || host === 'vimeo.com') {
      const vid = parsed.pathname.split('/').filter(Boolean).pop();
      if (vid && /^\d+$/.test(vid)) {
        return { kind: 'iframe', src: `https://player.vimeo.com/video/${vid}` };
      }
    }
    if (host === 'archive.org' && parsed.pathname.startsWith('/embed/')) {
      return { kind: 'iframe', src: url };
    }
    return { kind: 'none', src: '' };
  } catch {
    return { kind: 'none', src: '' };
  }
}

export function CollectionDetailPage({ collectionId, onNavigate }: CollectionDetailPageProps) {
  const { user } = useAuth();
  const [item, setItem] = useState<CollectionItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [bookmarkMsg, setBookmarkMsg] = useState('');
  const [poemFontSize, setPoemFontSize] = useState(19);

  // Audio player state
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [activeTrackIndex, setActiveTrackIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    api
      .getCollection(collectionId)
      .then((res) => {
        if (active) setItem(res.item);
      })
      .catch((err) => {
        if (active) setError(err instanceof Error ? err.message : 'Gagal memuat koleksi.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [collectionId]);

  useEffect(() => {
    if (!user) {
      setIsBookmarked(false);
      return;
    }
    api
      .getBookmarks()
      .then((res) => {
        setIsBookmarked(res.bookmarks.some((b) => b.collectionId === collectionId));
      })
      .catch(() => {});
  }, [user, collectionId]);

  const handleToggleBookmark = async () => {
    if (!user) {
      onNavigate('/masuk');
      return;
    }
    try {
      if (isBookmarked) {
        await api.removeBookmark(collectionId);
        setIsBookmarked(false);
        setBookmarkMsg('Dihapus dari daftar simpan.');
      } else {
        await api.saveBookmark({ collectionId, pageNumber: 1 });
        setIsBookmarked(true);
        setBookmarkMsg('Disimpan ke profil Anda.');
      }
      setTimeout(() => setBookmarkMsg(''), 3000);
    } catch (err) {
      setBookmarkMsg(err instanceof Error ? err.message : 'Gagal memperbarui bookmark.');
    }
  };

  const tracks: AlbumTrack[] = item?.metadata.tracks || [];
  const activeTrack = tracks[activeTrackIndex];
  const activeAudioSrc = activeTrack?.audioUrl || item?.mediaUrl || '';

  const playTrackAt = (index: number) => {
    setActiveTrackIndex(index);
    setIsPlaying(true);
    setTimeout(() => {
      audioRef.current?.play().catch(() => setIsPlaying(false));
    }, 40);
  };

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
    }
  };

  const formatSec = (s: number) => {
    if (!Number.isFinite(s) || s < 0) return '00:00';
    const m = Math.floor(s / 60);
    const rem = Math.floor(s % 60);
    return `${String(m).padStart(2, '0')}:${String(rem).padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-14">
        <div className="h-96 rounded-xl bg-[#E8F0E3]/60 animate-pulse" />
      </main>
    );
  }

  if (error || !item) {
    return (
      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-16 text-center">
        <div className="p-8 rounded-xl bg-[#F3F7EF] border border-[#405344]/15">
          <h1 className="font-serif-display text-2xl text-[#222B24]">
            {error || 'Koleksi tidak ditemukan'}
          </h1>
          <div className="mt-6 flex justify-center gap-3">
            <button
              type="button"
              onClick={() => onNavigate('/sastra')}
              className="px-4 py-2 text-sm font-medium bg-[#405344] text-[#FAF9F3] rounded-lg"
            >
              Kembali ke Katalog
            </button>
            {!user && error.toLowerCase().includes('anggota') && (
              <button
                type="button"
                onClick={() => onNavigate('/masuk')}
                className="px-4 py-2 text-sm font-medium border border-[#405344]/30 text-[#405344] rounded-lg"
              >
                Masuk Anggota
              </button>
            )}
          </div>
        </div>
      </main>
    );
  }

  const backPath =
    item.type === 'film' ? '/film' : item.type === 'album' ? '/musik' : '/sastra';
  const backLabel =
    item.type === 'film'
      ? 'Kembali ke Sastra Film'
      : item.type === 'album'
      ? 'Kembali ke Arsip Musik'
      : 'Kembali ke Ruang Sastra';

  const filmPlayer = item.type === 'film' ? getSafeEmbedUrl(item.mediaUrl || item.fileUrl) : { kind: 'none', src: '' };

  return (
    <main className="max-w-5xl mx-auto px-4 sm:px-6 py-10">
      <div className="mb-8 flex items-center justify-between gap-4">
        <button
          type="button"
          onClick={() => onNavigate(backPath)}
          className="inline-flex items-center gap-2 text-sm font-medium text-[#405344] hover:text-[#222B24] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" aria-hidden="true" />
          {backLabel}
        </button>

        <div className="flex items-center gap-3">
          {bookmarkMsg && <span className="text-xs text-[#405344]">{bookmarkMsg}</span>}
          <button
            type="button"
            onClick={handleToggleBookmark}
            aria-pressed={isBookmarked}
            className={`inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg border transition-colors ${
              isBookmarked
                ? 'bg-[#405344] text-[#FAF9F3] border-[#405344]'
                : 'bg-[#FAF9F3] text-[#405344] border-[#405344]/25 hover:bg-[#E8F0E3]'
            }`}
          >
            <Bookmark className="w-4 h-4" aria-hidden="true" />
            {isBookmarked ? 'Tersimpan' : 'Simpan Bookmark'}
          </button>
        </div>
      </div>

      {/* POEM EDITORIAL VIEW */}
      {item.type === 'poem' ? (
        <article className="space-y-10">
          <header className="pb-8 border-b border-[#405344]/15 grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
            <div className="md:col-span-8">
              <p className="text-xs uppercase tracking-widest text-[#556358]">
                <span>{item.subCategory || 'Puisi'}</span>
                <span aria-hidden="true" className="mx-2">·</span>
                <span>{item.metadata.era || item.genre}</span>
                <span aria-hidden="true" className="mx-2">·</span>
                <span className="tabular-nums">{item.year}</span>
              </p>
              <h1 className="font-serif-display text-3xl sm:text-5xl font-medium text-[#222B24] mt-2 leading-tight">
                {item.title}
              </h1>
              <p className="text-lg text-[#405344] mt-3 font-medium">{item.creator}</p>
              <p className="text-sm text-[#556358] mt-3 max-w-2xl leading-relaxed">
                {item.description}
              </p>
            </div>
            {item.coverUrl && (
              <div className="md:col-span-4">
                <div className="aspect-[3/4] max-w-[220px] md:ml-auto rounded-xl overflow-hidden border border-[#405344]/15 bg-[#E8F0E3]">
                  <ResilientImage
                    src={item.coverUrl}
                    alt={`Ilustrasi puisi ${item.title}`}
                    fallbackTitle={item.title}
                    type="poem"
                  />
                </div>
              </div>
            )}
          </header>

          {/* Editorial Poem Reader Canvas */}
          <section
            aria-label="Teks Puisi"
            className="bg-[#F3F7EF] border border-[#405344]/15 rounded-2xl px-6 sm:px-14 py-10 sm:py-14"
          >
            <div className="flex items-center justify-between gap-4 pb-6 mb-8 border-b border-[#405344]/10">
              <span className="text-xs uppercase tracking-widest text-[#556358]">
                Ruang Baca Puisi
              </span>
              <div className="flex items-center gap-2">
                <span className="text-xs text-[#556358]">Ukuran huruf:</span>
                <button
                  type="button"
                  onClick={() => setPoemFontSize((s) => Math.max(15, s - 2))}
                  aria-label="Perkecil ukuran huruf puisi"
                  className="p-1.5 rounded-md border border-[#405344]/20 bg-[#FAF9F3] text-[#405344] hover:bg-[#E8F0E3]"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <span className="text-xs font-mono-tabular w-8 text-center">{poemFontSize}</span>
                <button
                  type="button"
                  onClick={() => setPoemFontSize((s) => Math.min(28, s + 2))}
                  aria-label="Perbesar ukuran huruf puisi"
                  className="p-1.5 rounded-md border border-[#405344]/20 bg-[#FAF9F3] text-[#405344] hover:bg-[#E8F0E3]"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <div className="max-w-2xl mx-auto">
              <div
                style={{ fontSize: `${poemFontSize}px` }}
                className="font-serif-display text-[#222B24] leading-[1.95] whitespace-pre-line"
              >
                {item.metadata.poemText || item.description}
              </div>
              <p className="mt-10 pt-6 border-t border-[#405344]/10 text-sm text-[#556358] italic">
                — {item.creator}, <span className="tabular-nums">{item.year}</span>
              </p>
            </div>
          </section>

          {/* Poem Bibliographic Metadata */}
          <section className="pt-4">
            <h2 className="font-serif-display text-xl font-medium text-[#222B24] mb-4">
              Informasi Bibliografis Puisi
            </h2>
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4 p-6 rounded-xl bg-[#FAF9F3] border border-[#405344]/15 text-sm">
              <div>
                <dt className="text-xs text-[#556358]">Nama Penyair</dt>
                <dd className="font-medium text-[#222B24] mt-0.5">{item.creator}</dd>
              </div>
              <div>
                <dt className="text-xs text-[#556358]">Tahun Publikasi</dt>
                <dd className="font-medium text-[#222B24] tabular-nums mt-0.5">{item.year}</dd>
              </div>
              <div>
                <dt className="text-xs text-[#556358]">Sumber Publikasi</dt>
                <dd className="font-medium text-[#222B24] mt-0.5">
                  {item.metadata.publicationSource || 'Arsip Perpustakaan Rona Rasa'}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-[#556358]">Tema &amp; Periode</dt>
                <dd className="font-medium text-[#222B24] mt-0.5">
                  {item.metadata.theme || item.genre} · {item.metadata.era || 'Sastra Indonesia'}
                </dd>
              </div>
            </dl>
          </section>
        </article>
      ) : (
        /* BOOK / FILM / ALBUM DETAIL */
        <div className="space-y-12">
          <section className="grid grid-cols-1 md:grid-cols-12 gap-8 lg:gap-12 items-start">
            <div className="md:col-span-4">
              <div
                className={`rounded-xl overflow-hidden border border-[#405344]/15 bg-[#E8F0E3] ${
                  item.type === 'album' ? 'aspect-square' : 'aspect-[3/4]'
                }`}
              >
                <ResilientImage
                  src={item.coverUrl}
                  alt={`Sampul ${item.title}`}
                  fallbackTitle={item.title}
                  type={item.type}
                />
              </div>
            </div>

            <div className="md:col-span-8 space-y-6">
              <div>
                <p className="text-xs uppercase tracking-widest text-[#556358]">
                  <span>{item.subCategory || item.type}</span>
                  <span aria-hidden="true" className="mx-2">·</span>
                  <span className="tabular-nums">{item.year}</span>
                  <span aria-hidden="true" className="mx-2">·</span>
                  <span>{item.genre}</span>
                </p>
                <h1 className="font-serif-display text-3xl sm:text-4xl font-medium text-[#222B24] mt-2 leading-tight">
                  {item.title}
                </h1>
                <p className="text-base text-[#405344] font-medium mt-2">{item.creator}</p>
              </div>

              <p className="text-base text-[#222B24]/90 leading-relaxed">{item.description}</p>

              {/* Primary CTA for Book */}
              {item.type === 'book' && (
                <div className="pt-2 flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={() => onNavigate(`/baca/${item.id}`)}
                    className="inline-flex items-center gap-2.5 px-6 py-3 text-sm font-medium bg-[#405344] text-[#FAF9F3] rounded-lg hover:bg-[#2A382D] transition-colors"
                  >
                    <BookOpen className="w-4 h-4" aria-hidden="true" />
                    Baca Sekarang
                  </button>
                  {item.fileUrl && (
                    <a
                      href={item.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-5 py-3 text-sm font-medium text-[#405344] bg-[#E8F0E3] border border-[#405344]/20 rounded-lg hover:bg-[#DCE8D5] transition-colors"
                    >
                      Unduh Berkas ({item.metadata.digitalFormat || 'Dokumen'})
                    </a>
                  )}
                </div>
              )}

              {/* Structured Bibliographic Metadata */}
              <div className="pt-4 border-t border-[#405344]/15">
                <h2 className="text-xs uppercase tracking-widest text-[#556358] mb-4">
                  Metadata Koleksi
                </h2>

                {item.type === 'book' && (
                  <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3.5 text-sm">
                    <div>
                      <dt className="text-xs text-[#556358]">Pengarang</dt>
                      <dd className="font-medium text-[#222B24]">{item.creator}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-[#556358]">Penerbit</dt>
                      <dd className="font-medium text-[#222B24]">{item.metadata.publisher || '-'}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-[#556358]">Tahun Terbit</dt>
                      <dd className="font-medium text-[#222B24] tabular-nums">{item.year}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-[#556358]">ISBN / Klasifikasi</dt>
                      <dd className="font-mono-tabular text-xs font-medium text-[#222B24] mt-0.5">
                        {item.metadata.isbn || '-'}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs text-[#556358]">Jumlah Halaman</dt>
                      <dd className="font-medium text-[#222B24] tabular-nums">
                        {item.metadata.pageCount ? `${item.metadata.pageCount} halaman` : '-'}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs text-[#556358]">Bahasa</dt>
                      <dd className="font-medium text-[#222B24]">
                        {item.metadata.language || 'Bahasa Indonesia'}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs text-[#556358]">Subjek</dt>
                      <dd className="font-medium text-[#222B24]">{item.metadata.subject || '-'}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-[#556358]">Format Digital &amp; Akses</dt>
                      <dd className="font-medium text-[#222B24]">
                        {item.metadata.digitalFormat || 'Teks Interaktif'} · {item.accessStatus}
                      </dd>
                    </div>
                  </dl>
                )}

                {item.type === 'film' && (
                  <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3.5 text-sm">
                    <div>
                      <dt className="text-xs text-[#556358]">Sutradara</dt>
                      <dd className="font-medium text-[#222B24]">{item.creator}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-[#556358]">Tahun Rilis</dt>
                      <dd className="font-medium text-[#222B24] tabular-nums">{item.year}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-[#556358]">Durasi</dt>
                      <dd className="font-medium text-[#222B24] tabular-nums">
                        {item.metadata.duration || '-'}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs text-[#556358]">Rumah Produksi</dt>
                      <dd className="font-medium text-[#222B24]">
                        {item.metadata.productionHouse || '-'}
                      </dd>
                    </div>
                    <div className="sm:col-span-2">
                      <dt className="text-xs text-[#556358]">Pemeran</dt>
                      <dd className="font-medium text-[#222B24]">
                        {item.metadata.castMembers || '-'}
                      </dd>
                    </div>
                    <div className="sm:col-span-2">
                      <dt className="text-xs text-[#556358]">Informasi Akses</dt>
                      <dd className="font-medium text-[#222B24]">
                        {item.metadata.accessInfo || item.accessStatus}
                      </dd>
                    </div>
                  </dl>
                )}

                {item.type === 'album' && (
                  <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3.5 text-sm">
                    <div>
                      <dt className="text-xs text-[#556358]">Musisi / Band</dt>
                      <dd className="font-medium text-[#222B24]">{item.creator}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-[#556358]">Tahun Rilis</dt>
                      <dd className="font-medium text-[#222B24] tabular-nums">{item.year}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-[#556358]">Label Rekaman</dt>
                      <dd className="font-medium text-[#222B24]">
                        {item.metadata.recordLabel || '-'}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs text-[#556358]">Informasi Akses</dt>
                      <dd className="font-medium text-[#222B24]">
                        {item.metadata.accessInfo || item.accessStatus}
                      </dd>
                    </div>
                  </dl>
                )}
              </div>
            </div>
          </section>

          {/* Book Table of Contents Preview */}
          {item.type === 'book' && item.metadata.chapters && item.metadata.chapters.length > 0 && (
            <section className="p-6 sm:p-8 rounded-xl bg-[#F3F7EF] border border-[#405344]/15">
              <h2 className="font-serif-display text-2xl font-medium text-[#222B24] mb-4">
                Daftar Isi
              </h2>
              <ol className="divide-y divide-[#405344]/10">
                {item.metadata.chapters.map((chap, idx) => (
                  <li key={chap.id} className="py-3 flex items-center justify-between gap-4">
                    <span className="text-sm font-medium text-[#222B24]">
                      <span className="font-mono-tabular text-xs text-[#556358] mr-3">
                        {String(idx + 1).padStart(2, '0')}
                      </span>
                      {chap.title}
                    </span>
                    <button
                      type="button"
                      onClick={() => onNavigate(`/baca/${item.id}?chapter=${idx}`)}
                      className="text-xs font-medium text-[#405344] hover:underline whitespace-nowrap"
                    >
                      Baca Bagian →
                    </button>
                  </li>
                ))}
              </ol>
            </section>
          )}

          {/* Film Player Section */}
          {item.type === 'film' && (
            <section className="p-6 sm:p-8 rounded-xl bg-[#F3F7EF] border border-[#405344]/15 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="font-serif-display text-2xl font-medium text-[#222B24]">
                  Ruang Pemutaran Film
                </h2>
                <span className="text-xs text-[#556358]">{item.metadata.duration}</span>
              </div>

              {filmPlayer.kind === 'video' ? (
                <video
                  controls
                  poster={item.coverUrl}
                  src={filmPlayer.src}
                  className="w-full aspect-video rounded-lg bg-[#222B24]"
                />
              ) : filmPlayer.kind === 'iframe' ? (
                <div className="aspect-video w-full rounded-lg overflow-hidden bg-[#222B24]">
                  <iframe
                    src={filmPlayer.src}
                    title={`Pemutar film ${item.title}`}
                    className="w-full h-full border-0"
                    allow="autoplay; fullscreen; picture-in-picture"
                    allowFullScreen
                  />
                </div>
              ) : (
                <div className="p-8 rounded-lg bg-[#E8F0E3] border border-[#405344]/15 text-center space-y-2">
                  <Film className="w-8 h-8 mx-auto text-[#405344]" aria-hidden="true" />
                  <p className="font-serif-display text-lg text-[#222B24]">
                    Arsip Kurasi Film Terdaftar
                  </p>
                  <p className="text-sm text-[#556358] max-w-lg mx-auto leading-relaxed">
                    Pemutaran video langsung aktif segera setelah berkas video berlisensi (MP4/WebM) atau tautan sematan resmi diunggah oleh pustakawan melalui Dashboard Admin.
                  </p>
                </div>
              )}
            </section>
          )}

          {/* Music Album Player & Tracklist */}
          {item.type === 'album' && (
            <section className="p-6 sm:p-8 rounded-xl bg-[#F3F7EF] border border-[#405344]/15 space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-[#405344]/15">
                <div>
                  <h2 className="font-serif-display text-2xl font-medium text-[#222B24]">
                    Pemutar Audio &amp; Daftar Lagu
                  </h2>
                  <p className="text-sm text-[#556358] mt-1">
                    {activeTrack
                      ? `Sedang dipilih: ${activeTrack.number}. ${activeTrack.title}`
                      : 'Pilih lagu dari daftar di bawah untuk memutar'}
                  </p>
                </div>
                <div className="flex items-center gap-2 text-xs text-[#405344]">
                  <Volume2 className="w-4 h-4" aria-hidden="true" />
                  <span>Pemutar Internal Rona Rasa</span>
                </div>
              </div>

              {activeAudioSrc && (
                <div className="p-5 rounded-xl bg-[#FAF9F3] border border-[#405344]/15 space-y-4">
                  <audio
                    ref={audioRef}
                    src={activeAudioSrc}
                    onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
                    onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
                    onEnded={() => {
                      if (activeTrackIndex < tracks.length - 1) {
                        playTrackAt(activeTrackIndex + 1);
                      } else {
                        setIsPlaying(false);
                      }
                    }}
                  />

                  <div className="flex items-center gap-4">
                    <button
                      type="button"
                      onClick={() => playTrackAt(Math.max(0, activeTrackIndex - 1))}
                      disabled={activeTrackIndex === 0}
                      aria-label="Lagu sebelumnya"
                      className="p-2.5 rounded-lg border border-[#405344]/20 text-[#405344] hover:bg-[#E8F0E3] disabled:opacity-40"
                    >
                      <SkipBack className="w-4 h-4" />
                    </button>

                    <button
                      type="button"
                      onClick={togglePlay}
                      aria-label={isPlaying ? 'Jeda lagu' : 'Putar lagu'}
                      className="w-11 h-11 rounded-full bg-[#405344] text-[#FAF9F3] flex items-center justify-center hover:bg-[#2A382D] transition-colors shrink-0"
                    >
                      {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
                    </button>

                    <button
                      type="button"
                      onClick={() => playTrackAt(Math.min(tracks.length - 1, activeTrackIndex + 1))}
                      disabled={activeTrackIndex >= tracks.length - 1}
                      aria-label="Lagu berikutnya"
                      className="p-2.5 rounded-lg border border-[#405344]/20 text-[#405344] hover:bg-[#E8F0E3] disabled:opacity-40"
                    >
                      <SkipForward className="w-4 h-4" />
                    </button>

                    <div className="flex-1 flex items-center gap-3">
                      <span className="text-xs font-mono-tabular text-[#556358]">
                        {formatSec(currentTime)}
                      </span>
                      <input
                        type="range"
                        aria-label="Posisi pemutaran audio"
                        min={0}
                        max={duration || 100}
                        value={currentTime}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          setCurrentTime(val);
                          if (audioRef.current) audioRef.current.currentTime = val;
                        }}
                        className="w-full accent-[#405344]"
                      />
                      <span className="text-xs font-mono-tabular text-[#556358]">
                        {formatSec(duration)}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {tracks.length > 0 && (
                <ol className="divide-y divide-[#405344]/10">
                  {tracks.map((track, idx) => {
                    const active = idx === activeTrackIndex;
                    return (
                      <li key={`${track.number}-${track.title}`}>
                        <button
                          type="button"
                          onClick={() => playTrackAt(idx)}
                          className={`w-full py-3.5 px-3 rounded-lg flex items-center justify-between text-left transition-colors ${
                            active
                              ? 'bg-[#E8F0E3] text-[#222B24] font-medium'
                              : 'hover:bg-[#FAF9F3] text-[#222B24]'
                          }`}
                        >
                          <span className="flex items-center gap-3 text-sm">
                            <span className="font-mono-tabular text-xs text-[#556358] w-6">
                              {String(track.number).padStart(2, '0')}
                            </span>
                            <span>{track.title}</span>
                          </span>
                          <span className="text-xs font-mono-tabular text-[#556358]">
                            {track.duration}
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ol>
              )}
            </section>
          )}
        </div>
      )}
    </main>
  );
}
