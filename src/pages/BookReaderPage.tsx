import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  Bookmark,
  ChevronLeft,
  ChevronRight,
  List,
  Minus,
  Moon,
  Plus,
  Sun,
  X,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';
import type { BookChapter, CollectionItem } from '../types';

interface BookReaderPageProps {
  collectionId: number;
  initialChapter?: number;
  initialPage?: number;
  onNavigate: (path: string) => void;
}

interface ReaderPageChunk {
  chapterIndex: number;
  chapterTitle: string;
  paragraphs: string[];
}

function paginateChapters(chapters: BookChapter[]): ReaderPageChunk[] {
  const pages: ReaderPageChunk[] = [];
  const MAX_CHARS_PER_PAGE = 1400;

  chapters.forEach((chap, chapterIndex) => {
    const rawParas = chap.content
      .split(/\n{2,}/)
      .map((p) => p.trim())
      .filter(Boolean);

    if (rawParas.length === 0) {
      pages.push({ chapterIndex, chapterTitle: chap.title, paragraphs: [''] });
      return;
    }

    let currentParas: string[] = [];
    let currentLen = 0;

    for (const para of rawParas) {
      if (currentLen > 0 && currentLen + para.length > MAX_CHARS_PER_PAGE) {
        pages.push({
          chapterIndex,
          chapterTitle: chap.title,
          paragraphs: currentParas,
        });
        currentParas = [para];
        currentLen = para.length;
      } else {
        currentParas.push(para);
        currentLen += para.length;
      }
    }

    if (currentParas.length > 0) {
      pages.push({
        chapterIndex,
        chapterTitle: chap.title,
        paragraphs: currentParas,
      });
    }
  });

  return pages;
}

