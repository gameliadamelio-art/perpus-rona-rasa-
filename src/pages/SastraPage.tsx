import { useEffect, useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { CollectionCard } from '../components/CollectionCard';
import { api } from '../lib/api';
import type { CollectionItem } from '../types';

interface SastraPageProps {
  initialQuery?: string;
  initialTab?: string;
  onNavigate: (path: string) => void;
}

const BOOK_SUBCATEGORIES = [
  'Semua',
  'Novel',
  'Kumpulan Cerpen',
  'Antologi Puisi',
  'Esai',
  'Prosa',
  'Sastra Klasik',
  'Sastra Kontemporer',
];

const POEM_SUBCATEGORIES = ['Semua', 'Puisi Individual', 'Antologi Puisi'];

export function SastraPage({ initialQuery = '', initialTab = 'all', onNavigate }: SastraPageProps) {
  const [items, setItems] = useState<CollectionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'all' | 'book' | 'poem'>(
    initialTab === 'book' || initialTab === 'poem' ? initialTab : 'all'
  );
  const [subCategory, setSubCategory] = useState('Semua');
  const [genreFilter, setGenreFilter] = useState('');
  const [yearFilter, setYearFilter] = useState('');
  const [sortBy, setSortBy] = useState('newest');
  const [query, setQuery] = useState(initialQuery);

  useEffect(() => {
    setQuery(initialQuery);
  }, [initialQuery]);

  useEffect(() => {
    if (initialTab === 'book' || initialTab === 'poem' || initialTab === 'all') {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    Promise.all([
      api.getCollections({ type: 'book', sort: sortBy }),
      api.getCollections({ type: 'poem', sort: sortBy }),
    ])
      .then(([bRes, pRes]) => {
        if (active) {
          setItems([...bRes.items, ...pRes.items]);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [sortBy]);

  const genres = useMemo(
    () => Array.from(new Set(items.map((i) => i.genre).filter(Boolean))).sort(),
    [items]
  );

  const years = useMemo(
    () => Array.from(new Set(items.map((i) => i.year))).sort((a, b) => b - a),
    [items]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = items.filter((item) => {
      if (activeTab !== 'all' && item.type !== activeTab) return false;
      if (subCategory !== 'Semua' && item.subCategory.toLowerCase() !== subCategory.toLowerCase()) {
        return false;
      }
      if (genreFilter && item.genre !== genreFilter) return false;
      if (yearFilter && String(item.year) !== yearFilter) return false;
      if (q) {
        const match =
          item.title.toLowerCase().includes(q) ||
          item.creator.toLowerCase().includes(q) ||
          item.genre.toLowerCase().includes(q) ||
          item.subCategory.toLowerCase().includes(q) ||
          String(item.year).includes(q) ||
          (item.metadata.theme || '').toLowerCase().includes(q);
        if (!match) return false;
      }
      return true;
    });

    if (sortBy === 'title') {
      return [...list].sort((a, b) => a.title.localeCompare(b.title));
    }
    if (sortBy === 'year_desc') {
      return [...list].sort((a, b) => b.year - a.year);
    }
    if (sortBy === 'year_asc') {
      return [...list].sort((a, b) => a.year - b.year);
    }
    return [...list].sort((a, b) => b.id - a.id);
  }, [items, activeTab, subCategory, genreFilter, yearFilter, query, sortBy]);

  const activeSubCategories =
    activeTab === 'book'
      ? BOOK_SUBCATEGORIES
      : activeTab === 'poem'
      ? POEM_SUBCATEGORIES
      : ['Semua'];

  return (
    <main className="max-w-6xl mx-auto px-4 sm:px-6 py-12">
      <header className="pb-8 border-b border-[#405344]/15">
        <p className="text-xs uppercase tracking-widest text-[#556358]">Katalog Bacaan Langsung</p>
        <h1 className="font-serif-display text-3xl sm:text-4xl font-medium text-[#222B24] mt-1">
          Ruang Sastra: Buku &amp; Puisi
        </h1>
        <p className="text-sm sm:text-base text-[#556358] mt-2 max-w-2xl leading-relaxed">
          Nikmati novel, kumpulan cerpen, esai, naskah sastra klasik, hingga sajak dan antologi puisi Indonesia langsung melalui pembaca digital internal Perpustakaan Rona Rasa.
        </p>

        {/* Main category segmented tabs */}
        <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
          <div
            role="tablist"
            aria-label="Kategori Sastra"
            className="inline-flex items-center gap-1 p-1 bg-[#E8F0E3] rounded-lg border border-[#405344]/15"
          >
            {[
              { id: 'all', label: 'Semua Sastra' },
              { id: 'book', label: 'Buku Sastra' },
              { id: 'poem', label: 'Puisi' },
            ].map((tab) => (
              <button
                key={tab.id}
                role="tab"
                type="button"
                aria-selected={activeTab === tab.id}
                onClick={() => {
                  setActiveTab(tab.id as 'all' | 'book' | 'poem');
                  setSubCategory('Semua');
                }}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                  activeTab === tab.id
                    ? 'bg-[#FAF9F3] text-[#222B24] shadow-xs'
                    : 'text-[#556358] hover:text-[#222B24]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <p className="text-sm text-[#556358] tabular-nums">
            Menampilkan {filtered.length} karya
          </p>
        </div>

        {/* Subcategory interactive filter buttons */}
        {activeSubCategories.length > 1 && (
          <div className="mt-4 flex flex-wrap items-center gap-2">
            {activeSubCategories.map((sub) => (
              <button
                key={sub}
                type="button"
                onClick={() => setSubCategory(sub)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md border transition-colors whitespace-nowrap shrink-0 ${
                  subCategory === sub
                    ? 'bg-[#405344] text-[#FAF9F3] border-[#405344]'
                    : 'bg-[#FAF9F3] text-[#556358] border-[#405344]/20 hover:bg-[#E8F0E3]'
                }`}
              >
                {sub}
              </button>
            ))}
          </div>
        )}

        {/* Search & Filter Toolbar */}
        <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3">
          <div className="lg:col-span-5 relative">
            <label htmlFor="sastra-search" className="sr-only">
              Cari buku atau puisi
            </label>
            <Search
              className="w-4 h-4 text-[#556358] absolute left-3.5 top-1/2 -translate-y-1/2"
              aria-hidden="true"
            />
            <input
              id="sastra-search"
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Cari judul, pengarang, penyair, tema..."
              className="w-full pl-10 pr-4 py-2.5 text-sm bg-[#FAF9F3] border border-[#405344]/20 rounded-lg text-[#222B24] focus:outline-none focus:border-[#405344]"
            />
          </div>

          <div className="lg:col-span-3">
            <label htmlFor="sastra-genre" className="sr-only">
              Filter genre
            </label>
            <select
              id="sastra-genre"
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
            <label htmlFor="sastra-year" className="sr-only">
              Filter tahun
            </label>
            <select
              id="sastra-year"
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
            <label htmlFor="sastra-sort" className="sr-only">
              Urutkan koleksi
            </label>
            <select
              id="sastra-sort"
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

      {/* Grid */}
      <section className="pt-8">
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((n) => (
              <div key={n} className="h-80 rounded-xl bg-[#E8F0E3]/60 animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 px-6 text-center bg-[#F3F7EF] border border-[#405344]/15 rounded-xl">
            <p className="font-serif-display text-xl text-[#222B24]">
              Tidak ada karya yang sesuai dengan filter saat ini.
            </p>
            <button
              type="button"
              onClick={() => {
                setActiveTab('all');
                setSubCategory('Semua');
                setGenreFilter('');
                setYearFilter('');
                setQuery('');
              }}
              className="mt-4 px-4 py-2 text-sm font-medium bg-[#405344] text-[#FAF9F3] rounded-lg hover:bg-[#2A382D]"
            >
              Atur Ulang Filter
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filtered.map((item) => (
              <CollectionCard
                key={item.id}
                item={item}
                onSelect={(id) => onNavigate(`/koleksi/${id}`)}
                actionLabel="Baca Sekarang"
              />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
