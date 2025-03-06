import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
// Remove mock auth import
// import { mockAuth } from "@/lib/mock-auth";
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
    
    // Add a final system message to reinforce JSON formatting
    if (messages.length >= 2 && 
        messages[0].role === 'system' && 
        /create.*task|add.*task|new.*task|create.*note|add.*note|new.*note|make.*note|set.*task|set.*priority|mark.*complete|mark.*done/i.test(messages[messages.length - 1].content) &&
        !/show|list|display|what|when|how many|find|search|get|tell me about|show me/i.test(messages[messages.length - 1].content)) {
      
      // Add a more explicit system message right before the user message
      messages.splice(1, 0, {
        role: "system",
        content: `CRITICAL INSTRUCTION: You MUST respond with ONLY a valid JSON object when the user asks to create a task or note.

DO NOT include any explanatory text, descriptions, or markdown formatting.
DO NOT use backticks or code blocks.
DO NOT describe what you're doing.

JUST RETURN THE RAW JSON OBJECT like this:
{"action": "CREATE_TASK", "text": "Task description", "priority": "HIGH"}

This is EXTREMELY important. The entire system depends on you returning ONLY a JSON object.

For example, if the user asks "Create a high priority task for tomorrow to prepare the quarterly report", your response should be EXACTLY:
{"action": "CREATE_TASK", "text": "Prepare quarterly report", "priority": "HIGH", "dueDate": "2023-XX-XX"}

However, if the user asks "Show me my completed tasks", you should NOT return a JSON object. Instead, respond with a normal message listing the completed tasks.`
      });
    }
    
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
        format: messages[messages.length - 1].content.match(/create.*task|add.*task|new.*task|create.*note|add.*note|new.*note|make.*note|set.*task|set.*priority|mark.*complete|mark.*done/i) ? "json" : undefined
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
    // Use real auth instead of mock auth
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

    // Add console logs to verify data
    console.log(`User ${userId} has ${tasks.length} tasks and ${notes.length} notes`);
    console.log("Tasks:", JSON.stringify(tasks, null, 2));
    console.log("Notes:", JSON.stringify(notes, null, 2));

    // Create system message with context about the user's data
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
      
      CRITICAL INSTRUCTION: When the user asks you to perform an action like creating a task or note, you MUST respond with ONLY a JSON object in the following format. DO NOT include any explanatory text, descriptions, or markdown formatting - ONLY return the raw JSON:
      
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
      The JSON object should be the ENTIRE response, not embedded in text or markdown.
      
      Examples:
      
      User: "Create a high priority task for tomorrow to prepare the quarterly report"
      Your response should be EXACTLY:
      {
        "action": "CREATE_TASK",
        "text": "Prepare quarterly report",
        "priority": "HIGH",
        "dueDate": "2023-XX-XX"
      }
      
      User: "Make a note about the marketing meeting"
      Your response should be EXACTLY:
      {
        "action": "CREATE_NOTE",
        "title": "Marketing Meeting",
        "text": "Notes from the marketing meeting discussion"
      }
      
      User: "Show me my completed tasks"
      Your response should be a normal message listing the completed tasks, not a JSON object.
      
      IMPORTANT: DO NOT INCLUDE ANY EXPLANATORY TEXT OR MARKDOWN FORMATTING IN YOUR RESPONSE WHEN CREATING TASKS OR NOTES.
      YOUR ENTIRE RESPONSE MUST BE A VALID JSON OBJECT WHEN THE USER ASKS FOR AN ACTION.
      DO NOT DESCRIBE WHAT YOU'RE DOING - JUST RETURN THE JSON.
      DO NOT USE BACKTICKS OR CODE BLOCKS - JUST RETURN THE RAW JSON OBJECT.
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
      
      // Special handling for common requests that don't need AI
      if (/^show\s+me\s+my\s+completed\s+tasks$/i.test(message.trim())) {
        console.log("Direct handling of 'show me my completed tasks' request");
        const completedTasks = tasks.filter((task: { completed: boolean }) => task.completed);
        if (completedTasks.length > 0) {
          assistantMessage = `Here are your completed tasks:\n\n${completedTasks.map((task: { text: string }) => `- ${task.text}`).join('\n')}`;
        } else {
          assistantMessage = "You don't have any completed tasks at the moment.";
        }
      } 
      // Direct handling for task creation
      else if (/create.*(?:high|medium|low).*priority.*task/i.test(message)) {
        console.log("Direct handling of task creation request");
        
        // Extract priority
        const priority = /high/i.test(message) ? "HIGH" : 
                        (/medium/i.test(message) ? "MEDIUM" : "LOW");
        
        // Extract task text
        let taskText = "New task";
        const taskMatch = message.match(/task(?:\s+for|\s+to)?\s+(.+?)(?:$|\.|\,)/i);
        if (taskMatch && taskMatch[1]) {
          taskText = taskMatch[1].trim();
        }
        
        // Extract due date
        let dueDate = null;
        if (/tomorrow/i.test(message)) {
          const tomorrow = new Date();
          tomorrow.setDate(tomorrow.getDate() + 1);
          dueDate = tomorrow.toISOString().split('T')[0]; // Format as YYYY-MM-DD
        } else if (/today/i.test(message)) {
          dueDate = new Date().toISOString().split('T')[0];
        } else if (/next week/i.test(message)) {
          const nextWeek = new Date();
          nextWeek.setDate(nextWeek.getDate() + 7);
          dueDate = nextWeek.toISOString().split('T')[0];
        }
        
        // Create the task directly
        const newTask = await db.task.create({
          data: {
            userId,
            text: taskText,
            priority: priority,
            dueDate: dueDate ? new Date(dueDate) : null,
            completed: false,
          },
        });
        
        assistantMessage = `I've created a ${priority.toLowerCase()} priority task: "${taskText}"${dueDate ? ` due on ${dueDate}` : ''}.`;
        
        // Create a synthetic action for the frontend
        let parsedAction = {
          action: "CREATE_TASK",
          id: newTask.id,
          text: taskText,
          priority: priority,
          dueDate: dueDate
        };
        
        // Log the chat and return the response immediately
        await db.chatLog.create({
          data: {
            userId,
            query: message,
            response: assistantMessage,
          },
        });
        
        return NextResponse.json({
          message: assistantMessage,
          action: parsedAction,
          modelProvider: modelProvider,
        });
      }
      // Direct handling for note creation
      else if (/create.*note|add.*note|make.*note/i.test(message)) {
        console.log("Direct handling of note creation request");
        
        // Extract note title and content
        let noteTitle = "New Note";
        let noteContent = message;
        
        // Try to extract a title
        const titleMatch = message.match(/note(?:\s+about|\s+on|\s+for|\s+titled|\s+called)?\s+["']?([^"']+?)["']?(?:$|\.|\,|\s+with|\s+containing)/i);
        if (titleMatch && titleMatch[1]) {
          noteTitle = titleMatch[1].trim();
        }
        
        // Create the note directly
        const newNote = await db.note.create({
          data: {
            userId,
            title: noteTitle,
            text: noteContent,
          },
        });
        
        assistantMessage = `I've created a new note titled "${noteTitle}".`;
        
        // Create a synthetic action for the frontend
        let parsedAction = {
          action: "CREATE_NOTE",
          id: newNote.id,
          title: noteTitle,
          text: noteContent
        };
        
        // Log the chat and return the response immediately
        await db.chatLog.create({
          data: {
            userId,
            query: message,
            response: assistantMessage,
          },
        });
        
        return NextResponse.json({
          message: assistantMessage,
          action: parsedAction,
          modelProvider: modelProvider,
        });
      }
      // Direct handling for note summary requests
      else if (/summarize.*notes|summary.*notes|summarize.*note|summary.*note/i.test(message)) {
        console.log("Direct handling of note summary request");
        
        let assistantMessage = "Here's a summary of your recent notes:\n\n";
        
        if (notes.length === 0) {
          assistantMessage = "You don't have any notes yet. Would you like me to help you create one?";
        } else {
          notes.forEach((note: { title: string; text: string }, index: number) => {
            assistantMessage += `${index + 1}. **${note.title}**\n`;
            assistantMessage += `   ${note.text.length > 100 ? note.text.substring(0, 100) + '...' : note.text}\n\n`;
          });
          
          assistantMessage += "Would you like me to help you create a new note or provide more details about any of these?";
        }
        
        // Log the chat and return the response immediately
        await db.chatLog.create({
          data: {
            userId,
            query: message,
            response: assistantMessage,
          },
        });
        
        return NextResponse.json({
          message: assistantMessage,
          modelProvider: modelProvider,
        });
      }
      // Direct handling for task summary requests
      else if (/summarize.*tasks|summary.*tasks|summarize.*task|summary.*task|show.*tasks|list.*tasks/i.test(message)) {
        console.log("Direct handling of task summary request");
        
        let assistantMessage = "Here's a summary of your recent tasks:\n\n";
        
        if (tasks.length === 0) {
          assistantMessage = "You don't have any tasks yet. Would you like me to help you create one?";
        } else {
          // Group tasks by completion status
          const completedTasks = tasks.filter((task: { completed: boolean }) => task.completed);
          const pendingTasks = tasks.filter((task: { completed: boolean }) => !task.completed);
          
          // Show pending tasks first
          assistantMessage += "**Pending Tasks:**\n";
          if (pendingTasks.length === 0) {
            assistantMessage += "No pending tasks. Great job!\n\n";
          } else {
            pendingTasks.forEach((task: { priority: string; text: string; dueDate: string | Date | null }, index: number) => {
              assistantMessage += `${index + 1}. [${task.priority}] ${task.text}${task.dueDate ? ` (Due: ${new Date(task.dueDate).toLocaleDateString()})` : ''}\n`;
            });
            assistantMessage += "\n";
          }
          
          // Then show completed tasks
          assistantMessage += "**Completed Tasks:**\n";
          if (completedTasks.length === 0) {
            assistantMessage += "No completed tasks yet.";
          } else {
            completedTasks.forEach((task: { text: string }, index: number) => {
              assistantMessage += `${index + 1}. ${task.text}\n`;
            });
          }
          
          assistantMessage += "Would you like me to help you create a new task or update any of these?";
        }
        
        // Log the chat and return the response immediately
        await db.chatLog.create({
          data: {
            userId,
            query: message,
            response: assistantMessage,
          },
        });
        
        return NextResponse.json({
          message: assistantMessage,
          modelProvider: modelProvider,
        });
      }
      else {
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
              assistantMessage = ollamaResponse.message.content.trim();
              
              // Check for empty or nearly empty responses
              if (assistantMessage === "{}" || assistantMessage === "" || assistantMessage.length < 5) {
                console.log("Received empty or nearly empty response from Ollama, generating fallback response");
                
                // Generate a fallback response based on the user's message
                if (/show.*completed.*tasks/i.test(message)) {
                  // Handle "show completed tasks" request
                  const completedTasks = tasks.filter((task: { completed: boolean }) => task.completed);
                  if (completedTasks.length > 0) {
                    assistantMessage = `Here are your completed tasks:\n\n${completedTasks.map((task: { text: string }) => `- ${task.text}`).join('\n')}`;
                  } else {
                    assistantMessage = "You don't have any completed tasks at the moment.";
                  }
                } else if (/show.*tasks/i.test(message)) {
                  // Handle "show tasks" request
                  const incompleteTasks = tasks.filter((task: { completed: boolean }) => !task.completed);
                  if (incompleteTasks.length > 0) {
                    assistantMessage = `Here are your current tasks:\n\n${incompleteTasks.map((task: { text: string; priority?: string; dueDate?: string | Date | null }) => `- ${task.text}${task.priority ? ` (${task.priority})` : ''}${task.dueDate ? ` due on ${new Date(task.dueDate).toLocaleDateString()}` : ''}`).join('\n')}`;
                  } else {
                    assistantMessage = "You don't have any active tasks at the moment.";
                  }
                } else {
                  assistantMessage = "I'm sorry, I encountered an error processing your request. Please try again with a more specific question.";
                }
              }
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
      }

      // Check if the response contains a JSON action
      let parsedAction = null;
      let finalResponse = assistantMessage;

      try {
        console.log("Raw AI response:", assistantMessage);
        console.log("Response type:", typeof assistantMessage);
        console.log("Response length:", assistantMessage?.length);
        
        // First, try to parse the entire response as JSON
        try {
          const actionData = JSON.parse(assistantMessage.trim());
          console.log("Parsed action data:", actionData);
          if (actionData && actionData.action) {
            console.log("Successfully parsed entire response as JSON action:", actionData);
            parsedAction = actionData;
          } else if (Object.keys(actionData).length === 0) {
            console.log("Received empty JSON object, checking user message for action intent");
            
            // Check if the user's message indicates an intent to create a task or note
            if (/create.*high.*priority.*task.*tomorrow/i.test(message)) {
              // Extract task details from the user's message
              const taskMatch = message.match(/create.*task.*for(.+?)(?:$|to)/i);
              let taskText = "New task";
              
              if (taskMatch && taskMatch[1]) {
                taskText = taskMatch[1].trim();
              }
              
              // Create a synthetic action for task creation
              const tomorrow = new Date();
              tomorrow.setDate(tomorrow.getDate() + 1);
              const dueDate = tomorrow.toISOString().split('T')[0]; // Format as YYYY-MM-DD
              
              parsedAction = {
                action: "CREATE_TASK",
                text: taskText,
                priority: "HIGH",
                dueDate: dueDate
              };
              console.log("Created synthetic task action from user message:", parsedAction);
            } else if (/create.*note|add.*note|make.*note/i.test(message)) {
              // Extract note details from the user's message
              const noteMatch = message.match(/note.*about(.+?)(?:$|\.)/i);
              let noteTitle = "New Note";
              let noteContent = "Note content";
              
              if (noteMatch && noteMatch[1]) {
                noteTitle = noteMatch[1].trim();
                noteContent = noteMatch[1].trim();
              }
              
              // Create a synthetic action for note creation
              parsedAction = {
                action: "CREATE_NOTE",
                title: noteTitle,
                text: noteContent
              };
              console.log("Created synthetic note action from user message:", parsedAction);
            }
          } else {
            console.log("Parsed JSON does not contain an action property:", actionData);
          }
        } catch (directParseError) {
          console.log("Response is not a direct JSON object, trying to extract JSON...");
          
          // If direct parsing fails, try to extract JSON from the response
          // First, try to find JSON with regex
          const jsonMatch = assistantMessage.match(/\{[\s\S]*?\}/g);
          if (jsonMatch && jsonMatch.length > 0) {
            // Try each potential JSON match
            for (const potentialJson of jsonMatch) {
              try {
                const actionData = JSON.parse(potentialJson);
                
                if (actionData.action) {
                  console.log("Successfully extracted JSON action from response:", actionData);
                  parsedAction = actionData;
                  break; // Found a valid action, stop looking
                }
              } catch (extractError) {
                console.error("Error parsing potential JSON:", extractError);
                // Continue to the next potential match
              }
            }
          }
          
          // If that fails, try to extract JSON from code blocks
          if (!parsedAction) {
            const codeBlockMatch = assistantMessage.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
            if (codeBlockMatch && codeBlockMatch[1]) {
              try {
                const actionData = JSON.parse(codeBlockMatch[1].trim());
                if (actionData.action) {
                  console.log("Successfully extracted JSON action from code block:", actionData);
                  parsedAction = actionData;
                }
              } catch (codeBlockError) {
                console.error("Error parsing JSON from code block:", codeBlockError);
              }
            }
          }
          
          // If we still don't have a valid action, try to extract structured data from the response
          if (!parsedAction) {
            console.log("No JSON object found in the response, trying to extract structured data");
            
            // Check for task creation patterns
            if (/create.*task|add.*task|new.*task/i.test(message) && 
                /high|medium|low/i.test(assistantMessage)) {
              
              // Extract task details
              const priority = /high/i.test(assistantMessage) ? "HIGH" : 
                              (/medium/i.test(assistantMessage) ? "MEDIUM" : "LOW");
              
              // Extract task text - look for the most likely task description
              let taskText = "";
              
              // Look for a task name or description
              const taskMatch = assistantMessage.match(/task:?\s*([^*\n]+)/i) || 
                               assistantMessage.match(/description:?\s*([^*\n]+)/i) ||
                               assistantMessage.match(/\*\*([^*]+)\*\*/);
              
              if (taskMatch && taskMatch[1]) {
                taskText = taskMatch[1].trim();
              } else {
                // Just use the first line that's not empty
                const lines = assistantMessage.split('\n').filter((line: string) => line.trim().length > 0);
                if (lines.length > 0) {
                  taskText = lines[0].replace(/^[^a-z0-9]+/i, '').trim();
                }
              }
              
              // Extract due date if present
              let dueDate = null;
              const tomorrowMatch = /tomorrow/i.test(message) || /tomorrow/i.test(assistantMessage);
              if (tomorrowMatch) {
                const tomorrow = new Date();
                tomorrow.setDate(tomorrow.getDate() + 1);
                dueDate = tomorrow.toISOString().split('T')[0]; // Format as YYYY-MM-DD
              }
              
              // Create a synthetic action
              if (taskText) {
                parsedAction = {
                  action: "CREATE_TASK",
                  text: taskText,
                  priority: priority,
                  dueDate: dueDate
                };
                console.log("Created synthetic task action:", parsedAction);
              }
            }
            
            // Similar pattern matching could be added for notes and other actions
            // Check for note creation patterns
            if (!parsedAction && (/create.*note|add.*note|new.*note|make.*note/i.test(message))) {
              console.log("Detected potential note creation request");
              
              // Extract note title and content
              let noteTitle = "";
              let noteContent = "";
              
              // Look for a note title
              const titleMatch = assistantMessage.match(/title:?\s*([^*\n]+)/i) || 
                               assistantMessage.match(/\*\*([^*]+)\*\*/);
              
              if (titleMatch && titleMatch[1]) {
                noteTitle = titleMatch[1].trim();
              } else {
                // Just use the first line that's not empty as the title
                const lines = assistantMessage.split('\n').filter((line: string) => line.trim().length > 0);
                if (lines.length > 0) {
                  noteTitle = lines[0].replace(/^[^a-z0-9]+/i, '').trim();
                }
              }
              
              // Look for note content
              const contentMatch = assistantMessage.match(/content:?\s*([^*\n]+)/i) || 
                                 assistantMessage.match(/text:?\s*([^*\n]+)/i);
              
              if (contentMatch && contentMatch[1]) {
                noteContent = contentMatch[1].trim();
              } else {
                // Use the rest of the message after the first line as content
                const lines = assistantMessage.split('\n').filter((line: string) => line.trim().length > 0);
                if (lines.length > 1) {
                  noteContent = lines.slice(1).join('\n');
                } else if (lines.length === 1) {
                  // If there's only one line, use it as both title and content
                  noteContent = lines[0];
                }
              }
              
              // Create a synthetic action
              if (noteTitle) {
                parsedAction = {
                  action: "CREATE_NOTE",
                  title: noteTitle,
                  text: noteContent || noteTitle
                };
                console.log("Created synthetic note action:", parsedAction);
              }
            }
          }
          
          if (!parsedAction) {
            console.log("No JSON object or structured data found in the response");
          }
        }
        
        // If we have a valid action, process it
        if (parsedAction) {
          console.log("Processing action:", parsedAction);
          
          // Create a more user-friendly response
          switch (parsedAction.action) {
            case "CREATE_TASK":
              finalResponse = `I'll create a task: "${parsedAction.text}"${
                parsedAction.priority ? ` with ${parsedAction.priority} priority` : ""
              }${parsedAction.project ? ` in project "${parsedAction.project}"` : ""}${
                parsedAction.dueDate ? ` due on ${parsedAction.dueDate}` : ""
              }.`;
              
              // Actually create the task
              let newTask;
              newTask = await db.task.create({
                data: {
                  userId,
                  text: parsedAction.text,
                  priority: parsedAction.priority || "MEDIUM",
                  dueDate: parsedAction.dueDate ? new Date(parsedAction.dueDate) : null,
                  completed: false,
                },
              });
              
              // Add the task ID to the action for the frontend
              parsedAction.id = newTask.id;
              break;
            
            case "UPDATE_TASK":
              finalResponse = `I'll update the task with ID ${parsedAction.id}.`;
              
              // Actually update the task
              await db.task.update({
                where: { id: parsedAction.id },
                data: {
                  text: parsedAction.text,
                  priority: parsedAction.priority,
                  project: parsedAction.project,
                  dueDate: parsedAction.dueDate ? new Date(parsedAction.dueDate) : undefined,
                  completed: parsedAction.completed,
                },
              });
              break;
            
            case "DELETE_TASK":
              finalResponse = `I'll delete the task with ID ${parsedAction.id}.`;
              
              // Actually delete the task
              await db.task.delete({
                where: { id: parsedAction.id },
              });
              break;
            
            case "CREATE_NOTE":
              finalResponse = `I'll create a note titled "${parsedAction.title}".`;
              
              // Actually create the note
              let newNote;
              newNote = await db.note.create({
                data: {
                  userId,
                  title: parsedAction.title,
                  text: parsedAction.text,
                },
              });
              
              // Add the note ID to the action for the frontend
              parsedAction.id = newNote.id;
              break;
            
            case "UPDATE_NOTE":
              finalResponse = `I'll update the note with ID ${parsedAction.id}.`;
              
              // Actually update the note
              await db.note.update({
                where: { id: parsedAction.id },
                data: {
                  title: parsedAction.title,
                  text: parsedAction.text,
                },
              });
              break;
            
            case "DELETE_NOTE":
              finalResponse = `I'll delete the note with ID ${parsedAction.id}.`;
              
              // Actually delete the note
              await db.note.delete({
                where: { id: parsedAction.id },
              });
              break;
            
            default:
              finalResponse = assistantMessage;
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