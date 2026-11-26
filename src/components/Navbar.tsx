import { useState } from 'react';
import { Menu, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useSite } from '../context/SiteContext';

interface NavbarProps {
  currentPath: string;
  onNavigate: (path: string) => void;
}

const NAV_LINKS = [
  { label: 'Beranda', path: '/' },
  { label: 'Sastra', path: '/sastra' },
  { label: 'Sastra Film', path: '/film' },
  { label: 'Musik', path: '/musik' },
  { label: 'About', path: '/about' },
];

export function Navbar({ currentPath, onNavigate }: NavbarProps) {
  const { user } = useAuth();
  const { settings } = useSite();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLink = (path: string) => {
    setMobileOpen(false);
    onNavigate(path);
  };

  const primaryActionPath = user ? (user.role === 'admin' ? '/admin' : '/profil') : '/masuk';
  const primaryActionLabel = user
    ? user.role === 'admin'
      ? 'Dashboard Admin'
      : user.name.split(' ')[0]
    : 'Masuk';

  return (
    <header className="sticky top-0 z-40 bg-[#FAF9F3]/95 backdrop-blur-sm border-b border-[#405344]/15">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-8">
        {/* Zone 1: Single-line Brand Title */}
        <a
          href="/"
          onClick={(e) => {
            e.preventDefault();
            handleLink('/');
          }}
          className="font-serif-display text-xl font-semibold tracking-tight text-[#222B24] whitespace-nowrap shrink-0"
        >
          {settings.libraryName}
        </a>

        {/* Zone 2: 5 concise single-line nav links */}
        <nav aria-label="Navigasi Utama" className="hidden md:flex items-center gap-7">
          {NAV_LINKS.map((item) => {
            const active =
              item.path === '/'
                ? currentPath === '/'
                : currentPath.startsWith(item.path);
            return (
              <a
                key={item.path}
                href={item.path}
                onClick={(e) => {
                  e.preventDefault();
                  handleLink(item.path);
                }}
                aria-current={active ? 'page' : undefined}
                className={`text-sm whitespace-nowrap shrink-0 py-1 border-b transition-colors ${
                  active
                    ? 'text-[#222B24] font-medium border-[#405344]'
                    : 'text-[#556358] border-transparent hover:text-[#222B24] hover:border-[#A6B59A]'
                }`}
              >
                {item.label}
              </a>
            );
          })}
        </nav>

        {/* Zone 3: 1 primary action */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={() => handleLink(primaryActionPath)}
            className="hidden md:inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-[#FAF9F3] bg-[#405344] rounded-lg hover:bg-[#2A382D] transition-colors whitespace-nowrap shrink-0"
          >
            {primaryActionLabel}
          </button>

          <button
            type="button"
            onClick={() => setMobileOpen((prev) => !prev)}
            className="md:hidden inline-flex items-center justify-center w-11 h-11 rounded-lg text-[#405344] hover:bg-[#E8F0E3] transition-colors"
            aria-label={mobileOpen ? 'Tutup menu navigasi' : 'Buka menu navigasi'}
            aria-expanded={mobileOpen}
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="md:hidden bg-[#FAF9F3] border-b border-[#405344]/15 px-4 pb-5 pt-2">
          <nav aria-label="Navigasi Seluler" className="flex flex-col gap-1">
            {NAV_LINKS.map((item) => {
              const active =
                item.path === '/'
                  ? currentPath === '/'
                  : currentPath.startsWith(item.path);
              return (
                <a
                  key={item.path}
                  href={item.path}
                  onClick={(e) => {
                    e.preventDefault();
                    handleLink(item.path);
                  }}
                  className={`px-3 py-3 rounded-lg text-sm font-medium transition-colors ${
                    active
                      ? 'bg-[#E8F0E3] text-[#222B24]'
                      : 'text-[#556358] hover:bg-[#F3F7EF] hover:text-[#222B24]'
                  }`}
                >
                  {item.label}
                </a>
              );
            })}
            <button
              type="button"
              onClick={() => handleLink(primaryActionPath)}
              className="mt-2 w-full py-3 px-4 rounded-lg text-sm font-medium text-[#FAF9F3] bg-[#405344] hover:bg-[#2A382D] transition-colors text-center"
            >
              {primaryActionLabel}
            </button>
          </nav>
        </div>
      )}
    </header>
  );
}
