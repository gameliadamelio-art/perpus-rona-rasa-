import { useEffect, useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { CollectionCard } from '../components/CollectionCard';
import { api } from '../lib/api';
import type { CollectionItem } from '../types';

interface MusikPageProps {
  onNavigate: (path: string) => void;
}

export function MusikPage({ onNavigate }: MusikPageProps) {
  const [albums, setAlbums] = useState<CollectionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [genreFilter, setGenreFilter] = useState('');
  const [yearFilter, setYearFilter] = useState('');
  const [sortBy, setSortBy] = useState('newest');

  useEffect(() => {
    let active = true;
    api
      .getCollections({ type: 'album', sort: sortBy })
      .then((res) => {
        if (active) setAlbums(res.items);
      })
      .catch(() => {})
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [sortBy]);

  const genres = useMemo(() => Array.from(new Set(albums.map((a) => a.genre))).sort(), [albums]);
  const years = useMemo(() => Array.from(new Set(albums.map((a) => a.year))).sort((a, b) => b - a), [albums]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return albums.filter((a) => {
      if (genreFilter && a.genre !== genreFilter) return false;
      if (yearFilter && String(a.year) !== yearFilter) return false;
      if (q) {
        return (
          a.title.toLowerCase().includes(q) ||
          a.creator.toLowerCase().includes(q) ||
          a.genre.toLowerCase().includes(q) ||
          (a.metadata.recordLabel || '').toLowerCase().includes(q) ||
          String(a.year).includes(q)
        );
      }
      return true;
    });
  }, [albums, query, genreFilter, yearFilter]);

  return (
    <main className="max-w-6xl mx-auto px-4 sm:px-6 py-12">
      <header className="pb-8 border-b border-[#405344]/15">
        <p className="text-xs uppercase tracking-widest text-[#556358]">Arsip Rekaman &amp; Bunyi</p>
        <h1 className="font-serif-display text-3xl sm:text-4xl font-medium text-[#222B24] mt-1">
          Arsip Album Musik Indonesia
        </h1>
        <p className="text-sm sm:text-base text-[#556358] mt-2 max-w-2xl leading-relaxed">
          Katalog rekaman musik folk, musikalisasi puisi, dan komposisi bunyi Nusantara beserta daftar lagu serta pemutar audio langsung di website.
        </p>

        <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3">
          <div className="lg:col-span-5 relative">
            <label htmlFor="musik-search" className="sr-only">
              Cari album atau musisi
            </label>
            <Search
              className="w-4 h-4 text-[#556358] absolute left-3.5 top-1/2 -translate-y-1/2"
              aria-hidden="true"
            />
            <input
              id="musik-search"
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Cari judul album, musisi/band, label, atau tahun..."
              className="w-full pl-10 pr-4 py-2.5 text-sm bg-[#FAF9F3] border border-[#405344]/20 rounded-lg text-[#222B24] focus:outline-none focus:border-[#405344]"
            />
          </div>

          <div className="lg:col-span-3">
            <select
              aria-label="Filter genre musik"
              value={genreFilter}
              onChange={(e) => setGenreFilter(e.target.value)}
              className="w-full px-3 py-2.5 text-sm bg-[#FAF9F3] border border-[#405344]/20 rounded-lg text-[#222B24]"
            >
              <option value="">Semua Genre</option>
              {genres.map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>
          </div>

          <div className="lg:col-span-2">
            <select
              aria-label="Filter tahun album"
              value={yearFilter}
              onChange={(e) => setYearFilter(e.target.value)}
              className="w-full px-3 py-2.5 text-sm bg-[#FAF9F3] border border-[#405344]/20 rounded-lg text-[#222B24]"
            >
              <option value="">Semua Tahun</option>
              {years.map((y) => (
                <option key={y} value={String(y)}>
                  {y}
                </option>
              ))}
            </select>
          </div>

          <div className="lg:col-span-2">
            <select
              aria-label="Urutkan album"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="w-full px-3 py-2.5 text-sm bg-[#FAF9F3] border border-[#405344]/20 rounded-lg text-[#222B24]"
            >
              <option value="newest">Koleksi Terbaru</option>
              <option value="title">Judul (A–Z)</option>
              <option value="year_desc">Tahun Terbaru</option>
              <option value="year_asc">Tahun Terlama</option>
            </select>
          </div>
        </div>
      </header>

      <section className="pt-8">
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((n) => (
              <div key={n} className="h-80 rounded-xl bg-[#E8F0E3]/60 animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center bg-[#F3F7EF] border border-[#405344]/15 rounded-xl">
            <p className="font-serif-display text-xl text-[#222B24]">
              Belum ada album musik yang sesuai dengan pencarian Anda.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((album) => (
              <CollectionCard
                key={album.id}
                item={album}
                onSelect={(id) => onNavigate(`/koleksi/${id}`)}
                actionLabel="Putar Album"
              />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
