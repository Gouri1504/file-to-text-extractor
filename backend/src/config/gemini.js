// config/gemini.js
// Single shared Gemini client. The model selection lives here so swapping
// models (flash vs pro vs newer) is a one-file change.

import { GoogleGenerativeAI } from '@google/generative-ai';
import env from './env.js';

const genAI = new GoogleGenerativeAI(env.GEMINI_API_KEY);

// "flash" variants are tuned for speed + cost over peak accuracy, which is
// the right trade-off for document extraction at interactive latencies.
export const MODEL_NAME = 'gemini-2.0-flash';

export const getModel = () => genAI.getGenerativeModel({ model: MODEL_NAME });

export default genAI;
