import { BadRequestException } from '@nestjs/common';

export interface PIIMatch {
  type: 'CPF' | 'EMAIL' | 'PHONE';
  value: string;
  context: string;
}

/** Regex patterns for PII detection */
const CPF_RE = /\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b/g;
const EMAIL_RE = /\b[\w.+-]+@[\w-]+\.[\w.-]+\b/g;
const PHONE_RE = /\(\d{2}\)\s?9?\d{4}-?\d{4}/g;

/** Placeholders to exclude from PII detection */
const PLACEHOLDER_RE = /\{\{[^}]+\}\}/g;

/**
 * Detects PII (CPF, email, phone) in email content.
 * EXCEPTION: matches inside {{placeholder}} are IGNORED.
 *
 * @throws BadRequestException with clear message listing matches
 */
export function detectPII(
  html: string,
  subject: string,
  text: string,
): PIIMatch[] {
  // Combine content for scanning, but track context
  const combined = `${subject}\n${html}\n${text}`;

  // First, remove all placeholders to avoid false positives
  const placeholderMasked = combined.replace(PLACEHOLDER_RE, '[]');

  const matches: PIIMatch[] = [];

  // CPF detection
  let cpfMatch;
  while ((cpfMatch = CPF_RE.exec(placeholderMasked)) !== null) {
    matches.push({
      type: 'CPF',
      value: cpfMatch[0],
      context: extractContext(placeholderMasked, cpfMatch.index),
    });
  }

  // Email detection
  let emailMatch;
  while ((emailMatch = EMAIL_RE.exec(placeholderMasked)) !== null) {
    matches.push({
      type: 'EMAIL',
      value: emailMatch[0],
      context: extractContext(placeholderMasked, emailMatch.index),
    });
  }

  // Phone detection
  let phoneMatch;
  while ((phoneMatch = PHONE_RE.exec(placeholderMasked)) !== null) {
    matches.push({
      type: 'PHONE',
      value: phoneMatch[0],
      context: extractContext(placeholderMasked, phoneMatch.index),
    });
  }

  return matches;
}

/**
 * Validates email content for PII.
 * Throws BadRequestException if any PII is found.
 */
export function validateNoPII(
  html: string,
  subject: string,
  text: string,
): void {
  const matches = detectPII(html, subject, text);
  if (matches.length === 0) return;

  const lines = matches.map(
    (m) => `  - [${m.type}] "${m.value}" — contexto: "...${m.context}..."`,
  );
  const message = `PII detectado no template:\n${lines.join('\n')}\n\nCPF/email/telefone hardcoded não são permitidos. Use variáveis {{nomeDaVariavel}} no lugar.`;
  throw new BadRequestException(message);
}

function extractContext(text: string, index: number, radius = 40): string {
  const start = Math.max(0, index - radius);
  const end = Math.min(text.length, index + radius);
  return text.slice(start, end).replace(/\n/g, ' ').trim();
}
