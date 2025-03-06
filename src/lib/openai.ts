import OpenAI from "openai";

const apiKey = process.env.OPENAI_API_KEY;

// Create the OpenAI client without throwing an error at import time
export const openai = new OpenAI({
  apiKey: apiKey || "dummy-key-for-build-time",
});

// Add a function to check if the API key is available
export function validateApiKey() {
  if (!apiKey) {
    throw new Error("Missing OpenAI API key");
  }
} 