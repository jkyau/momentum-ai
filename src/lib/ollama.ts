// Ollama API client for text generation
const OLLAMA_API_URL = process.env.OLLAMA_API_URL || "http://host.docker.internal:11434";
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || "llama3";

// Function to validate Ollama API URL
export const validateOllamaUrl = async (): Promise<boolean> => {
  try {
    const response = await fetch(`${OLLAMA_API_URL}/api/version`);
    return response.ok;
  } catch (error) {
    console.error("Error validating Ollama URL:", error);
    return false;
  }
};

// Function to call Ollama API for chat completions
export const generateChatCompletion = async (
  messages: { role: string; content: string }[],
  model: string = OLLAMA_MODEL
): Promise<string> => {
  try {
    console.log(`Calling Ollama API at ${OLLAMA_API_URL}/api/chat with model ${model}`);
    
    const response = await fetch(`${OLLAMA_API_URL}/api/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages,
        stream: false,
      }),
    });

    if (!response.ok) {
      let errorText = await response.text();
      console.error(`Ollama API error (${response.status}): ${errorText}`);
      
      try {
        const errorData = JSON.parse(errorText);
        throw new Error(errorData.error || `Failed to call Ollama API: ${response.status} ${response.statusText}`);
      } catch (e) {
        throw new Error(`Failed to call Ollama API: ${response.status} ${response.statusText}`);
      }
    }

    const data = await response.json();
    console.log(`Ollama API response received`);
    
    // Handle different response formats from Ollama
    if (data.message && data.message.content) {
      return data.message.content;
    } else if (data.response) {
      // Some Ollama versions might return response directly
      return data.response;
    } else {
      console.error("Unexpected Ollama response format:", data);
      throw new Error("Unexpected response format from Ollama");
    }
  } catch (error) {
    console.error("Error calling Ollama API:", error);
    throw error;
  }
};

// Export the Ollama client
export const ollama = {
  chat: {
    completions: {
      create: async ({ messages, model = OLLAMA_MODEL }: { 
        messages: { role: string; content: string }[]; 
        model?: string;
      }) => {
        const content = await generateChatCompletion(messages, model);
        return {
          choices: [
            {
              message: {
                content,
              },
            },
          ],
        };
      },
    },
  },
}; 