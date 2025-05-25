// src/infrastructure/services/template.service.ts
import * as Handlebars from 'handlebars';
import * as fs from 'fs';
import * as path from 'path';
import { setupLogger } from '../utils/logger';
import { config } from '../database/config/env';
import { InfrastructureError } from '../../shared/errors/infrastructure.error';

/**
 * Servicio para el renderizado de plantillas de email usando Handlebars
 */
export class TemplateService {
  private static instance: TemplateService;
  private readonly logger;
  private readonly templatesPath: string;
  private readonly layoutsPath: string;
  private readonly partialsPath: string;
  private compiledTemplates: Map<string, HandlebarsTemplateDelegate> = new Map();
  private compiledLayouts: Map<string, HandlebarsTemplateDelegate> = new Map();

  private constructor() {
    this.logger = setupLogger({
      ...config.logging,
      dir: `${config.logging.dir}/services`,
    });

    // Definir rutas de plantillas
    this.templatesPath = path.join(process.cwd(), 'src', 'interfaces', 'email', 'templates');
    this.layoutsPath = path.join(process.cwd(), 'src', 'interfaces', 'email', 'layouts');
    this.partialsPath = path.join(process.cwd(), 'src', 'interfaces', 'email', 'partials');

    this.initializeHandlebars();
    this.logger.info('TemplateService initialized');
  }

  public static getInstance(): TemplateService {
    if (!TemplateService.instance) {
      TemplateService.instance = new TemplateService();
    }
    return TemplateService.instance;
  }

