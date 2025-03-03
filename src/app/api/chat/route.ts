import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
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
  DEFAULT_PROVIDER: process.env.DEFAULT_AI_PROVIDER || "OPENAI",
};

// Schema for chat message validation
const chatMessageSchema = z.object({
  message: z.string().min(1, "Message is required"),
  modelProvider: z.enum(["OPENAI", "OLLAMA"]).optional(),
});

// Function to call Ollama API
async function callOllamaAPI(messages: any[], model: string) {
  try {
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
      const errorData = await response.json();
      throw new Error(errorData.error || "Failed to call Ollama API");
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error calling Ollama API:", error);
    throw error;
  }
}

export async function POST(req: Request) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json(
        { message: "Authentication required" },
        { status: 401 }
      );
    }

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

    // Get user's tasks and notes for context
    const [tasks, notes] = await Promise.all([
      db.task.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        take: 10,
      }),
      db.note.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        take: 5,
      }),
    ]);

    // Create system message with context about the user's data
    const systemMessage = `
      You are an AI assistant for the Momentum app, a task and notes manager for executives.
      
      The user has ${tasks.length} tasks and ${notes.length} notes.
      
      Tasks: ${JSON.stringify(tasks)}
      Notes: ${JSON.stringify(notes)}
      
      You can help the user with:
      1. Creating, updating, or deleting tasks and notes
      2. Searching for information within their data
      3. Answering questions about their tasks and notes
      4. Providing recommendations or insights based on their data
      
      When the user asks you to perform an action like creating a task or note, respond with a JSON object in the following format:
      
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
      if (modelProvider === "OLLAMA") {
        try {
          // Call Ollama API
          const ollamaResponse = await callOllamaAPI(
            ollamaMessages,
            AI_MODELS.OLLAMA.MODEL
          );
          
          assistantMessage = ollamaResponse.message?.content || 
            "I'm sorry, I couldn't process your request at this time.";
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
                
                // Actually create the task
                const newTask = await db.task.create({
                  data: {
                    userId,
                    text: actionData.text,
                    priority: actionData.priority || "MEDIUM",
                    project: actionData.project || null,
                    dueDate: actionData.dueDate ? new Date(actionData.dueDate) : null,
                    completed: false,
                  },
                });
                
                // Add the task ID to the action for the frontend
                parsedAction.id = newTask.id;
                break;
                
              case "UPDATE_TASK":
                finalResponse = `I'll update the task with ID ${actionData.id}.`;
                
                // Actually update the task
                await db.task.update({
                  where: { id: actionData.id },
                  data: {
                    text: actionData.text,
                    priority: actionData.priority,
                    project: actionData.project,
                    dueDate: actionData.dueDate ? new Date(actionData.dueDate) : undefined,
                    completed: actionData.completed,
                  },
                });
                break;
                
              case "DELETE_TASK":
                finalResponse = `I'll delete the task with ID ${actionData.id}.`;
                
                // Actually delete the task
                await db.task.delete({
                  where: { id: actionData.id },
                });
                break;
                
              case "CREATE_NOTE":
                finalResponse = `I'll create a note titled "${actionData.title}".`;
                
                // Actually create the note
                await db.note.create({
                  data: {
                    userId,
                    title: actionData.title,
                    text: actionData.text,
                  },
                });
                break;
                
              case "UPDATE_NOTE":
                finalResponse = `I'll update the note with ID ${actionData.id}.`;
                
                // Actually update the note
                await db.note.update({
                  where: { id: actionData.id },
                  data: {
                    title: actionData.title,
                    text: actionData.text,
                  },
                });
                break;
                
              case "DELETE_NOTE":
                finalResponse = `I'll delete the note with ID ${actionData.id}.`;
                
                // Actually delete the note
                await db.note.delete({
                  where: { id: actionData.id },
                });
                break;
                
              default:
                finalResponse = assistantMessage;
            }
          }
        }
      } catch (error) {
        console.error("Error parsing action:", error);
        // If there's an error parsing the action, just use the original message
        finalResponse = assistantMessage;
      }

      // Log the chat in the database
      await db.chatLog.create({
        data: {
          userId,
          query: message,
          response: finalResponse,
          modelProvider: modelProvider,
        },
      });

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
    console.error("Error in chat API:", error);
    return NextResponse.json(
      { message: error.message || "Internal server error" },
      { status: 500 }
    );
  }
} 