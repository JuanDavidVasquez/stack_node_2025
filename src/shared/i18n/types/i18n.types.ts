export type SupportedLanguage = 'en' | 'es';

export interface I18nConfig {
  defaultLanguage: SupportedLanguage;
  fallbackLanguage: SupportedLanguage;
  supportedLanguages: SupportedLanguage[];
}

export interface TranslationContext {
  [key: string]: string | number | boolean | TranslationContext;
}