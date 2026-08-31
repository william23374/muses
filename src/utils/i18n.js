import { createI18n } from 'vue-i18n';
import en from '../language/en.json';
import ja from '../language/ja.json';
import ko from '../language/ko.json';
import ru from '../language/ru.json';
import zh_CN from '../language/zh-CN.json';
import zh_TW from '../language/zh-TW.json';

const messages = {
  en,
  ja,
  ko,
  ru,
  'zh-CN': zh_CN,
  'zh-TW': zh_TW,
};

const LOCALE_EN_MIGRATION_KEY = 'muses:locale-en-v1';

try {
  if (!localStorage.getItem(LOCALE_EN_MIGRATION_KEY)) {
    const settings = JSON.parse(localStorage.getItem('settings') || '{}');
    settings.language = 'en';
    localStorage.setItem('settings', JSON.stringify(settings));
    localStorage.setItem(LOCALE_EN_MIGRATION_KEY, '1');
  }
} catch {
  // ignore storage errors
}

const savedLanguage = (() => {
  try {
    return JSON.parse(localStorage.getItem('settings') || '{}')?.language;
  } catch {
    return null;
  }
})();

const defaultLocale = savedLanguage || 'en';

const i18n = createI18n({
  locale: defaultLocale,
  fallbackLocale: 'en',
  messages,
});

export default i18n;
