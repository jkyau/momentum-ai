import { NextResponse } from "next/server";

// Define Ollama API URL from environment variable
const OLLAMA_API_URL = process.env.OLLAMA_API_URL || "http://host.docker.internal:11434";
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || "llama3";

export async function GET() {
  try {
    console.log(`Testing connection to Ollama at ${OLLAMA_API_URL}`);
    
    // First, try to get the version
    const versionResponse = await fetch(`${OLLAMA_API_URL}/api/version`);
    
    if (!versionResponse.ok) {
      return NextResponse.json(
        { 
          success: false, 
          message: `Failed to connect to Ollama: ${versionResponse.status} ${versionResponse.statusText}`,
          error: await versionResponse.text()
        },
        { status: 500 }
      );
    }
    
    const versionData = await versionResponse.json();
    
    // Then, check if the model exists
    const tagsResponse = await fetch(`${OLLAMA_API_URL}/api/tags`);
    
    if (!tagsResponse.ok) {
      return NextResponse.json(
        { 
          success: false, 
          message: `Failed to get Ollama models: ${tagsResponse.status} ${tagsResponse.statusText}`,
          error: await tagsResponse.text(),
          version: versionData
        },
        { status: 500 }
      );
    }
    
    const tagsData = await tagsResponse.json();
    
    // Check if our model exists
    const modelExists = tagsData.models && tagsData.models.some((model: any) => 
      model.name === OLLAMA_MODEL || model.name.startsWith(`${OLLAMA_MODEL}:`)
    );
    
    return NextResponse.json({
      success: true,
      version: versionData,
      models: tagsData,
      modelExists,
      modelName: OLLAMA_MODEL,
      ollamaUrl: OLLAMA_API_URL
    });
  } catch (error) {
    console.error("Error testing Ollama connection:", error);
    return NextResponse.json(
      { 
        success: false, 
        message: error instanceof Error ? error.message : "Unknown error connecting to Ollama",
        error: error
      },
      { status: 500 }
    );
  }
} 