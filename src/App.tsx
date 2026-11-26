import { useCallback, useEffect, useState } from 'react';
import { Footer } from './components/Footer';
import { Navbar } from './components/Navbar';
import { AuthProvider } from './context/AuthContext';
import { SiteProvider } from './context/SiteContext';
import { AboutPage } from './pages/AboutPage';
import { AdminDashboardPage } from './pages/AdminDashboardPage';
import { AuthPage } from './pages/AuthPage';
import { BookReaderPage } from './pages/BookReaderPage';
import { CollectionDetailPage } from './pages/CollectionDetailPage';
import { FilmPage } from './pages/FilmPage';
import { HomePage } from './pages/HomePage';
import { MusikPage } from './pages/MusikPage';
import { ProfilePage } from './pages/ProfilePage';
import { SastraPage } from './pages/SastraPage';

function AppRouter() {
  const [locationUrl, setLocationUrl] = useState(
    () => window.location.pathname + window.location.search
  );

  useEffect(() => {
    const onPopState = () => {
      setLocationUrl(window.location.pathname + window.location.search);
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  const navigate = useCallback((target: string) => {
    window.history.pushState({}, '', target);
    setLocationUrl(target);
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, []);

  const parsed = new URL(locationUrl, window.location.origin);
  const pathname = parsed.pathname;
  const searchParams = parsed.searchParams;

  const isReaderRoute = pathname.startsWith('/baca/');
  const isAdminDashboardRoute = pathname === '/admin';

  let pageContent = <HomePage onNavigate={navigate} />;

  if (pathname === '/sastra') {
    pageContent = (
      <SastraPage
        initialQuery={searchParams.get('q') || ''}
        initialTab={searchParams.get('tab') || 'all'}
        onNavigate={navigate}
      />
    );
  } else if (pathname === '/film') {
    pageContent = <FilmPage onNavigate={navigate} />;
  } else if (pathname === '/musik') {
    pageContent = <MusikPage onNavigate={navigate} />;
  } else if (pathname === '/about') {
    pageContent = <AboutPage onNavigate={navigate} />;
  } else if (pathname === '/masuk') {
    pageContent = <AuthPage mode="login" onNavigate={navigate} />;
  } else if (pathname === '/daftar') {
    pageContent = <AuthPage mode="register" onNavigate={navigate} />;
  } else if (pathname === '/admin/login') {
    pageContent = <AuthPage mode="admin" onNavigate={navigate} />;
  } else if (pathname === '/profil') {
    pageContent = <ProfilePage onNavigate={navigate} />;
  } else if (pathname === '/admin') {
    pageContent = <AdminDashboardPage onNavigate={navigate} />;
  } else if (pathname.startsWith('/koleksi/')) {
    const id = Number(pathname.replace('/koleksi/', ''));
    pageContent = <CollectionDetailPage collectionId={id} onNavigate={navigate} />;
  } else if (pathname.startsWith('/baca/')) {
    const id = Number(pathname.replace('/baca/', ''));
    const ch = searchParams.get('chapter');
    const pg = searchParams.get('page');
    pageContent = (
      <BookReaderPage
        collectionId={id}
        initialChapter={ch !== null ? Number(ch) : undefined}
        initialPage={pg !== null ? Number(pg) : undefined}
        onNavigate={navigate}
      />
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#FAF9F3] text-[#222B24]">
      {!isReaderRoute && !isAdminDashboardRoute && (
        <Navbar currentPath={pathname} onNavigate={navigate} />
      )}
      <div className="flex-1">{pageContent}</div>
      {!isReaderRoute && !isAdminDashboardRoute && <Footer onNavigate={navigate} />}
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <SiteProvider>
        <AppRouter />
      </SiteProvider>
    </AuthProvider>
  );
}
