"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { siteConfig } from "@/config/site";
import { createChat } from "@/lib/actions/chat";
import { cn } from "@/lib/utils";
import { Send } from "lucide-react";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { toast } from "sonner";

export default function ChatInterface() {
  const [input, setInput] = useState<string>();
  const [message, setMessage] = useState<string | null>(null);
  const router = useRouter();

  const handleSubmit = async (e: FormEvent) => {
    try {
      e.preventDefault();
      if (!input?.trim()) return;

      const data = await createChat(input);
      if (!data.success) {
        return;
      }

      router.push(`/chat/${data.chatId}`);

      setInput("");
    } catch (error) {
      if (error instanceof Error) {
        console.log("error.stack is ", error.stack);
        console.log("error.message is ", error.message);
      }
      setMessage("Check Your Network Connection");
    }
  };

  useEffect(() => {
    if (!message) return;
    toast(message);
    setMessage(null);
  }, [message]);

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
          <Button type="submit" disabled={!input?.trim()}>
            <Send className="h-4 w-4" />
            <span className="sr-only">Send</span>
          </Button>
        </form>
      </div>
    </div>
  );
}
