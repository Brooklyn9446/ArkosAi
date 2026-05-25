import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_GEMINI_API_KEY! });

export type GeneratedFix = {
  diff: string;
  explanation: string;
  confidence: 'high' | 'medium' | 'low';
  warnings: string[];
};

export async function runFixAgent(
  finding: {
    title: string;
    description: string;
    severity: string;
    category: string;
    file_path: string | null;
    line_number: number | null;
    code_snippet: string | null;
    fix_suggestion: string;
  },
  fileContent: string
): Promise<GeneratedFix> {

  const prompt = `
You are a security engineer generating a precise code fix for a confirmed
security vulnerability. Your output must be valid JSON and nothing else —
no markdown fences, no preamble, no explanation outside the JSON.

Vulnerability details:
Title: ${finding.title}
Severity: ${finding.severity}
Category: ${finding.category}
File: ${finding.file_path ?? 'unknown'}
Line: ${finding.line_number ?? 'unknown'}
Vulnerable code: ${finding.code_snippet ?? 'not available'}
Description: ${finding.description}
Suggested fix direction: ${finding.fix_suggestion}

Full file content for context:
${fileContent.slice(0, 8000)}

Generate a fix and return ONLY this JSON structure:
{
  "diff": "a unified diff patch showing the exact lines to change. Use standard unified diff format with --- and +++ headers and @@ line numbers",
  "explanation": "2-3 sentences explaining what the fix does and why it is secure. Written for a developer, not a security expert.",
  "confidence": "high | medium | low — high means the fix is straightforward and safe to apply directly, medium means it needs review, low means the context is ambiguous",
  "warnings": ["array of strings — any caveats the developer should know before applying, empty array if none"]
}
  `;

  const response = await ai.models.generateContent({
    model: 'gemini-2.0-flash',
    contents: prompt,
  });

  const rawText = response.text ?? '{}';
  const cleaned = rawText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

  try {
    return JSON.parse(cleaned) as GeneratedFix;
  } catch {
    return {
      diff: '',
      explanation: 'Fix generation failed. Please review the finding manually.',
      confidence: 'low',
      warnings: ['Automatic fix generation encountered an error.'],
    };
  }
}
