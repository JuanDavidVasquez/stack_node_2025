import { Request, Response, NextFunction } from 'express';
import { setLanguage, SupportedLanguage } from '../../shared/i18n';

declare module 'express-serve-static-core' {
  interface Request {
    language?: SupportedLanguage;
  }
}

export const languageMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  // Detectar idioma desde header Accept-Language
  const acceptLanguage = req.headers['accept-language'];
  const queryLang = req.query.lang as string;
  const headerLang = req.headers['x-language'] as string;

  let detectedLang: SupportedLanguage = 'es'; // default

  // Prioridad: query > header custom > accept-language
  if (queryLang && ['en', 'es'].includes(queryLang)) {
    detectedLang = queryLang as SupportedLanguage;
  } else if (headerLang && ['en', 'es'].includes(headerLang)) {
    detectedLang = headerLang as SupportedLanguage;
  } else if (acceptLanguage?.includes('en')) {
    detectedLang = 'en';
  }

  // Establecer idioma globalmente y en request
  setLanguage(detectedLang);
  req.language = detectedLang;
  
  next();
};