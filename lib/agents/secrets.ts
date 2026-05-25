import { GoogleGenAI } from '@google/genai';
import { Finding } from '../types/database';
import { GitHubFile } from '../github';

function getAIClient(): GoogleGenAI {
  const apiKey = process.env.GOOGLE_GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GOOGLE_GEMINI_API_KEY is not defined in environment variables.');
  }
  return new GoogleGenAI({ apiKey });
}

export async function scanFilesForSecrets(files: GitHubFile[]): Promise<Finding[]> {
  if (files.length === 0) return [];

  // Initialize the Gemini client
  let ai: GoogleGenAI;
  try {
    ai = getAIClient();
  } catch (err) {
    console.error('[Secrets Agent] Failed to initialize GoogleGenAI client:', err);
    return [];
  }
  
  const batchSize = 10;
  const findings: Finding[] = [];

  for (let i = 0; i < files.length; i += batchSize) {
    const batch = files.slice(i, i + batchSize);
    
    let fileContentsPrompt = '';
    batch.forEach((file, index) => {
      fileContentsPrompt += `\n--- FILE ${index + 1}: ${file.path} ---\n${file.content}\n`;
    });

    const prompt = `You are a high-fidelity static analysis security agent. Your task is to scan the following files for hardcoded secrets, credentials, API keys, private keys, database passwords, OAuth tokens, and certificates.
    
Files to scan:
${fileContentsPrompt}

Instructions:
1. Carefully analyze each file for sensitive values that are hardcoded.
2. Do NOT report environment variable lookups (e.g. process.env.API_KEY or os.environ.get('KEY')), config placeholders (e.g. 'YOUR_API_KEY', 'placeholder', 'YOUR-KEY-HERE'), or development default template credentials (unless they pose actual security risks).
3. If you find a secret:
   - Determine its severity ('critical' for administrative/infrastructure access keys like AWS root keys, database administrator passwords; 'high' for standard API keys/service keys like Stripe, Twilio; 'medium' for development tokens or internal credentials; 'low' or 'info' for less critical items).
   - Obfuscate/mask the actual secret value in the code_snippet (e.g. replace 'abc123secret' with 'abc*********') to ensure the secret is not stored plaintext in the database.
   - Propose an actionable fix suggestion on how to move the secret to environment variables or key management services.
4. Output your response as a JSON array of findings. If no secrets are found, output an empty findings array.`;

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: 'object',
            properties: {
              findings: {
                type: 'array',
                description: 'List of security findings representing hardcoded secrets, credentials, passwords, tokens, etc.',
                items: {
                  type: 'object',
                  properties: {
                    title: { type: 'string', description: "Title of the finding, e.g. 'AWS Access Key ID Found'" },
                    description: { type: 'string', description: 'Detailed description of the secret type and its security implications.' },
                    severity: { 
                      type: 'string', 
                      enum: ['critical', 'high', 'medium', 'low', 'info'],
                      description: 'The severity of the secret leak.' 
                    },
                    file_path: { type: 'string', description: 'The relative file path where the secret was discovered.' },
                    line_number: { type: 'integer', description: 'The line number (1-indexed) where the secret was found. Return null if not identifiable.' },
                    code_snippet: { type: 'string', description: 'The exact line of code containing the secret, with the secret value masked using stars/asterisks (e.g. API_KEY = "******").' },
                    fix_suggestion: { type: 'string', description: 'Instructions on how to remove the secret and secure it using environment variables.' }
                  },
                  required: ['title', 'description', 'severity', 'file_path', 'line_number', 'code_snippet', 'fix_suggestion']
                }
              }
            },
            required: ['findings']
          }
        }
      });

      const responseText = response.text;
      if (!responseText) {
        console.warn(`[Secrets Agent] Empty response received for batch starting at index ${i}.`);
        continue;
      }

      const parsed = JSON.parse(responseText);
      if (parsed && Array.isArray(parsed.findings)) {
        const mappedFindings = parsed.findings.map((f: any, idx: number) => ({
          id: `fnd-${Date.now()}-${i}-${idx}-${Math.random().toString(36).substr(2, 4)}`,
          title: f.title,
          description: f.description,
          severity: f.severity,
          category: 'secret',
          file_path: f.file_path || '',
          line_number: typeof f.line_number === 'number' ? f.line_number : null,
          code_snippet: f.code_snippet || null,
          fix_suggestion: f.fix_suggestion || 'Use environment variables instead of hardcoded values.'
        }));
        findings.push(...mappedFindings);
      }
    } catch (err) {
      console.error(`[Secrets Agent] Error scanning batch starting at index ${i}:`, err);
    }
  }

  return findings;
}
