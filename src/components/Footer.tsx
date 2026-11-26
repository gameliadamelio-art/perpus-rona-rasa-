import { useAuth } from '../context/AuthContext';
import { useSite } from '../context/SiteContext';

interface FooterProps {
  onNavigate: (path: string) => void;
}

export function Footer({ onNavigate }: FooterProps) {
  const { settings } = useSite();
  const { user } = useAuth();

  return (
    <footer className="bg-[#E8F0E3]/60 border-t border-[#405344]/15 mt-20">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 pb-10 border-b border-[#405344]/15">
          <div className="md:col-span-5">
            <h2 className="font-serif-display text-xl font-semibold text-[#222B24]">
              {settings.libraryName}
            </h2>
            <p className="font-serif-display italic text-base text-[#405344] mt-1">
              {settings.tagline}
            </p>
            <p className="text-sm text-[#556358] mt-3 max-w-md leading-relaxed">
              Perpustakaan digital independen untuk membaca, mendengarkan, menonton, dan melestarikan karya sastra serta budaya Indonesia.
            </p>
          </div>

          <div className="md:col-span-3">
            <h3 className="text-xs font-semibold tracking-wider text-[#405344] mb-3">
              Ruang Koleksi
            </h3>
            <ul className="space-y-2 text-sm text-[#556358]">
              <li>
                <button
                  type="button"
                  onClick={() => onNavigate('/sastra')}
                  className="hover:text-[#222B24] transition-colors"
                >
                  Buku Sastra &amp; Puisi
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onNavigate('/film')}
                  className="hover:text-[#222B24] transition-colors"
                >
                  Arsip Sastra Film
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onNavigate('/musik')}
                  className="hover:text-[#222B24] transition-colors"
                >
                  Arsip Album Musik
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onNavigate('/about')}
                  className="hover:text-[#222B24] transition-colors"
                >
                  Tentang Perpustakaan
                </button>
              </li>
            </ul>
          </div>

          <div className="md:col-span-4">
            <h3 className="text-xs font-semibold tracking-wider text-[#405344] mb-3">
              Akses Anggota &amp; Pustakawan
            </h3>
            <ul className="space-y-2 text-sm text-[#556358]">
              {user ? (
                <>
                  <li>
                    <button
                      type="button"
                      onClick={() => onNavigate('/profil')}
                      className="hover:text-[#222B24] transition-colors"
                    >
                      Profil &amp; Riwayat Membaca ({user.name})
                    </button>
                  </li>
                  {user.role === 'admin' && (
                    <li>
                      <button
                        type="button"
                        onClick={() => onNavigate('/admin')}
                        className="hover:text-[#222B24] transition-colors font-medium text-[#405344]"
                      >
                        Dashboard Pustakawan
                      </button>
                    </li>
                  )}
                </>
              ) : (
                <>
                  <li>
                    <button
                      type="button"
                      onClick={() => onNavigate('/masuk')}
                      className="hover:text-[#222B24] transition-colors"
                    >
                      Masuk Anggota
                    </button>
                  </li>
                  <li>
                    <button
                      type="button"
                      onClick={() => onNavigate('/daftar')}
                      className="hover:text-[#222B24] transition-colors"
                    >
                      Pendaftaran Anggota Baru
                    </button>
                  </li>
                </>
              )}
              <li>
                <button
                  type="button"
                  onClick={() => onNavigate('/admin/login')}
                  className="hover:text-[#222B24] transition-colors"
                >
                  Portal Masuk Pustakawan (Admin)
                </button>
              </li>
            </ul>
          </div>
        </div>

        <div className="pt-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs text-[#556358]">
          <p>© {new Date().getFullYear()} {settings.libraryName}. Ruang Literasi Digital Independen.</p>
          <p>Akses baca langsung · Pelestarian karya terbuka dan domain publik</p>
        </div>
      </div>
    </footer>
  );
}
