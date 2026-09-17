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

  // SameSite for the auth cookie. 'lax' is right when the SPA and API share
  // a site (local dev, or a same-site proxy). A cross-site deploy (e.g.
  // Vercel frontend + Render API) needs 'none', which browsers only accept
  // together with COOKIE_SECURE=true.
  COOKIE_SAMESITE: z.enum(['lax', 'strict', 'none']).default('lax'),

  CLIENT_URL: z.string().url(),

  GEMINI_API_KEY: z.string().min(1, 'GEMINI_API_KEY is required'),

  // Optional Groq fallback. When set, AI calls that fail on Gemini are
  // retried against Groq's Llama 4 Scout model (multimodal: text + image).
  // Note: Groq has no PDF support, so the fallback only kicks in for image
  // uploads and text-only comparisons.
  GROQ_API_KEY: z.string().optional(),
  GROQ_MODEL: z.string().default('meta-llama/llama-4-scout-17b-16e-instruct'),

  // Optional RAG ("ask your documents"). Pinecone stores the vectors; the
  // embedding model runs locally via @huggingface/transformers, so no key
  // is needed for it. Without PINECONE_API_KEY the chat feature is disabled.
  PINECONE_API_KEY: z.string().optional(),
  PINECONE_INDEX: z.string().default('claim-extractor'),
  // Where the index is auto-created if missing. aws/us-east-1 is the
  // region available on Pinecone's free Starter plan.
  PINECONE_CLOUD: z.enum(['aws', 'gcp', 'azure']).default('aws'),
  PINECONE_REGION: z.string().default('us-east-1'),
  EMBEDDING_MODEL: z.string().default('Xenova/all-MiniLM-L6-v2'),

  // Firebase Authentication (Google sign-in) is optional - email/password
  // works without it. Verifying Firebase ID tokens only needs the project
  // id, not a service-account key.
  FIREBASE_PROJECT_ID: z.string().optional(),
});

const parsed = schema.safeParse(process.env);

if (!parsed.success) {
  console.error('Invalid environment configuration:');
  console.error(parsed.error.flatten().fieldErrors);
  process.exit(1);
}

const env = parsed.data;

if (env.COOKIE_SAMESITE === 'none' && !env.COOKIE_SECURE) {
  console.error('COOKIE_SAMESITE=none requires COOKIE_SECURE=true (browsers reject it otherwise).');
  process.exit(1);
}

env.FIREBASE_AUTH_ENABLED = Boolean(env.FIREBASE_PROJECT_ID);
env.GROQ_FALLBACK_ENABLED = Boolean(env.GROQ_API_KEY);
env.RAG_ENABLED = Boolean(env.PINECONE_API_KEY);

export default env;
