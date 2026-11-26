import {
  GoogleGenAI,
  Type,
} from '@google/genai';
import type {
  FunctionDeclaration,
} from '@google/genai';

export interface AstraCoreToolCall {
  name: string;
  args: Record<string, unknown>;
}

export interface AstraCoreHistoryItem {
  role: 'user' | 'model' | 'agent' | 'system';
  content: string;
}

export interface AstraCoreAttachment {
  mimeType: string;
  dataBase64: string;
  filename?: string;
}

export interface AstraCoreInput {
  prompt: string;
  history?: AstraCoreHistoryItem[];
  image?: AstraCoreAttachment;
  attachments?: AstraCoreAttachment[];
  language?: 'bn' | 'en' | 'auto';
  senderContext?: string;
}

export interface AstraCoreResult {
  text: string;
  toolCalls: AstraCoreToolCall[];
  modelUsed: string;
}

export function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

export function getGeminiBetaClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  return new GoogleGenAI({
    apiKey,
    apiVersion: 'v1beta',
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

export const updateWorkspaceDeclaration: FunctionDeclaration = {
  name: 'update_workspace',
  description:
    'Creates or updates a document, code file, export invoice, deployment manifest, or formatted song lyrics inside the active project Autonomous Workspace.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      filename: {
        type: Type.STRING,
        description: 'File name with extension, e.g. invoice_draft.md or script.py',
      },
      language: {
        type: Type.STRING,
        description: 'Language format: markdown, typescript, python, json, yaml, or text',
      },
      content: {
        type: Type.STRING,
        description: 'Complete file content',
      },
    },
    required: ['filename', 'language', 'content'],
  },
};

export async function runAstraGravityCore(input: AstraCoreInput): Promise<AstraCoreResult> {
  const language = input.language || 'bn';
  const ai = getGeminiClient();

  if (!ai) {
    return {
      text:
        language === 'en'
          ? 'Command received. Configure GEMINI_API_KEY on the server to enable live Gemini responses.'
          : 'সুমন ভাই, কমান্ড গ্রহণ করা হয়েছে। সার্ভারের GEMINI_API_KEY সেট করলে লাইভ এআই ইঞ্জিন সম্পূর্ণ স্বয়ংক্রিয়ভাবে কাজ করবে।',
      toolCalls: [],
      modelUsed: 'unconfigured',
    };
  }

  const senderLine = input.senderContext
    ? `\nActive caller context: ${input.senderContext}.`
    : '';

  const systemInstruction = `You are ASTRA-GRAVITY, an autonomous executive AI assistant for Red Bird International & Sumon Hossain.
Respond concisely and clearly in ${language === 'en' ? 'English' : 'Bengali (with clear English technical terms where appropriate)'}.
If the user asks to create, draft, update, or modify any document, invoice, packing list, Python/TypeScript code, DevOps YAML, or song lyrics, ALWAYS invoke the update_workspace tool so it appears directly inside their Autonomous Workspace.${senderLine}`;

  const contents: Array<{ role: string; parts: Array<Record<string, unknown>> }> = [];

  if (Array.isArray(input.history)) {
    for (const h of input.history.slice(-8)) {
      if (!h.content) continue;
      contents.push({
        role: h.role === 'user' ? 'user' : 'model',
        parts: [{ text: String(h.content).slice(0, 4000) }],
      });
    }
  }

  const userParts: Array<Record<string, unknown>> = [];

  if (input.image?.dataBase64 && input.image?.mimeType) {
    userParts.push({
      inlineData: {
        mimeType: input.image.mimeType,
        data: input.image.dataBase64,
      },
    });
  }

  if (Array.isArray(input.attachments)) {
    for (const att of input.attachments) {
      if (att?.dataBase64 && att?.mimeType) {
        userParts.push({
          inlineData: {
            mimeType: att.mimeType,
            data: att.dataBase64,
          },
        });
      }
    }
  }

  userParts.push({ text: String(input.prompt || '') });
  contents.push({ role: 'user', parts: userParts });

  let response;
  let modelUsed = 'gemini-2.5-pro';
  try {
    response = await ai.models.generateContent({
      model: 'gemini-2.5-pro',
      contents,
      config: {
        systemInstruction,
        tools: [{ functionDeclarations: [updateWorkspaceDeclaration] }],
      },
    });
  } catch (primaryErr) {
    console.warn('Primary gemini-2.5-pro fallback to gemini-2.5-flash:', primaryErr);
    modelUsed = 'gemini-2.5-flash';
    response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents,
      config: {
        systemInstruction,
        tools: [{ functionDeclarations: [updateWorkspaceDeclaration] }],
      },
    });
  }

  const toolCalls: AstraCoreToolCall[] = (response.functionCalls || []).map((fc) => ({
    name: fc.name || 'update_workspace',
    args: (fc.args || {}) as Record<string, unknown>,
  }));

  let text = (response.text || '').trim();
  if (!text && toolCalls.length > 0) {
    const filename = String(toolCalls[0].args?.filename || 'workspace_document');
    text =
      language === 'en'
        ? `Done! I generated ${filename} via Astra-Gravity.`
        : `সুমন ভাই, আপনার নির্দেশ অনুযায়ী ${filename} ফাইলটি Astra-Gravity ওয়ার্কস্পেসে তৈরি করা হয়েছে।`;
  }

  return { text, toolCalls, modelUsed };
}
