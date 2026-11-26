import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { api } from '../lib/api';
import type { SiteSettings } from '../types';

const DEFAULT_SETTINGS: SiteSettings = {
  libraryName: 'Perpustakaan Rona Rasa',
  tagline: 'Dari Kata, Menuju Rasa.',
  heroTitle: 'Ruang Baca Digital untuk Sastra dan Budaya Indonesia',
  heroDescription:
    'Perpustakaan digital independen yang merawat, mengarsipkan, dan membuka akses baca langsung terhadap karya sastra, puisi, film puitis, dan rekaman musik Indonesia.',
  welcomeText:
    'Selamat datang di Perpustakaan Rona Rasa. Duduklah sejenak, pilih buku atau puisi yang ingin Anda simak, dan nikmati pengalaman membaca yang tenang langsung di ruang digital ini.',
  heroBannerUrl: '/src/assets/images/hero_library_matcha_1795678106423.jpg',
  featuredCollectionIds: [],
  aboutHistory: '',
  aboutVision: '',
  aboutMission: '',
  aboutGoals: '',
  aboutCollectionFocus: '',
  aboutContribution: '',
  aboutImageUrl: '/src/assets/images/about_reading_room_1795678110667.jpg',
  updatedAt: '',
};

interface SiteContextValue {
  settings: SiteSettings;
  refreshSettings: () => Promise<void>;
  loading: boolean;
}

const SiteContext = createContext<SiteContextValue>({
  settings: DEFAULT_SETTINGS,
  refreshSettings: async () => {},
  loading: true,
});

export function SiteProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<SiteSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);

  const refreshSettings = useCallback(async () => {
    try {
      const data = await api.getSiteSettings();
      setSettings(data);
    } catch {
      // keep defaults if unavailable
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshSettings();
  }, [refreshSettings]);

  return (
    <SiteContext.Provider value={{ settings, refreshSettings, loading }}>
      {children}
    </SiteContext.Provider>
  );
}

export function useSite() {
  return useContext(SiteContext);
}
