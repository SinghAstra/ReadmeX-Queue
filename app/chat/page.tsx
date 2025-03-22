"use client";

import { Send } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { siteConfig } from "@/config/site";
import { cn } from "@/lib/utils";
import { FormEvent, useState } from "react";

export default function ChatInterface() {
  const [input, setInput] = useState("");

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!input) return;

    // Send message to the server
    console.log("Sending message:", input);

    setInput("");
  };

  return (
    <div className={cn("flex h-screen flex-col transition-all duration-300")}>
      <div className="flex-1 overflow-y-auto p-4">
        <div className="flex h-full flex-col items-center justify-center">
          <Card className="max-w-md p-6 text-center">
            <h3 className="mb-2 text-xl font-semibold">
              Welcome to {siteConfig.name}
            </h3>
            <p className="text-muted-foreground">
              Start a conversation to learn about Data Structures and Algorithms
              with AI assistance.
            </p>
          </Card>
        </div>
      </div>

      <div className="border-t p-4">
        <form onSubmit={handleSubmit} className="flex space-x-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about data structures and algorithms..."
            className="flex-1"
          />
          <Button type="submit">
            <Send className="h-4 w-4" />
            <span className="sr-only">Send</span>
          </Button>
        </form>
      </div>
    </div>
  );
}
