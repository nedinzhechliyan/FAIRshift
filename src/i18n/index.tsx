import React, { createContext, useContext, useState, useEffect } from 'react';
import en from './en.json';
import hi from './hi.json';
import ta from './ta.json';

export type SupportedLanguage = 'en' | 'hi' | 'ta';

export interface LanguageOption {
  code: SupportedLanguage;
  label: string;
  nativeLabel: string;
}

export const SUPPORTED_LANGUAGES: LanguageOption[] = [
  { code: 'en', label: 'English', nativeLabel: 'English' },
  { code: 'hi', label: 'Hindi', nativeLabel: 'हिन्दी' },
  { code: 'ta', label: 'Tamil', nativeLabel: 'தமிழ்' },
];

const translations: Record<SupportedLanguage, Record<string, unknown>> = {
  en,
  hi,
  ta,
};

interface I18nContextType {
  language: SupportedLanguage;
  setLanguage: (lang: SupportedLanguage) => void;
  t: (keyPath: string, vars?: Record<string, string | number>) => string;
  speak: (text: string) => void;
  isSpeaking: boolean;
  stopSpeaking: () => void;
}

const I18nContext = createContext<I18nContextType | null>(null);

export const I18nProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<SupportedLanguage>(() => {
    try {
      const saved = localStorage.getItem('fairshift_lang') as SupportedLanguage;
      if (saved && ['en', 'hi', 'ta'].includes(saved)) return saved;
    } catch {}
    return 'en';
  });

  const [isSpeaking, setIsSpeaking] = useState(false);

  const setLanguage = (lang: SupportedLanguage) => {
    setLanguageState(lang);
    try {
      localStorage.setItem('fairshift_lang', lang);
    } catch {}
  };

  const t = (keyPath: string, vars?: Record<string, string | number>): string => {
    const parts = keyPath.split('.');
    let cur: unknown = (translations as Record<string, unknown>)[language] || translations.en;
    for (const part of parts) {
      if (cur && typeof cur === 'object' && part in (cur as Record<string, unknown>)) {
        cur = (cur as Record<string, unknown>)[part];
      } else {
        // Fallback to English
        let fallbackCur: unknown = translations.en;
        for (const fbPart of parts) {
          if (fallbackCur && typeof fallbackCur === 'object' && fbPart in (fallbackCur as Record<string, unknown>)) {
            fallbackCur = (fallbackCur as Record<string, unknown>)[fbPart];
          } else {
            return keyPath;
          }
        }
        cur = fallbackCur;
        break;
      }
    }

    if (typeof cur !== 'string') return keyPath;

    let res = cur;
    if (vars) {
      for (const [k, v] of Object.entries(vars)) {
        res = res.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v));
      }
    }
    return res;
  };

  const stopSpeaking = () => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
  };

  const speak = (text: string) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      console.warn('Speech synthesis is not supported on this device/browser');
      return;
    }

    stopSpeaking();
    const utterance = new SpeechSynthesisUtterance(text);
    
    // Choose voice code based on language
    if (language === 'hi') {
      utterance.lang = 'hi-IN';
    } else if (language === 'ta') {
      utterance.lang = 'ta-IN';
    } else {
      utterance.lang = 'en-IN';
    }
    
    utterance.rate = 0.95; // Slightly slower for low-literacy clarity
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    window.speechSynthesis.speak(utterance);
  };

  useEffect(() => {
    return () => {
      stopSpeaking();
    };
  }, []);

  return (
    <I18nContext.Provider value={{ language, setLanguage, t, speak, isSpeaking, stopSpeaking }}>
      {children}
    </I18nContext.Provider>
  );
};

export const useI18n = () => {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    throw new Error('useI18n must be used within an I18nProvider');
  }
  return ctx;
};
