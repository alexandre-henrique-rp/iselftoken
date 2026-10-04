import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import {
  escapeHtml,
  validateSafeUrl,
} from '../../email/email-template-security';

export interface RenderedEmail {
  subject: string;
  html: string;
  text: string;
  usedVariables: string[];
}

const PLACEHOLDER_RE = /\{\{([^}]+)\}\}/g;
const URL_ATTRIBUTE_RE =
  /\b(?:href|src)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/gi;

/**
 * Interpolates {{variable}} placeholders in a string.
 * Unknown variables are kept as-is.
 *
 * HTML values are escaped; text and subject values are intentionally left
 * unescaped because they are not HTML contexts.
 */
function interpolate(
  template: string,
  data: Record<string, any>,
  escapeValues: boolean,
): string {
  return template.replace(PLACEHOLDER_RE, (match, key) => {
    const value = data[key.trim()];
    if (value === undefined || value === null) return match;
    const stringValue = String(value);
    return escapeValues ? escapeHtml(stringValue) : stringValue;
  });
}

/** Validates dynamic URLs before HTML escaping changes their representation. */
function validateDynamicUrls(
  htmlTemplate: string,
  data: Record<string, any>,
): void {
  let match: RegExpExecArray | null;
  while ((match = URL_ATTRIBUTE_RE.exec(htmlTemplate)) !== null) {
    const attributeValue = match[1] ?? match[2] ?? match[3] ?? '';
    const placeholders = [...attributeValue.matchAll(PLACEHOLDER_RE)];

    if (placeholders.length === 0) continue;

    const hasMissingValue = placeholders.some(([, key]) => {
      const value = data[key.trim()];
      return value === undefined || value === null;
    });
    if (hasMissingValue) continue;

    const resolvedValue = attributeValue.replace(
      PLACEHOLDER_RE,
      (placeholder, key) => {
        const value = data[key.trim()];
        return value === undefined || value === null
          ? placeholder
          : String(value);
      },
    );

    validateSafeUrl(
      resolvedValue,
      placeholders.map(([, key]) => key.trim()).join(', '),
    );
  }

  URL_ATTRIBUTE_RE.lastIndex = 0;
}

/**
 * Extracts all variable names from a template.
 */
function extractVariables(template: string): string[] {
  const vars: string[] = [];
  let match;
  while ((match = PLACEHOLDER_RE.exec(template)) !== null) {
    vars.push(match[1].trim());
  }
  return [...new Set(vars)];
}

/**
 * Validates required variables from a variablesSchema against provided data.
 * Throws BadRequestException if required variables are missing.
 * Schema format: { type: 'object', properties: {...}, required: [...] }
 */
function validateVariables(
  variablesSchema: Record<string, any>,
  data: Record<string, any>,
): void {
  if (!variablesSchema || typeof variablesSchema !== 'object') return;

  const required: string[] = Array.isArray(variablesSchema.required)
    ? variablesSchema.required
    : [];

  const missing = required.filter((field) => {
    const val = data[field];
    return val === undefined || val === null || val === '';
  });

  if (missing.length > 0) {
    throw new BadRequestException(
      `Variáveis obrigatórias ausentes: ${missing.join(', ')}`,
    );
  }
}

@Injectable()
export class EmailRenderService {
  private readonly logger = new Logger(EmailRenderService.name);

  /**
   * Renders a template with given data.
   * - Interpolates {{variable}} placeholders
   * - Validates against variablesSchema (if provided)
   * - Throws BadRequestException if required variables are missing
   */
  render(
    htmlTemplate: string,
    textTemplate: string,
    subject: string,
    variablesSchema: Record<string, any>,
    data: Record<string, any>,
  ): RenderedEmail {
    const usedVariables = extractVariables(
      htmlTemplate + textTemplate + subject,
    );

    // Validate required variables
    validateVariables(variablesSchema, data);

    // Validate dynamic href/src values before escaping HTML entities.
    validateDynamicUrls(htmlTemplate, data);

    const interpolatedHtml = interpolate(htmlTemplate, data, true);
    const interpolatedText = interpolate(textTemplate, data, false);
    const interpolatedSubject = interpolate(subject, data, false);

    return {
      subject: interpolatedSubject,
      html: interpolatedHtml,
      text: interpolatedText,
      usedVariables,
    };
  }
}
