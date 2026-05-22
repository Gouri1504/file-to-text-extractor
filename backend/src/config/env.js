// config/env.js
// Loads .env and validates every required variable up front using Zod.
// We fail fast at boot rather than crash later with cryptic "undefined" errors
// inside JWT signing or Mongo connection. This is the single source of truth
// for env access in the backend - no other file should read process.env directly.

import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const schema = z.object({
  PORT: z.coerce.number().default(5000),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),

  MONGO_URI: z.string().min(1, 'MONGO_URI is required'),

  JWT_SECRET: z.string().min(16, 'JWT_SECRET must be at least 16 chars'),
  JWT_EXPIRES_IN: z.string().default('7d'),

  // String "true"/"false" because env vars are always strings.
  COOKIE_SECURE: z
    .string()
    .default('false')
    .transform((v) => v === 'true'),

  CLIENT_URL: z.string().url(),

  GEMINI_API_KEY: z.string().min(1, 'GEMINI_API_KEY is required'),

  // Optional Groq fallback. When set, AI calls that fail on Gemini are
  // retried against Groq's Llama 4 Scout model (multimodal: text + image).
  // Note: Groq has no PDF support, so the fallback only kicks in for image
  // uploads and text-only comparisons.
  GROQ_API_KEY: z.string().optional(),
  GROQ_MODEL: z.string().default('meta-llama/llama-4-scout-17b-16e-instruct'),

  // Google OAuth is optional at boot (email/password still works without it),
  // but if any one is set, all three must be set together.
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  GOOGLE_CALLBACK_URL: z.string().url().optional(),
});

const parsed = schema.safeParse(process.env);

if (!parsed.success) {
  console.error('Invalid environment configuration:');
  console.error(parsed.error.flatten().fieldErrors);
  process.exit(1);
}

const env = parsed.data;

// Cross-field rule: Google OAuth credentials must be all-or-nothing.
const googleVars = [env.GOOGLE_CLIENT_ID, env.GOOGLE_CLIENT_SECRET, env.GOOGLE_CALLBACK_URL];
const someGoogle = googleVars.some(Boolean);
const allGoogle = googleVars.every(Boolean);
if (someGoogle && !allGoogle) {
  console.error('Google OAuth: set ALL of GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_CALLBACK_URL or none.');
  process.exit(1);
}

env.GOOGLE_OAUTH_ENABLED = allGoogle;
env.GROQ_FALLBACK_ENABLED = Boolean(env.GROQ_API_KEY);

export default env;
