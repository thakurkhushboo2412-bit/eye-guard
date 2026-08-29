import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { storage } from '@/src/utils/storage';
import { Keys, Lang, LANGUAGES, translate } from '@/src/i18n/translations';

const STORAGE_KEY = 'eyeguard.lang';

type I18nCtx = {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: Keys) => string;
  ready: boolean;
};

const Ctx = createContext<I18nCtx | null>(null);

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>('en');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    (async () => {
      const saved = await storage.getItem<string>(STORAGE_KEY, 'en');
      const valid = LANGUAGES.some((l) => l.code === saved);
      setLangState((valid ? saved : 'en') as Lang);
      setReady(true);
    })();
  }, []);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    storage.setItem(STORAGE_KEY, l).catch(() => {});
  }, []);

  const t = useCallback((key: Keys) => translate(lang, key), [lang]);

  const value = useMemo(() => ({ lang, setLang, t, ready }), [lang, setLang, t, ready]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useI18n() {
  const c = useContext(Ctx);
  if (!c) throw new Error('I18nProvider missing');
  return c;
}