  /**
   * Inicializa Handlebars con helpers y partials
   */
  private initializeHandlebars(): void {
    try {
      // Registrar helpers personalizados
      this.registerHelpers();

      // Registrar partials
      this.registerPartials();

      this.logger.info('Handlebars initialized with helpers and partials');
    } catch (error) {
      this.logger.error('Error initializing Handlebars:', error);
      throw new InfrastructureError(`Failed to initialize template engine: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Registra helpers personalizados de Handlebars
   */
  private registerHelpers(): void {
    // Helper para comparación
    Handlebars.registerHelper('eq', function(a, b) {
      return a === b;
    });
    
    // Helper para mostrar el tipo de email con icono
    Handlebars.registerHelper('emailTypeDisplay', function(emailType: string) {
      if (!emailType) return '';
      
      const types: Record<string, string> = {
        'verification': '📧 VERIFICACIÓN DE CUENTA',
        'welcome': '🎉 BIENVENIDA',
        'password-reset': '🔑 RECUPERACIÓN DE CONTRASEÑA',
        'notification': '🔔 NOTIFICACIÓN',
        'admin': '⚙️ ADMINISTRACIÓN'
      };
      
      return types[emailType as string] || `📩 ${emailType.toUpperCase()}`;
    });
    
    // Helper para substring
    Handlebars.registerHelper('substring', (str: string, start: number, end?: number) => {
      if (typeof str !== 'string') return '';
      if (end !== undefined) {
        return str.substring(start, end);
      } else {
        return str.substring(start);
      }
    });

    // Helper adicional para obtener iniciales
    Handlebars.registerHelper('getInitials', (name: string) => {
      if (typeof name !== 'string') return '';
      return name
        .split(' ')
        .map(word => word.charAt(0))
        .join('')
        .substring(0, 2)
        .toUpperCase();
    });

    // Helper para OR lógico
    Handlebars.registerHelper('or', (a, b) => a || b);

    // Helper para formatear fechas
    Handlebars.registerHelper('formatDate', (date: Date | string, format: string = 'es-ES') => {
      if (!date) return '';
      const dateObj = typeof date === 'string' ? new Date(date) : date;
      return dateObj.toLocaleDateString(format, {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    });

    // Helper para formatear fecha y hora
    Handlebars.registerHelper('formatDateTime', (date: Date | string, format: string = 'es-ES') => {
      if (!date) return '';
      const dateObj = typeof date === 'string' ? new Date(date) : date;
      return dateObj.toLocaleDateString(format, {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    });

    // Helper para formatear fecha y hora en formato 12 horas
    Handlebars.registerHelper('formatDateTime12', (date: Date | string, format: string = 'es-ES') => {
      if (!date) return '';
      const dateObj = typeof date === 'string' ? new Date(date) : date;
      return dateObj.toLocaleDateString(format, {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
    });

    // Helper para capitalizar texto
    Handlebars.registerHelper('capitalize', (str: string) => {
      if (typeof str !== 'string') return '';
      return str.charAt(0).toUpperCase() + str.slice(1);
    });

    this.logger.debug('Handlebars helpers registered');
  }

  /**
   * Registra partials de Handlebars
   */
  private registerPartials(): void {
    try {
      if (!fs.existsSync(this.partialsPath)) {
        this.logger.warn(`Partials directory not found: ${this.partialsPath}`);
        return;
      }

      const partialFiles = fs.readdirSync(this.partialsPath)
        .filter(file => file.endsWith('.hbs'));

      partialFiles.forEach(file => {
        const partialName = path.basename(file, '.hbs');
        const partialPath = path.join(this.partialsPath, file);
        const partialContent = fs.readFileSync(partialPath, 'utf8');
        
        Handlebars.registerPartial(partialName, partialContent);
        this.logger.debug(`Registered partial: ${partialName}`);
      });

      this.logger.info(`Registered ${partialFiles.length} partials`);
    } catch (error) {
      this.logger.error('Error registering partials:', error);
      throw error;
    }
  }

  /**
   * Compila y cachea una plantilla
   */
  private compileTemplate(templateName: string): HandlebarsTemplateDelegate {
    // Verificar si ya está en caché
    if (this.compiledTemplates.has(templateName)) {
      return this.compiledTemplates.get(templateName)!;
    }

    try {
      const templatePath = path.join(this.templatesPath, `${templateName}.hbs`);
      
      this.logger.debug(`Looking for template at: ${templatePath}`);
      this.logger.debug(`Templates directory exists: ${fs.existsSync(this.templatesPath)}`);
      this.logger.debug(`Template file exists: ${fs.existsSync(templatePath)}`);
      
      if (!fs.existsSync(templatePath)) {
        // Listar archivos disponibles para debug
        if (fs.existsSync(this.templatesPath)) {
          const availableFiles = fs.readdirSync(this.templatesPath);
          this.logger.debug(`Available template files:`, availableFiles);
        }
        throw new InfrastructureError(`Template not found: ${templateName}.hbs at ${templatePath}`);
      }

      const templateContent = fs.readFileSync(templatePath, 'utf8');
      const compiledTemplate = Handlebars.compile(templateContent);
      
      // Guardar en caché
      this.compiledTemplates.set(templateName, compiledTemplate);
      
      this.logger.debug(`Template compiled and cached: ${templateName}`);
      return compiledTemplate;
    } catch (error) {
      this.logger.error(`Error compiling template ${templateName}:`, error);
      throw new InfrastructureError(`Failed to compile template ${templateName}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Compila y cachea un layout
   */
  private compileLayout(layoutName: string = 'main'): HandlebarsTemplateDelegate {
    // Verificar si ya está en caché
    if (this.compiledLayouts.has(layoutName)) {
      return this.compiledLayouts.get(layoutName)!;
    }

    try {
      const layoutPath = path.join(this.layoutsPath, `${layoutName}.hbs`);
      
      if (!fs.existsSync(layoutPath)) {
        throw new InfrastructureError(`Layout not found: ${layoutName}.hbs`);
      }

      const layoutContent = fs.readFileSync(layoutPath, 'utf8');
      const compiledLayout = Handlebars.compile(layoutContent);
      
      // Guardar en caché
      this.compiledLayouts.set(layoutName, compiledLayout);
      
      this.logger.debug(`Layout compiled and cached: ${layoutName}`);
      return compiledLayout;
    } catch (error) {
      this.logger.error(`Error compiling layout ${layoutName}:`, error);
      throw new InfrastructureError(`Failed to compile layout ${layoutName}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Renderiza una plantilla con variables
   */
  public renderTemplate(templateName: string, variables: Record<string, any>, layoutName: string = 'main'): {
    html: string;
    text: string;
  } {
    try {
      this.logger.debug(`Rendering template: ${templateName} with layout: ${layoutName}`);

      // Compilar plantilla y layout
      const template = this.compileTemplate(templateName);
      const layout = this.compileLayout(layoutName);

      // Preparar variables comunes
      const templateVariables = {
        ...variables,
        currentYear: new Date().getFullYear(),
        timestamp: new Date().toLocaleDateString('es-ES', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        }),
        // Variables por defecto para header y footer
        appName: variables.appName || config.app.name,
        appVersion: variables.appVersion || config.app.version,
        appDescription: variables.appDescription || config.app.description,
        supportEmail: variables.supportEmail || config.email.from,
      };

      // Renderizar la plantilla (contenido del body)
      const bodyContent = template(templateVariables);

      // Renderizar header y footer por separado
      const headerContent = this.renderPartial('header', templateVariables);
      const footerContent = this.renderPartial('footer', templateVariables);

      // Combinar todo en el layout
      const finalVariables = {
        ...templateVariables,
        body: bodyContent,
        header: headerContent,
        footer: footerContent,
        subject: variables.subject || `Notification from ${templateVariables.appName}`
      };

      const htmlContent = layout(finalVariables);

      // Generar versión de texto plano (simplificada)
      const textContent = this.htmlToText(bodyContent, templateVariables);

      this.logger.info(`Template ${templateName} rendered successfully`);

      return {
        html: htmlContent,
        text: textContent
      };
    } catch (error) {
      this.logger.error(`Error rendering template ${templateName}:`, error);
      throw new InfrastructureError(`Failed to render template ${templateName}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Renderiza un partial específico
   */
  private renderPartial(partialName: string, variables: Record<string, any>): string {
    try {
      const partial = Handlebars.partials[partialName];
      if (!partial) {
        this.logger.warn(`Partial not found: ${partialName}`);
        return '';
      }

      // Si el partial es una string, compilarlo
      const compiledPartial = typeof partial === 'string' 
        ? Handlebars.compile(partial) 
        : partial;

      return compiledPartial(variables);
    } catch (error) {
      this.logger.error(`Error rendering partial ${partialName}:`, error);
      return '';
    }
  }

  /**
   * Convierte HTML básico a texto plano
   */
  private htmlToText(html: string, variables: Record<string, any>): string {
    // Crear una versión texto simple basada en las variables
    const lines = [];
    
    lines.push(`${variables.appName || 'Notification'}`);
    lines.push('='.repeat(40));
    
    if (variables.firstName) {
      lines.push(`Hello ${variables.firstName},`);
      lines.push('');
    }
    
    // Remover tags HTML básicos y crear texto legible
    let text = html
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    
    lines.push(text);
    lines.push('');
    lines.push(`Best regards,`);
    lines.push(`The ${variables.appName || 'Our'} Team`);
    
    if (variables.supportEmail) {
      lines.push('');
      lines.push(`Support: ${variables.supportEmail}`);
    }

    return lines.join('\n');
  }

  /**
   * Limpia el caché de plantillas (útil en desarrollo)
   */
  public clearCache(): void {
    this.compiledTemplates.clear();
    this.compiledLayouts.clear();
    this.logger.info('Template cache cleared');
  }

  /**
   * Verifica si una plantilla existe
   */
  public templateExists(templateName: string): boolean {
    const templatePath = path.join(this.templatesPath, `${templateName}.hbs`);
    return fs.existsSync(templatePath);
  }

  /**
   * Lista todas las plantillas disponibles
   */
  public getAvailableTemplates(): string[] {
    try {
      if (!fs.existsSync(this.templatesPath)) {
        return [];
      }

      return fs.readdirSync(this.templatesPath)
        .filter(file => file.endsWith('.hbs'))
        .map(file => path.basename(file, '.hbs'));
    } catch (error) {
      this.logger.error('Error listing templates:', error);
      return [];
    }
  }
}