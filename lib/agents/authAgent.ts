import { GoogleGenAI } from '@google/genai';
import { Finding } from '../types/database';

export async function runAuthAgent(
  files: { path: string; content: string }[]
): Promise<Finding[]> {
  const apiKey = process.env.GOOGLE_GEMINI_API_KEY;
  if (!apiKey) {
    console.error('[Auth Agent] GOOGLE_GEMINI_API_KEY is not defined.');
    return [];
  }
  const ai = new GoogleGenAI({ apiKey });

  // Filter to only auth-related files for this agent.
  // Sending all files wastes context window on irrelevant code.
  const authKeywords = [
    'auth', 'login', 'logout', 'session', 'token', 'jwt',
    'password', 'credential', 'cookie', 'oauth', 'middleware'
  ];

  const authFiles = files.filter(f =>
    authKeywords.some(k => f.path.toLowerCase().includes(k))
  );

  // If no auth-related files found, fall back to first 20 files
  const filesToAnalyse = authFiles.length > 0 ? authFiles : files.slice(0, 20);

  const codeContext = filesToAnalyse
    .map(f => `=== FILE: ${f.path} ===\n${f.content}`)
    .join('\n\n');

  const prompt = `
You are a security expert specialising in authentication and session
management vulnerabilities. Analyse the following code and identify:

JWT Issues: weak or missing secret validation, algorithm confusion attacks
(accepting "alg: none"), missing expiry (exp claim), tokens stored in
localStorage instead of httpOnly cookies.

Session Management: missing httpOnly and Secure flags on session cookies,
missing SameSite cookie attribute, session fixation vulnerabilities,
sessions not invalidated on logout.

Password Security: passwords hashed with MD5 or SHA1 instead of bcrypt
or argon2, bcrypt work factor below 10, plaintext password storage,
passwords being logged.

OAuth/SSO: missing state parameter validation (CSRF in OAuth), open
redirect vulnerabilities in callback URLs, token leakage in URL parameters.

Access Control: missing authentication middleware on sensitive routes,
JWT not verified before trusting claims, role checks missing or bypassable.

Return ONLY a valid JSON array with zero additional text.
If you find no issues return: []

Each finding must follow this exact schema:
{
"id": "auth-001",
"title": "short descriptive title",
"description": "plain English explanation of the vulnerability and attack scenario",
"severity": "critical" | "high" | "medium" | "low" | "info",
"category": "auth",
"file_path": "exact file path",
"line_number": line number or null,
"code_snippet": "the vulnerable code",
"fix_suggestion": "concrete fix instruction"
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
              id: { type: 'string', description: 'Unique ID for the finding (e.g. auth-001)' },
              title: { type: 'string', description: 'Short descriptive title' },
              description: { type: 'string', description: 'Plain English explanation of the vulnerability and attack scenario' },
              severity: { type: 'string', enum: ['critical', 'high', 'medium', 'low', 'info'] },
              category: { type: 'string', enum: ['auth'] },
              file_path: { type: 'string', description: 'Exact file path from context' },
              line_number: { type: 'integer', description: 'Approximate line number' },
              code_snippet: { type: 'string', description: 'The vulnerable line or block of code' },
              fix_suggestion: { type: 'string', description: 'Concrete actionable fix instruction' }
            }, //enum is used to restrict the values of a field  to specific values 
            required: ['id', 'title', 'description', 'severity', 'category', 'file_path', 'fix_suggestion']
          }
        }
      }
    });

    const rawText = response.text ?? '[]';
    let cleaned = rawText.trim();
    if (cleaned.startsWith('```')) {
      cleaned = cleaned.replace(/```json\n?/g, '').replace(/```/g, '').trim();
    }
    const findings = JSON.parse(cleaned) as Finding[];

    return (Array.isArray(findings) ? findings : []).map(f => ({
      ...f,
      category: 'auth',
      line_number: typeof f.line_number === 'number' ? f.line_number : null,
      code_snippet: typeof f.code_snippet === 'string' ? f.code_snippet : null
    }));
  } catch (error) {
    console.error('Auth agent run failed:', error);
    return [];
  }
}
