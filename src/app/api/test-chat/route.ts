import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { z } from "zod";
import OpenAI from "openai";
import fetch from "node-fetch";
import { ChatCompletionMessageParam } from "openai/resources/chat/completions";

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || "",
});

// Define models to use with fallback options
const AI_MODELS = {
  OPENAI: {
    PRIMARY: "gpt-3.5-turbo",
    FALLBACK: "gpt-3.5-turbo-0125", // An older model that might have different quota limits
  },
  OLLAMA: {
    URL: process.env.OLLAMA_API_URL || "http://host.docker.internal:11434",
    MODEL: process.env.OLLAMA_MODEL || "llama3",
  },
  // Default model provider to use (can be 'OPENAI' or 'OLLAMA')
  DEFAULT_PROVIDER: process.env.DEFAULT_AI_PROVIDER || "OLLAMA",
};

// Schema for chat message validation
const chatMessageSchema = z.object({
  message: z.string().min(1, "Message is required"),
  modelProvider: z.enum(["OPENAI", "OLLAMA"]).optional(),
});

// Function to call Ollama API
async function callOllamaAPI(messages: any[], model: string) {
  try {
    console.log(`Calling Ollama API at ${AI_MODELS.OLLAMA.URL}/api/chat with model ${model}`);
    console.log(`Request body: ${JSON.stringify({
      model: model,
      messages: messages,
      stream: false,
    }, null, 2)}`);
    
    const response = await fetch(`${AI_MODELS.OLLAMA.URL}/api/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: model,
        messages: messages,
        stream: false,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Ollama API error (${response.status}): ${errorText}`);
      let errorData;
      try {
        errorData = JSON.parse(errorText);
      } catch (e) {
        errorData = { error: errorText };
      }
      throw new Error(errorData.error || `Failed to call Ollama API: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    console.log(`Ollama API response: ${JSON.stringify(data, null, 2)}`);
    return data;
  } catch (error) {
    console.error("Error calling Ollama API:", error);
    throw error;
  }
}

export async function POST(req: Request) {
  try {
    // Use a mock user ID for testing
    const userId = "test-user-123";

    // Validate request body
    const body = await req.json();
    const validationResult = chatMessageSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { message: "Invalid request data", errors: validationResult.error.flatten() },
        { status: 400 }
      );
    }

    const { message, modelProvider = AI_MODELS.DEFAULT_PROVIDER } = validationResult.data;

    // Create mock tasks and notes for testing
    const tasks = [
      {
        id: "task-1",
        userId,
        text: "Finish project proposal",
        priority: "HIGH",
        project: "Marketing Campaign",
        dueDate: new Date("2023-12-15"),
        completed: false,
        createdAt: new Date("2023-12-01")
      },
      {
        id: "task-2",
        userId,
        text: "Review quarterly reports",
        priority: "MEDIUM",
        project: "Finance",
        dueDate: new Date("2023-12-20"),
        completed: false,
        createdAt: new Date("2023-12-02")
      },
      {
        id: "task-3",
        userId,
        text: "Schedule team meeting",
        priority: "LOW",
        project: "Team Management",
        dueDate: new Date("2023-12-10"),
        completed: true,
        createdAt: new Date("2023-12-03")
      }
    ];

    const notes = [
      {
        id: "note-1",
        userId,
        title: "Project Ideas",
        text: "Ideas for the upcoming marketing campaign: social media push, influencer partnerships, content marketing.",
        createdAt: new Date("2023-12-01")
      },
      {
        id: "note-2",
        userId,
        title: "Meeting Notes",
        text: "Discussed quarterly goals and team performance. Action items: follow up with sales team, prepare presentation for board.",
        createdAt: new Date("2023-12-02")
      }
    ];

    // Create a more explicit system message with context about the user's data
    const systemMessage = `
      You are an AI assistant for the Momentum app, a task and notes manager for executives.
      
      The user has ${tasks.length} tasks and ${notes.length} notes.
      
      Tasks: ${JSON.stringify(tasks)}
      Notes: ${JSON.stringify(notes)}
      
      IMPORTANT: You have access to the user's tasks and notes. DO NOT say you don't have access to this information.
      NEVER say you're a large language model that doesn't have the ability to keep track of tasks.
      NEVER say you don't retain context from previous conversations.
      ALWAYS respond as if you have full access to the user's tasks and notes data provided above.
      
      You can help the user with:
      1. Creating, updating, or deleting tasks and notes
      2. Searching for information within their data
      3. Answering questions about their tasks and notes
      4. Providing recommendations or insights based on their data
      
      When the user asks you to perform an action like creating a task or note, you MUST respond with a JSON object in the following format:
      
      For creating a task:
      {
        "action": "CREATE_TASK",
        "text": "Task description",
        "priority": "HIGH" | "MEDIUM" | "LOW",
        "project": "Project name (optional)",
        "dueDate": "YYYY-MM-DD (optional)"
      }
      
      For updating a task:
      {
        "action": "UPDATE_TASK",
        "id": "task-id",
        "text": "Updated task description (optional)",
        "priority": "Updated priority (optional)",
        "project": "Updated project name (optional)",
        "dueDate": "Updated due date (optional)",
        "completed": true | false (optional)
      }
      
      For deleting a task:
      {
        "action": "DELETE_TASK",
        "id": "task-id"
      }
      
      For creating a note:
      {
        "action": "CREATE_NOTE",
        "title": "Note title",
        "text": "Note content"
      }
      
      For updating a note:
      {
        "action": "UPDATE_NOTE",
        "id": "note-id",
        "title": "Updated note title (optional)",
        "text": "Updated note content (optional)"
      }
      
      For deleting a note:
      {
        "action": "DELETE_NOTE",
        "id": "note-id"
      }
      
      If the user's request doesn't require an action, respond with a normal message.
      Be concise, helpful, and professional in your responses.
      
      REMEMBER: You MUST format your response as a valid JSON object when the user asks you to perform an action.
      The JSON object should be the ENTIRE response, not embedded in text.
    `;

    try {
      // Prepare messages array for both OpenAI and Ollama
      const ollamaMessages = [
        { role: "system", content: systemMessage },
        { role: "user", content: message },
      ];
      
      // Prepare properly typed messages for OpenAI
      const openaiMessages: ChatCompletionMessageParam[] = [
        { role: "system", content: systemMessage },
        { role: "user", content: message },
      ];
      
      let assistantMessage;
      let completion;
      
      // Choose between OpenAI and Ollama based on modelProvider
      console.log(`Using model provider: ${modelProvider}`);
      
      if (modelProvider === "OLLAMA") {
        try {
          console.log(`Calling Ollama with model: ${AI_MODELS.OLLAMA.MODEL}`);
          // Call Ollama API
          const ollamaResponse = await callOllamaAPI(
            ollamaMessages,
            AI_MODELS.OLLAMA.MODEL
          );
          
          console.log(`Ollama response received: ${JSON.stringify(ollamaResponse)}`);
          
          // Handle different response formats from Ollama
          if (ollamaResponse.message && ollamaResponse.message.content) {
            assistantMessage = ollamaResponse.message.content;
          } else if (ollamaResponse.response) {
            // Some Ollama versions might return response directly
            assistantMessage = ollamaResponse.response;
          } else {
            console.error("Unexpected Ollama response format:", ollamaResponse);
            assistantMessage = "I'm sorry, I couldn't process your request at this time.";
          }
        } catch (ollamaError) {
          console.error("Error with Ollama model:", ollamaError);
          throw new Error("Failed to process request with open source model. Please try again or switch to OpenAI.");
        }
      } else {
        // Use OpenAI with fallback
        try {
          completion = await openai.chat.completions.create({
            model: AI_MODELS.OPENAI.PRIMARY,
            messages: openaiMessages,
            temperature: 0.7,
            max_tokens: 500,
          });
          
          assistantMessage = completion.choices[0]?.message?.content || 
            "I'm sorry, I couldn't process your request at this time.";
        } catch (primaryModelError: any) {
          // If primary model fails with quota error, try fallback model
          if (primaryModelError.status === 429) {
            console.log("Primary model quota exceeded, trying fallback model...");
            try {
              completion = await openai.chat.completions.create({
                model: AI_MODELS.OPENAI.FALLBACK,
                messages: openaiMessages,
                temperature: 0.7,
                max_tokens: 500,
              });
              
              assistantMessage = completion.choices[0]?.message?.content || 
                "I'm sorry, I couldn't process your request at this time.";
            } catch (fallbackError) {
              console.error("Both OpenAI models failed, trying Ollama as last resort");
              // Try Ollama as a last resort
              try {
                const ollamaResponse = await callOllamaAPI(
                  ollamaMessages,
                  AI_MODELS.OLLAMA.MODEL
                );
                
                assistantMessage = ollamaResponse.message?.content || 
                  "I'm sorry, I couldn't process your request at this time.";
              } catch (ollamaError) {
                // If all models fail, throw an error
                throw new Error("All AI models failed. Please try again later.");
              }
            }
          } else {
            // Re-throw if it's not a quota error
            throw primaryModelError;
          }
        }
      }

      // Check if the response contains a JSON action
      let parsedAction = null;
      let finalResponse = assistantMessage;

      try {
        // Try to extract JSON from the response
        const jsonMatch = assistantMessage.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const jsonString = jsonMatch[0];
          const actionData = JSON.parse(jsonString);
          
          if (actionData.action) {
            parsedAction = actionData;
            
            // Create a more user-friendly response
            switch (actionData.action) {
              case "CREATE_TASK":
                finalResponse = `I'll create a task: "${actionData.text}"${
                  actionData.priority ? ` with ${actionData.priority} priority` : ""
                }${actionData.project ? ` in project "${actionData.project}"` : ""}${
                  actionData.dueDate ? ` due on ${actionData.dueDate}` : ""
                }.`;
                
                // Mock task creation for testing
                const newTaskId = `test-task-${Date.now()}`;
                parsedAction.id = newTaskId;
                break;
                
              case "UPDATE_TASK":
                finalResponse = `I'll update the task with ID ${actionData.id}.`;
                break;
                
              case "DELETE_TASK":
                finalResponse = `I'll delete the task with ID ${actionData.id}.`;
                break;
                
              case "CREATE_NOTE":
                finalResponse = `I'll create a note titled "${actionData.title}".`;
                
                // Mock note creation for testing
                const newNoteId = `test-note-${Date.now()}`;
                parsedAction.id = newNoteId;
                break;
                
              case "UPDATE_NOTE":
                finalResponse = `I'll update the note with ID ${actionData.id}.`;
                break;
                
              case "DELETE_NOTE":
                finalResponse = `I'll delete the note with ID ${actionData.id}.`;
                break;
                
              default:
                finalResponse = "I'll perform the requested action.";
            }
          }
        }
      } catch (error) {
        console.error("Error parsing action from response:", error);
        // If there's an error parsing the action, just use the original response
      }

      return NextResponse.json({
        message: finalResponse,
        action: parsedAction,
        modelProvider: modelProvider,
      });
    } catch (error: any) {
      console.error("Error processing chat request:", error);
      
      // Handle OpenAI API errors
      if (error.status === 429) {
        return NextResponse.json(
          { 
            message: "OpenAI API quota exceeded. Please try using the open source model option.",
            code: "insufficient_quota",
            suggestOllama: true
          },
          { status: 429 }
        );
      }
      
      return NextResponse.json(
        { 
          message: error.message || "Failed to process your request",
          code: error.code || "unknown_error"
        },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error("Error in test chat API:", error);
    return NextResponse.json(
      { message: error.message || "Internal server error" },
      { status: 500 }
    );
  }
} 