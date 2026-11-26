import { ResilientImage } from '../components/ResilientImage';
import { useSite } from '../context/SiteContext';

interface AboutPageProps {
  onNavigate: (path: string) => void;
}

export function AboutPage({ onNavigate }: AboutPageProps) {
  const { settings } = useSite();

  return (
    <main className="max-w-5xl mx-auto px-4 sm:px-6 py-12">
      <header className="pb-10 border-b border-[#405344]/15">
        <p className="text-xs uppercase tracking-widest text-[#556358]">Tentang Perpustakaan</p>
        <h1 className="font-serif-display text-3xl sm:text-5xl font-medium text-[#222B24] mt-2 leading-tight">
          {settings.libraryName}
        </h1>
        <p className="font-serif-display italic text-xl text-[#405344] mt-3">
          {settings.tagline}
        </p>
      </header>

      <section className="py-10 grid grid-cols-1 lg:grid-cols-12 gap-10 items-start border-b border-[#405344]/15">
        <div className="lg:col-span-7 space-y-4">
          <h2 className="font-serif-display text-2xl font-medium text-[#222B24]">
            Sejarah &amp; Latar Belakang
          </h2>
          <p className="text-base text-[#222B24]/90 leading-relaxed whitespace-pre-line">
            {settings.aboutHistory}
          </p>
        </div>

        <div className="lg:col-span-5">
          <div className="aspect-[4/3] rounded-xl overflow-hidden border border-[#405344]/15 bg-[#E8F0E3]">
            <ResilientImage
              src={settings.aboutImageUrl}
              alt={`Meja arsip dan ruang baca ${settings.libraryName}`}
              fallbackTitle={settings.libraryName}
              className="w-full h-full object-cover"
            />
          </div>
          <p className="text-xs italic text-[#556358] mt-2.5">
            Ruang kurasi arsip naskah dan indeks bibliografi {settings.libraryName}.
          </p>
        </div>
      </section>

      <section className="py-10 grid grid-cols-1 md:grid-cols-2 gap-8 border-b border-[#405344]/15">
        <div className="p-7 rounded-xl bg-[#E8F0E3]/60 border border-[#405344]/15">
          <h2 className="font-serif-display text-2xl font-medium text-[#222B24] mb-3">Visi</h2>
          <p className="text-base text-[#222B24]/90 leading-relaxed whitespace-pre-line">
            {settings.aboutVision}
          </p>
        </div>

        <div className="p-7 rounded-xl bg-[#F3F7EF] border border-[#405344]/15">
          <h2 className="font-serif-display text-2xl font-medium text-[#222B24] mb-3">Misi</h2>
          <p className="text-base text-[#222B24]/90 leading-relaxed whitespace-pre-line">
            {settings.aboutMission}
          </p>
        </div>
      </section>

      <section className="py-10 space-y-10">
        <div>
          <h2 className="font-serif-display text-2xl font-medium text-[#222B24] mb-3">
            Tujuan Perpustakaan
          </h2>
          <p className="text-base text-[#222B24]/90 leading-relaxed max-w-3xl whitespace-pre-line">
            {settings.aboutGoals}
          </p>
        </div>

        <div>
          <h2 className="font-serif-display text-2xl font-medium text-[#222B24] mb-3">
            Fokus Koleksi
          </h2>
          <p className="text-base text-[#222B24]/90 leading-relaxed max-w-3xl whitespace-pre-line">
            {settings.aboutCollectionFocus}
          </p>
        </div>

        <div>
          <h2 className="font-serif-display text-2xl font-medium text-[#222B24] mb-3">
            Kontribusi terhadap Pelestarian Sastra &amp; Budaya Indonesia
          </h2>
          <p className="text-base text-[#222B24]/90 leading-relaxed max-w-3xl whitespace-pre-line">
            {settings.aboutContribution}
          </p>
        </div>

        <div className="pt-4 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => onNavigate('/sastra')}
            className="px-5 py-2.5 text-sm font-medium bg-[#405344] text-[#FAF9F3] rounded-lg hover:bg-[#2A382D] transition-colors"
          >
            Mulai Membaca Koleksi
          </button>
          <button
            type="button"
            onClick={() => onNavigate('/daftar')}
            className="px-5 py-2.5 text-sm font-medium text-[#405344] bg-[#E8F0E3] border border-[#405344]/20 rounded-lg hover:bg-[#DCE8D5] transition-colors"
          >
            Daftar Sebagai Anggota
          </button>
        </div>
      </section>
    </main>
  );
}