export function BookReaderPage({
  collectionId,
  initialChapter,
  initialPage,
  onNavigate,
}: BookReaderPageProps) {
  const { user } = useAuth();
  const [book, setBook] = useState<CollectionItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [pageIdx, setPageIdx] = useState(0);
  const [fontSize, setFontSize] = useState(18);
  const [themeMode, setThemeMode] = useState<'ivory' | 'matcha' | 'dark'>('ivory');
  const [tocOpen, setTocOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'text' | 'pdf'>('text');
  const [saveFeedback, setSaveFeedback] = useState('');

  useEffect(() => {
    let active = true;
    setLoading(true);
    api
      .getCollection(collectionId)
      .then((res) => {
        if (!active) return;
        setBook(res.item);
        const hasPdf = Boolean(res.item.fileUrl && res.item.fileUrl.toLowerCase().endsWith('.pdf'));
        const hasText = Boolean(res.item.metadata.chapters && res.item.metadata.chapters.length > 0);
        if (hasPdf && !hasText) {
          setViewMode('pdf');
        }
      })
      .catch((err) => {
        if (active) setError(err instanceof Error ? err.message : 'Gagal memuat isi buku.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [collectionId]);

  const chapters: BookChapter[] = useMemo(() => {
    if (!book) return [];
    if (book.metadata.chapters && book.metadata.chapters.length > 0) {
      return book.metadata.chapters;
    }
    return [
      {
        id: 'ringkasan',
        title: book.title,
        content: book.description,
      },
    ];
  }, [book]);

  const pages = useMemo(() => paginateChapters(chapters), [chapters]);

  // Restore initial page or saved reading history
  useEffect(() => {
    if (!book || pages.length === 0) return;

    if (typeof initialPage === 'number' && initialPage > 0) {
      setPageIdx(Math.min(pages.length - 1, initialPage - 1));
      return;
    }
    if (typeof initialChapter === 'number' && initialChapter >= 0) {
      const target = pages.findIndex((p) => p.chapterIndex === initialChapter);
      if (target >= 0) setPageIdx(target);
      return;
    }

    if (user) {
      api
        .getReadingHistory()
        .then((res) => {
          const rec = res.history.find((h) => h.collectionId === collectionId);
          if (rec && rec.currentPage >= 1) {
            setPageIdx(Math.min(pages.length - 1, rec.currentPage - 1));
          }
        })
        .catch(() => {});
    }
  }, [book, pages, initialChapter, initialPage, user, collectionId]);

  const currentChunk = pages[pageIdx] || pages[0];
  const totalPages = Math.max(1, pages.length);
  const currentPageNum = pageIdx + 1;
  const progressPercent = Math.round((currentPageNum / totalPages) * 100);

  const persistProgress = useCallback(
    (nextPageIdx: number) => {
      if (!user || !book) return;
      const chunk = pages[nextPageIdx];
      api
        .saveReadingHistory({
          collectionId: book.id,
          currentPage: nextPageIdx + 1,
          totalPages: Math.max(1, pages.length),
          chapterIndex: chunk ? chunk.chapterIndex : 0,
        })
        .catch(() => {});
    },
    [user, book, pages]
  );

  const goToPage = useCallback(
    (nextIdx: number) => {
      const clamped = Math.max(0, Math.min(pages.length - 1, nextIdx));
      setPageIdx(clamped);
      persistProgress(clamped);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    },
    [pages.length, persistProgress]
  );

  // Save initial opening in reading history
  useEffect(() => {
    if (user && book && pages.length > 0) {
      persistProgress(pageIdx);
    }
  }, [user, book?.id]);

  // Keyboard navigation
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (viewMode !== 'text') return;
      if (e.key === 'ArrowRight') goToPage(pageIdx + 1);
      if (e.key === 'ArrowLeft') goToPage(pageIdx - 1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [pageIdx, goToPage, viewMode]);

  const handleBookmarkPage = async () => {
    if (!user) {
      onNavigate('/masuk');
      return;
    }
    if (!book) return;
    try {
      await api.saveBookmark({
        collectionId: book.id,
        pageNumber: currentPageNum,
        note: `Ditandai pada ${currentChunk?.chapterTitle || `Halaman ${currentPageNum}`}`,
      });
      setSaveFeedback(`Halaman ${currentPageNum} ditandai.`);
      setTimeout(() => setSaveFeedback(''), 3000);
    } catch {
      setSaveFeedback('Gagal menandai halaman.');
    }
  };

  if (loading) {
    return (
      <main className="max-w-4xl mx-auto px-4 py-14">
        <div className="h-[520px] rounded-xl bg-[#E8F0E3]/60 animate-pulse" />
      </main>
    );
  }

  if (error || !book) {
    return (
      <main className="max-w-3xl mx-auto px-4 py-16 text-center">
        <div className="p-8 rounded-xl bg-[#F3F7EF] border border-[#405344]/15">
          <h1 className="font-serif-display text-2xl text-[#222B24]">
            {error || 'Buku tidak tersedia.'}
          </h1>
          <button
            type="button"
            onClick={() => onNavigate(`/koleksi/${collectionId}`)}
            className="mt-5 px-4 py-2 text-sm font-medium bg-[#405344] text-[#FAF9F3] rounded-lg"
          >
            Kembali ke Detail Buku
          </button>
        </div>
      </main>
    );
  }

  const hasPdfFile = Boolean(book.fileUrl && book.fileUrl.toLowerCase().endsWith('.pdf'));

  const themeClasses =
    themeMode === 'dark'
      ? 'bg-[#19201B] text-[#E6ECE7] border-[#E6ECE7]/15'
      : themeMode === 'matcha'
      ? 'bg-[#E8F0E3] text-[#222B24] border-[#405344]/15'
      : 'bg-[#FAF9F3] text-[#222B24] border-[#405344]/15';

  const mutedText = themeMode === 'dark' ? 'text-[#A6B59A]' : 'text-[#556358]';

  return (
    <div className={`min-h-screen transition-colors duration-200 ${themeClasses}`}>
      {/* Reader Top Bar */}
      <div
        className={`sticky top-0 z-30 border-b backdrop-blur-sm ${
          themeMode === 'dark'
            ? 'bg-[#19201B]/95 border-[#E6ECE7]/15'
            : themeMode === 'matcha'
            ? 'bg-[#E8F0E3]/95 border-[#405344]/15'
            : 'bg-[#FAF9F3]/95 border-[#405344]/15'
        }`}
      >
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => onNavigate(`/koleksi/${book.id}`)}
              className="inline-flex items-center gap-1.5 text-sm font-medium hover:opacity-75 whitespace-nowrap shrink-0"
            >
              <ArrowLeft className="w-4 h-4" aria-hidden="true" />
              Detail Buku
            </button>
            <span aria-hidden="true" className={`hidden sm:inline ${mutedText}`}>·</span>
            <h1 className="hidden sm:block font-serif-display text-sm font-medium truncate">
              {book.title}
            </h1>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {hasPdfFile && (
              <button
                type="button"
                onClick={() => setViewMode((m) => (m === 'pdf' ? 'text' : 'pdf'))}
                className="px-3 py-1.5 text-xs font-medium rounded-md border border-current/20 hover:opacity-80 whitespace-nowrap"
              >
                {viewMode === 'pdf' ? 'Mode Teks' : 'Lihat PDF'}
              </button>
            )}

            <button
              type="button"
              onClick={() => setTocOpen(true)}
              aria-label="Buka Daftar Isi"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md border border-current/20 hover:opacity-80 whitespace-nowrap"
            >
              <List className="w-3.5 h-3.5" aria-hidden="true" />
              Daftar Isi
            </button>

            <div className="hidden sm:flex items-center gap-1 border border-current/20 rounded-md px-1.5 py-1">
              <button
                type="button"
                onClick={() => setFontSize((s) => Math.max(14, s - 2))}
                aria-label="Perkecil ukuran teks"
                className="p-1 hover:opacity-70"
              >
                <Minus className="w-3.5 h-3.5" />
              </button>
              <span className="text-xs font-mono-tabular w-6 text-center">{fontSize}</span>
              <button
                type="button"
                onClick={() => setFontSize((s) => Math.min(26, s + 2))}
                aria-label="Perbesar ukuran teks"
                className="p-1 hover:opacity-70"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>

            <button
              type="button"
              onClick={() =>
                setThemeMode((t) =>
                  t === 'ivory' ? 'matcha' : t === 'matcha' ? 'dark' : 'ivory'
                )
              }
              aria-label="Ubah mode pencahayaan pembaca"
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-md border border-current/20 hover:opacity-80"
            >
              {themeMode === 'dark' ? (
                <Sun className="w-3.5 h-3.5" aria-hidden="true" />
              ) : (
                <Moon className="w-3.5 h-3.5" aria-hidden="true" />
              )}
              <span className="hidden md:inline">
                {themeMode === 'ivory' ? 'Gading' : themeMode === 'matcha' ? 'Matcha' : 'Gelap'}
              </span>
            </button>

            <button
              type="button"
              onClick={handleBookmarkPage}
              aria-label="Bookmark halaman terakhir"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md bg-[#405344] text-[#FAF9F3] hover:bg-[#2A382D] whitespace-nowrap"
            >
              <Bookmark className="w-3.5 h-3.5" aria-hidden="true" />
              <span className="hidden sm:inline">Tandai</span>
            </button>
          </div>
        </div>

        {/* Reading Progress Bar */}
        {viewMode === 'text' && (
          <div className="h-1 w-full bg-current/10">
            <div
              className="h-full bg-[#405344] transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        )}
      </div>

      {saveFeedback && (
        <div className="max-w-3xl mx-auto px-4 pt-3 text-right">
          <span className="text-xs font-medium text-[#405344] bg-[#E8F0E3] px-3 py-1 rounded-md">
            {saveFeedback}
          </span>
        </div>
      )}

      {/* TOC Drawer */}
      {tocOpen && (
        <div className="fixed inset-0 z-50 flex">
          <div
            className="fixed inset-0 bg-black/40"
            onClick={() => setTocOpen(false)}
            aria-hidden="true"
          />
          <aside
            aria-label="Daftar Isi Buku"
            className={`relative z-10 w-80 max-w-full h-full p-6 overflow-y-auto border-r ${themeClasses}`}
          >
            <div className="flex items-center justify-between pb-4 border-b border-current/15 mb-4">
              <h2 className="font-serif-display text-xl font-medium">Daftar Isi</h2>
              <button
                type="button"
                onClick={() => setTocOpen(false)}
                aria-label="Tutup daftar isi"
                className="p-1.5 rounded-md hover:bg-current/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <ul className="space-y-1">
              {chapters.map((chap, idx) => {
                const targetPageIdx = pages.findIndex((p) => p.chapterIndex === idx);
                const isCurrent = currentChunk?.chapterIndex === idx;
                return (
                  <li key={chap.id}>
                    <button
                      type="button"
                      onClick={() => {
                        if (targetPageIdx >= 0) goToPage(targetPageIdx);
                        setTocOpen(false);
                      }}
                      className={`w-full text-left px-3 py-2.5 rounded-lg text-sm transition-colors ${
                        isCurrent ? 'bg-[#405344] text-[#FAF9F3] font-medium' : 'hover:bg-current/10'
                      }`}
                    >
                      <span className="font-mono-tabular text-xs opacity-70 mr-2">
                        {String(idx + 1).padStart(2, '0')}
                      </span>
                      {chap.title}
                    </button>
                  </li>
                );
              })}
            </ul>
          </aside>
        </div>
      )}

      {/* Reader Content Body */}
      <main className="max-w-3xl mx-auto px-5 sm:px-8 py-10 sm:py-14">
        {viewMode === 'pdf' && hasPdfFile ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className={`text-sm ${mutedText}`}>Dokumen PDF Terintegrasi — {book.title}</p>
              <a
                href={book.fileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs underline"
              >
                Buka berkas PDF asli
              </a>
            </div>
            <iframe
              src={book.fileUrl}
              title={`Pembaca PDF ${book.title}`}
              className="w-full h-[78vh] rounded-xl border border-current/20 bg-white"
            />
          </div>
        ) : (
          <article aria-label="Halaman Buku">
            <header className="mb-8 pb-6 border-b border-current/15">
              <p className={`text-xs uppercase tracking-widest ${mutedText}`}>
                {book.creator}
              </p>
              <h2 className="font-serif-display text-2xl sm:text-3xl font-medium mt-2">
                {currentChunk?.chapterTitle}
              </h2>
            </header>

            <div
              style={{ fontSize: `${fontSize}px` }}
              className="font-serif-display leading-[1.85] space-y-6 max-w-prose"
            >
              {currentChunk?.paragraphs.map((para, i) => (
                <p key={i} className="whitespace-pre-line">
                  {para}
                </p>
              ))}
            </div>

            {/* Bottom Page Controls */}
            <footer className="mt-14 pt-6 border-t border-current/15 flex flex-col sm:flex-row items-center justify-between gap-4">
              <button
                type="button"
                onClick={() => goToPage(pageIdx - 1)}
                disabled={pageIdx === 0}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-medium rounded-lg border border-current/20 hover:bg-current/5 disabled:opacity-35 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" aria-hidden="true" />
                Halaman Sebelumnya
              </button>

              <p className={`text-xs font-mono-tabular ${mutedText}`}>
                Halaman {currentPageNum} dari {totalPages} ({progressPercent}%)
              </p>

              <button
                type="button"
                onClick={() => goToPage(pageIdx + 1)}
                disabled={pageIdx >= totalPages - 1}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-medium rounded-lg bg-[#405344] text-[#FAF9F3] hover:bg-[#2A382D] disabled:opacity-35 transition-colors"
              >
                Halaman Selanjutnya
                <ChevronRight className="w-4 h-4" aria-hidden="true" />
              </button>
            </footer>
          </article>
        )}
      </main>
    </div>
  );
}
