/**
 * FailureLoop Security & Sanitization Module
 * Enforces credential blocking and prompt injection defense.
 */

// Patterns that identify credentials, tokens, OTPs, API keys, passwords
const CREDENTIAL_PATTERNS = [
  /(?:password|passwd|pwd)\s*(?:is|=|:)\s*[^\s]+/i,
  /sk-(?:test|live|proj|ant)-[a-zA-Z0-9_\-]{16,}/i,
  /ghp_[a-zA-Z0-9]{36}/i,
  /bearer\s+[a-zA-Z0-9_\-\.]{20,}/i,
  /\bOTP\s*(?:is|=|:)?\s*\d{4,8}\b/i,
  /api[_-]?key\s*(?:is|=|:)\s*[^\s]+/i,
  /secret[_-]?key\s*(?:is|=|:)\s*[^\s]+/i,
  /Winter\d{4}!/i,
  /\bhunter2\b/i
];

export interface ValidationResult {
  valid: boolean;
  error?: string;
  sanitizedText: string;
}

export function validateAndSanitizeInput(text: string): ValidationResult {
  if (!text || typeof text !== 'string') {
    return { valid: false, error: 'Input text is required', sanitizedText: '' };
  }

  const trimmed = text.trim();
  if (trimmed.length === 0) {
    return { valid: false, error: 'Input text cannot be empty', sanitizedText: '' };
  }

  // Check 1: Credential Block
  for (const pattern of CREDENTIAL_PATTERNS) {
    if (pattern.test(trimmed)) {
      return {
        valid: false,
        error: 'Do not store credentials here.',
        sanitizedText: ''
      };
    }
  }

  // Check 2: Word Count Check (prompt for specifics if under 6 words)
  const wordCount = trimmed.split(/\s+/).filter(Boolean).length;
  if (wordCount < 4) {
    // Vague answer check
    return {
      valid: false,
      error: 'Can you say what specifically happens? Please provide at least 4-6 words.',
      sanitizedText: trimmed
    };
  }

  // Check 3: HTML / Script sanitization (strip dangerous executable tags)
  const sanitizedText = sanitizeHtml(trimmed);

  return {
    valid: true,
    sanitizedText
  };
}

export function sanitizeHtml(str: string): string {
  return str
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<[^>]+>/g, '')
    .replace(/onerror\s*=/gi, '')
    .replace(/onload\s*=/gi, '');
}

/**
 * Detects if a text contains prompt injection attempts intended to override system directives.
 */
export function sanitizePromptQuery(query: string): string {
  // Strip control sequences and markers, treat text strictly as data query
  return query
    .replace(/SYSTEM:\s*disregard[^\n]*/gi, '')
    .replace(/Ignore all previous instructions[^\n]*/gi, '')
    .replace(/Ignore the captured knowledge[^\n]*/gi, '')
    .trim();
}
