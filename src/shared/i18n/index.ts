import en from './en/en.i18n';
import es from './es/es.i18n';
import { SupportedLanguage, I18nConfig, TranslationContext } from './types/i18n.types';

const LANG_MAP = {
  en,
  es
} as const;

const I18N_CONFIG: I18nConfig = {
  defaultLanguage: 'es',
  fallbackLanguage: 'en',
  supportedLanguages: ['en', 'es']
};

export class I18nService {
  private static instance: I18nService;
  private currentLanguage: SupportedLanguage;

  private constructor() {
    this.currentLanguage = I18N_CONFIG.defaultLanguage;
  }

  public static getInstance(): I18nService {
    if (!I18nService.instance) {
      I18nService.instance = new I18nService();
    }
    return I18nService.instance;
  }

  public setLanguage(lang: SupportedLanguage): void {
    if (I18N_CONFIG.supportedLanguages.includes(lang)) {
      this.currentLanguage = lang;
    }
  }

  public getLanguage(): SupportedLanguage {
    return this.currentLanguage;
  }

  public translate(key: string, context?: TranslationContext, lang?: SupportedLanguage): string {
    const targetLang = lang || this.currentLanguage;
    const translations = LANG_MAP[targetLang] || LANG_MAP[I18N_CONFIG.fallbackLanguage];
    
    const value = this.getNestedValue(translations, key);
    
    if (typeof value === 'string' && context) {
      return this.interpolate(value, context);
    }
    
    return value || key;
  }

  private getNestedValue(obj: any, path: string): string {
    return path.split('.').reduce((current, key) => {
      return current && current[key] !== undefined ? current[key] : null;
    }, obj);
  }

  private interpolate(template: string, context: TranslationContext): string {
    return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      return context[key]?.toString() || match;
    });
  }
}

// Helper functions para uso directo
export const getLang = (lang: SupportedLanguage = 'es') => LANG_MAP[lang];

export const t = (key: string, context?: TranslationContext, lang?: SupportedLanguage): string => {
  const service = I18nService.getInstance();
  const targetLang = lang || service.getLanguage();
  
  // Log para debugging
  //console.log(`[i18n] Translating key "${key}" for language "${targetLang}"`);
  
  const result = service.translate(key, context, targetLang);
  
  // Log del resultado
  //console.log(`[i18n] Translation result: "${result}"`);
  
  return result;
};

export const setLanguage = (lang: SupportedLanguage): void => {
  I18nService.getInstance().setLanguage(lang);
};

export type { SupportedLanguage, I18nConfig, TranslationContext };
export { I18N_CONFIG };