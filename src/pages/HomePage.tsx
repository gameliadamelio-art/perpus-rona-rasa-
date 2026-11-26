import React, { useEffect, useMemo, useState } from 'react';
import { Search, ArrowRight } from 'lucide-react';
import { CollectionCard } from '../components/CollectionCard';
import { ResilientImage } from '../components/ResilientImage';
import { useSite } from '../context/SiteContext';
import { api } from '../lib/api';
import type { CollectionItem } from '../types';

interface HomePageProps {
  onNavigate: (path: string) => void;
}

export function HomePage({ onNavigate }: HomePageProps) {
  const { settings } = useSite();
  const [collections, setCollections] = useState<CollectionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    let active = true;
    api
      .getCollections({ sort: 'newest' })
      .then((res) => {
        if (active) setCollections(res.items);
      })
      .catch(() => {})
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const searchResults = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return [];
    return collections.filter(
      (item) =>
        item.title.toLowerCase().includes(q) ||
        item.creator.toLowerCase().includes(q) ||
        item.genre.toLowerCase().includes(q) ||
        item.subCategory.toLowerCase().includes(q) ||
        String(item.year).includes(q)
    );
  }, [collections, searchQuery]);

  const featuredItems = useMemo(() => {
    if (settings.featuredCollectionIds && settings.featuredCollectionIds.length > 0) {
      const byId = collections.filter((c) => settings.featuredCollectionIds.includes(c.id));
      if (byId.length > 0) return byId.slice(0, 4);
    }
    return collections.filter((c) => c.isFeatured).slice(0, 4);
  }, [collections, settings.featuredCollectionIds]);

  const books = useMemo(() => collections.filter((c) => c.type === 'book').slice(0, 3), [collections]);
  const poems = useMemo(() => collections.filter((c) => c.type === 'poem').slice(0, 3), [collections]);
  const films = useMemo(() => collections.filter((c) => c.type === 'film').slice(0, 2), [collections]);
  const albums = useMemo(() => collections.filter((c) => c.type === 'album').slice(0, 2), [collections]);
  const latest = useMemo(() => collections.slice(0, 4), [collections]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      onNavigate(`/sastra?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  return (
    <main>
      {/* Hero Section */}
      <section className="bg-[#E8F0E3] border-b border-[#405344]/15">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12 lg:py-16 grid grid-cols-1 lg:grid-cols-12 gap-10 items-stretch">
          <div className="lg:col-span-7 flex flex-col justify-between gap-8">
            <div>
              <p className="text-xs tracking-widest uppercase text-[#405344] font-medium mb-3">
                {settings.libraryName} · Ruang Literasi Digital
              </p>
              <h1 className="font-serif-display text-4xl sm:text-5xl font-medium text-[#222B24] leading-[1.12] tracking-tight max-w-2xl">
                {settings.heroTitle}
              </h1>
              <p className="font-serif-display italic text-xl text-[#405344] mt-4">
                “{settings.tagline}”
              </p>
              <p className="text-base text-[#556358] mt-4 max-w-xl leading-relaxed">
                {settings.heroDescription}
              </p>
            </div>

            <div className="space-y-4">
              <form onSubmit={handleSearchSubmit} className="relative max-w-xl" role="search">
                <label htmlFor="home-search" className="sr-only">
                  Cari judul buku, puisi, pengarang, sutradara, musisi, atau tahun
                </label>
                <div className="flex items-center bg-[#FAF9F3] border border-[#405344]/25 rounded-xl overflow-hidden focus-within:border-[#405344]">
                  <Search className="w-5 h-5 text-[#556358] ml-4 shrink-0" aria-hidden="true" />
                  <input
                    id="home-search"
                    type="search"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Cari judul, pengarang, penyair, sutradara, musisi, atau tahun..."
                    className="w-full px-3 py-3.5 text-sm text-[#222B24] bg-transparent placeholder:text-[#556358]/70 focus:outline-none"
                  />
                  <button
                    type="submit"
                    className="px-5 py-3.5 text-sm font-medium bg-[#405344] text-[#FAF9F3] hover:bg-[#2A382D] transition-colors shrink-0 whitespace-nowrap"
                  >
                    Cari Koleksi
                  </button>
                </div>
              </form>

              <div className="flex flex-wrap items-center gap-4 pt-1">
                <button
                  type="button"
                  onClick={() => onNavigate('/sastra')}
                  className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium bg-[#405344] text-[#FAF9F3] rounded-lg hover:bg-[#2A382D] transition-colors"
                >
                  Jelajahi Ruang Sastra
                  <ArrowRight className="w-4 h-4" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  onClick={() => onNavigate('/about')}
                  className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-[#405344] bg-[#FAF9F3] border border-[#405344]/25 rounded-lg hover:bg-[#DCE8D5] transition-colors"
                >
                  Tentang Rona Rasa
                </button>
              </div>
            </div>
          </div>

          <div className="lg:col-span-5">
            <div className="h-72 sm:h-96 lg:h-full min-h-[340px] rounded-xl overflow-hidden border border-[#405344]/15 bg-[#DCE8D5]">
              <ResilientImage
                src={settings.heroBannerUrl}
                alt={`Suasana ruang baca ${settings.libraryName}`}
                fallbackTitle={settings.libraryName}
                className="w-full h-full object-cover"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Instant Search Results if typing */}
      {searchQuery.trim() !== '' && (
        <section className="max-w-6xl mx-auto px-4 sm:px-6 py-10 border-b border-[#405344]/15">
          <div className="flex items-baseline justify-between mb-6">
            <h2 className="font-serif-display text-2xl font-medium text-[#222B24]">
              Hasil Pencarian: “{searchQuery}”
            </h2>
            <span className="text-sm text-[#556358] tabular-nums">
              {searchResults.length} koleksi ditemukan
            </span>
          </div>
          {searchResults.length === 0 ? (
            <div className="p-8 rounded-xl bg-[#F3F7EF] border border-[#405344]/15 text-center">
              <p className="text-sm text-[#556358]">
                Belum ada koleksi yang cocok dengan kata kunci tersebut. Coba cari berdasarkan pengarang, genre, atau tahun terbit.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {searchResults.map((item) => (
                <CollectionCard
                  key={item.id}
                  item={item}
                  onSelect={(id) => onNavigate(`/koleksi/${id}`)}
                />
              ))}
            </div>
          )}
        </section>
      )}

      {/* Welcome Note */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-12 border-b border-[#405344]/10">
        <div className="max-w-3xl">
          <p className="text-xs uppercase tracking-widest text-[#556358] mb-2">Catatan Kurator</p>
          <p className="font-serif-display text-xl sm:text-2xl text-[#222B24] leading-relaxed">
            {settings.welcomeText}
          </p>
        </div>
      </section>

      {/* Featured Collections */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-14">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
          <div>
            <p className="text-xs uppercase tracking-widest text-[#556358]">Kurasi Utama</p>
            <h2 className="font-serif-display text-3xl font-medium text-[#222B24] mt-1">
              Koleksi Unggulan
            </h2>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('/sastra')}
            className="text-sm font-medium text-[#405344] hover:text-[#222B24] transition-colors self-start sm:self-auto"
          >
            Lihat seluruh katalog →
          </button>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((n) => (
              <div key={n} className="h-80 rounded-xl bg-[#E8F0E3]/60 animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {featuredItems.map((item) => (
              <CollectionCard
                key={item.id}
                item={item}
                onSelect={(id) => onNavigate(`/koleksi/${id}`)}
              />
            ))}
          </div>
        )}
      </section>

      {/* Buku Pilihan & Puisi Pilihan */}
      <section className="bg-[#F3F7EF] border-y border-[#405344]/10 py-14">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 space-y-14">
          <div>
            <div className="flex items-end justify-between mb-7">
              <div>
                <p className="text-xs uppercase tracking-widest text-[#556358]">Sastra Tulis</p>
                <h2 className="font-serif-display text-2xl sm:text-3xl font-medium text-[#222B24] mt-1">
                  Buku Pilihan
                </h2>
              </div>
              <button
                type="button"
                onClick={() => onNavigate('/sastra')}
                className="text-sm font-medium text-[#405344] hover:underline"
              >
                Semua Buku →
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {books.map((item) => (
                <CollectionCard
                  key={item.id}
                  item={item}
                  onSelect={(id) => onNavigate(`/koleksi/${id}`)}
                  actionLabel="Baca Buku"
                />
              ))}
            </div>
          </div>

          <div className="pt-10 border-t border-[#405344]/10">
            <div className="flex items-end justify-between mb-7">
              <div>
                <p className="text-xs uppercase tracking-widest text-[#556358]">Sajak &amp; Antologi</p>
                <h2 className="font-serif-display text-2xl sm:text-3xl font-medium text-[#222B24] mt-1">
                  Puisi Pilihan
                </h2>
              </div>
              <button
                type="button"
                onClick={() => onNavigate('/sastra?tab=poem')}
                className="text-sm font-medium text-[#405344] hover:underline"
              >
                Semua Puisi →
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {poems.map((poem) => (
                <article
                  key={poem.id}
                  className="bg-[#FAF9F3] border border-[#405344]/15 rounded-xl p-6 flex flex-col justify-between gap-4 hover:border-[#405344]/35 transition-colors"
                >
                  <div>
                    <p className="text-xs text-[#556358]">
                      <span>{poem.metadata.theme || poem.genre}</span>
                      <span aria-hidden="true" className="mx-1.5">·</span>
                      <span className="tabular-nums">{poem.year}</span>
                    </p>
                    <h3 className="font-serif-display text-xl font-semibold text-[#222B24] mt-1.5">
                      {poem.title}
                    </h3>
                    <p className="text-sm text-[#405344] mt-0.5">{poem.creator}</p>
                    <p className="font-serif-display italic text-sm text-[#556358] mt-4 whitespace-pre-line line-clamp-4 leading-relaxed">
                      {poem.metadata.poemText || poem.description}
                    </p>
                  </div>
                  <div className="pt-3 border-t border-[#405344]/10 flex justify-between items-center">
                    <span className="text-xs text-[#556358]">{poem.metadata.era || poem.subCategory}</span>
                    <button
                      type="button"
                      onClick={() => onNavigate(`/koleksi/${poem.id}`)}
                      className="text-sm font-medium text-[#405344] hover:text-[#222B24]"
                    >
                      Baca Puisi →
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Film & Musik Pilihan */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-14">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          <div>
            <div className="flex items-end justify-between mb-6">
              <div>
                <p className="text-xs uppercase tracking-widest text-[#556358]">Arsip Sinema</p>
                <h2 className="font-serif-display text-2xl font-medium text-[#222B24] mt-1">
                  Rekomendasi Film Indonesia
                </h2>
              </div>
              <button
                type="button"
                onClick={() => onNavigate('/film')}
                className="text-sm font-medium text-[#405344] hover:underline"
              >
                Semua Film →
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {films.map((film) => (
                <CollectionCard
                  key={film.id}
                  item={film}
                  onSelect={(id) => onNavigate(`/koleksi/${id}`)}
                />
              ))}
            </div>
          </div>

          <div>
            <div className="flex items-end justify-between mb-6">
              <div>
                <p className="text-xs uppercase tracking-widest text-[#556358]">Arsip Bunyi</p>
                <h2 className="font-serif-display text-2xl font-medium text-[#222B24] mt-1">
                  Album Musik Pilihan
                </h2>
              </div>
              <button
                type="button"
                onClick={() => onNavigate('/musik')}
                className="text-sm font-medium text-[#405344] hover:underline"
              >
                Semua Musik →
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {albums.map((album) => (
                <CollectionCard
                  key={album.id}
                  item={album}
                  onSelect={(id) => onNavigate(`/koleksi/${id}`)}
                />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Koleksi Terbaru */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 pb-8">
        <div className="pt-10 border-t border-[#405344]/15">
          <div className="flex items-end justify-between mb-7">
            <div>
              <p className="text-xs uppercase tracking-widest text-[#556358]">Baru Diarsipkan</p>
              <h2 className="font-serif-display text-2xl sm:text-3xl font-medium text-[#222B24] mt-1">
                Koleksi Terbaru
              </h2>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {latest.map((item) => (
              <CollectionCard
                key={item.id}
                item={item}
                onSelect={(id) => onNavigate(`/koleksi/${id}`)}
              />
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
