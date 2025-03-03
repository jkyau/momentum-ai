"use client";

import { useState } from "react";

interface SuggestedPromptsProps {
  onSelectPrompt: (prompt: string) => void;
}

export const SuggestedPrompts = ({ onSelectPrompt }: SuggestedPromptsProps) => {
  const [expanded, setExpanded] = useState(true);
  
  const prompts = [
    "Create a new high priority task for tomorrow",
    "Summarize my notes from this week",
    "What tasks are due this week?",
    "Create a note about project ideas",
    "Show me my completed tasks",
    "What's my most urgent task?",
  ];
  
  return (
    <div className="mb-4">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-medium">Suggested Prompts</h3>
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-xs text-muted-foreground hover:text-foreground"
          aria-label={expanded ? "Hide suggested prompts" : "Show suggested prompts"}
        >
          {expanded ? "Hide" : "Show"}
        </button>
      </div>
      
      {expanded && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {prompts.map((prompt, index) => (
            <button
              key={index}
              onClick={() => onSelectPrompt(prompt)}
              className="text-left text-sm p-2 rounded-md border border-input bg-background hover:bg-muted transition-colors"
              aria-label={`Use prompt: ${prompt}`}
            >
              {prompt}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}; 