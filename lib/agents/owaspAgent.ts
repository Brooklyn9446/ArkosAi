import { GoogleGenAI } from '@google/genai';
import { Finding } from '../types/database';

export async function runOwaspAgent(
  files: { path: string; content: string }[]
): Promise<Finding[]> {
  const apiKey = process.env.GOOGLE_GEMINI_API_KEY;
  if (!apiKey) {
    console.error('[OWASP Agent] GOOGLE_GEMINI_API_KEY is not defined.');
    return [];
  }
  const ai = new GoogleGenAI({ apiKey });

  const codeContext = files
    .map(f => `=== FILE: ${f.path} ===\n${f.content}`)
    .join('\n\n');

  const prompt = `
You are a security expert specialising in OWASP Top 10 web application
vulnerabilities. Analyse the following source code files and identify
vulnerabilities in these categories:

A01 - Broken Access Control: missing authorization checks, insecure
direct object references, privilege escalation paths.
A02 - Cryptographic Failures: weak encryption algorithms (MD5, SHA1
for passwords), unencrypted sensitive data, weak random number generation.
A03 - Injection: SQL injection, NoSQL injection, command injection,
LDAP injection — anywhere user input reaches a dangerous sink without
sanitization.
A04 - Insecure Design: missing rate limiting on sensitive endpoints,
lack of input validation patterns, insecure direct object references.
A05 - Security Misconfiguration: debug mode enabled, verbose error
messages exposing stack traces, default credentials, unnecessary
features enabled, missing security headers.
A07 - Identification and Authentication Failures: weak password
policies, missing account lockout, insecure password reset flows.
A09 - Security Logging and Monitoring Failures: sensitive operations
not logged, passwords or tokens being logged accidentally.

Return ONLY a valid JSON array of findings with zero additional text.
If you find no issues return an empty array: []

Each finding must use this exact schema:
{
"id": "owasp-001",
"title": "short descriptive title",
"description": "plain English explanation of the risk and potential impact",
"severity": "critical" | "high" | "medium" | "low" | "info",
"category": "owasp",
"file_path": "exact file path from context",
"line_number": approximate line number or null,
"code_snippet": "the vulnerable line or block of code",
"fix_suggestion": "concrete actionable fix instruction"
}

Here are the files to analyse:
${codeContext}
`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string', description: 'Unique ID for the finding (e.g. owasp-001)' },
              title: { type: 'string', description: 'Short descriptive title' },
              description: { type: 'string', description: 'Plain English explanation of the risk and potential impact' },
              severity: { type: 'string', enum: ['critical', 'high', 'medium', 'low', 'info'] },
              category: { type: 'string', enum: ['owasp'] },
              file_path: { type: 'string', description: 'Exact file path from context' },
              line_number: { type: 'integer', description: 'Approximate line number' },
              code_snippet: { type: 'string', description: 'The vulnerable line or block of code' },
              fix_suggestion: { type: 'string', description: 'Concrete actionable fix instruction' }
            },
            required: ['id', 'title', 'description', 'severity', 'category', 'file_path', 'fix_suggestion']
          }
        }
      }
    });

    const rawText = response.text ?? '[]';
    // Fallback logic in case of raw block formatting issues
    let cleaned = rawText.trim();
    if (cleaned.startsWith('```')) {
      cleaned = cleaned.replace(/```json\n?/g, '').replace(/```/g, '').trim();
    }
    const findings = JSON.parse(cleaned) as Finding[];
    
    // Ensure all findings match our types and defaults
    return (Array.isArray(findings) ? findings : []).map(f => ({
      ...f,
      category: 'owasp',
      line_number: typeof f.line_number === 'number' ? f.line_number : null,
      code_snippet: typeof f.code_snippet === 'string' ? f.code_snippet : null
    }));
  } catch (error) {
    console.error('OWASP agent run failed:', error);
    return [];
  }
}
