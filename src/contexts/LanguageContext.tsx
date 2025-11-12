import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import i18n from '@/i18n';

type Language = 'en' | 'hi' | 'te' | 'ta' | 'ml' | 'kn' | 'mr' | 'bn' | 'gu' | 'pa';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string, options?: Record<string, string>) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};

interface LanguageProviderProps {
  children: ReactNode;
}

export const LanguageProvider: React.FC<LanguageProviderProps> = ({ children }) => {
  const getStoredLanguage = (): Language => {
    const stored = localStorage.getItem('lang') || localStorage.getItem('preferred-language');
    const supportedLangs: Language[] = ['en', 'hi', 'te', 'ta', 'ml', 'kn', 'mr', 'bn', 'gu', 'pa'];
    if (stored && supportedLangs.includes(stored as Language)) {
      return stored as Language;
    }
    return 'en';
  };

  const [language, setLanguageState] = useState<Language>(getStoredLanguage());

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('lang', lang);
    localStorage.setItem('preferred-language', lang);
    // Update document attributes for RTL support if needed
    const isRTL = ['ur'].includes(lang);
    document.documentElement.lang = lang;
    document.documentElement.dir = isRTL ? 'rtl' : 'ltr';
    i18n.changeLanguage(lang);
  };

  useEffect(() => {
    i18n.changeLanguage(language);
  }, []);

  const t = (key: string, options?: Record<string, any>): string => {
    // Keys are already in the format 'common.xxx' or 'navigation.xxx', etc.
    // i18next will handle the namespace automatically
    return i18n.t(key, { ns: 'common', ...(options || {}) }) || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};
