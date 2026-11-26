import { useEffect, useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { CollectionCard } from '../components/CollectionCard';
import { api } from '../lib/api';
import type { CollectionItem } from '../types';

interface FilmPageProps {
  onNavigate: (path: string) => void;
}

export function FilmPage({ onNavigate }: FilmPageProps) {
  const [films, setFilms] = useState<CollectionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [genreFilter, setGenreFilter] = useState('');
  const [yearFilter, setYearFilter] = useState('');
  const [sortBy, setSortBy] = useState('newest');

  useEffect(() => {
    let active = true;
    api
      .getCollections({ type: 'film', sort: sortBy })
      .then((res) => {
        if (active) setFilms(res.items);
      })
      .catch(() => {})
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [sortBy]);

  const genres = useMemo(() => Array.from(new Set(films.map((f) => f.genre))).sort(), [films]);
  const years = useMemo(() => Array.from(new Set(films.map((f) => f.year))).sort((a, b) => b - a), [films]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return films.filter((f) => {
      if (genreFilter && f.genre !== genreFilter) return false;
      if (yearFilter && String(f.year) !== yearFilter) return false;
      if (q) {
        return (
          f.title.toLowerCase().includes(q) ||
          f.creator.toLowerCase().includes(q) ||
          f.genre.toLowerCase().includes(q) ||
          (f.metadata.castMembers || '').toLowerCase().includes(q) ||
          String(f.year).includes(q)
        );
      }
      return true;
    });
  }, [films, query, genreFilter, yearFilter]);

  return (
    <main className="max-w-6xl mx-auto px-4 sm:px-6 py-12">
      <header className="pb-8 border-b border-[#405344]/15">
        <p className="text-xs uppercase tracking-widest text-[#556358]">Arsip Sinema &amp; Budaya</p>
        <h1 className="font-serif-display text-3xl sm:text-4xl font-medium text-[#222B24] mt-1">
          Sastra Film Indonesia
        </h1>
        <p className="text-sm sm:text-base text-[#556358] mt-2 max-w-2xl leading-relaxed">
          Kurasi film panjang, film pendek, dan dokumenter Indonesia dengan nilai sastra, puitika visual, serta catatan produksi terarsip.
        </p>

        <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3">
          <div className="lg:col-span-5 relative">
            <label htmlFor="film-search" className="sr-only">
              Cari film atau sutradara
            </label>
            <Search
              className="w-4 h-4 text-[#556358] absolute left-3.5 top-1/2 -translate-y-1/2"
              aria-hidden="true"
            />
            <input
              id="film-search"
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Cari judul film, sutradara, pemeran, atau tahun..."
              className="w-full pl-10 pr-4 py-2.5 text-sm bg-[#FAF9F3] border border-[#405344]/20 rounded-lg text-[#222B24] focus:outline-none focus:border-[#405344]"
            />
          </div>

          <div className="lg:col-span-3">
            <select
              aria-label="Filter genre film"
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
              aria-label="Filter tahun film"
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
              aria-label="Urutkan film"
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
              <div key={n} className="h-96 rounded-xl bg-[#E8F0E3]/60 animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center bg-[#F3F7EF] border border-[#405344]/15 rounded-xl">
            <p className="font-serif-display text-xl text-[#222B24]">
              Belum ada arsip film yang cocok dengan pencarian Anda.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((film) => (
              <CollectionCard
                key={film.id}
                item={film}
                onSelect={(id) => onNavigate(`/koleksi/${id}`)}
                actionLabel="Buka Detail &amp; Putar"
              />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
