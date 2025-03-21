"use client";

import { Send } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import * as React from "react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface Message {
  id: string;
  text: string;
  isUser: boolean;
  createdAt: Date;
}

export default function ChatInterface() {
  const router = useRouter();
  const params = useParams();
  const chatId = params?.chatId as string | undefined;

  const [messages, setMessages] = React.useState<Message[]>([]);
  const [input, setInput] = React.useState("");
  const [isLoading, setIsLoading] = React.useState(false);
  const messagesEndRef = React.useRef<HTMLDivElement>(null);

  // Fetch messages if chatId exists
  React.useEffect(() => {
    if (chatId) {
      // Here you would fetch messages for the current chat
      // For now, we'll use placeholder data
      setIsLoading(true);
      // Simulate API call
      setTimeout(() => {
        setMessages([
          {
            id: "1",
            text: "Welcome to ChatDSAX! How can I help you learn Data Structures and Algorithms today?",
            isUser: false,
            createdAt: new Date(),
          },
        ]);
        setIsLoading(false);
      }, 1000);
    } else {
      // New chat, reset messages
      setMessages([]);
    }
  }, [chatId]);

  // Scroll to bottom when messages change
  React.useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    // Add user message to the UI immediately
    const userMessage: Message = {
      id: Date.now().toString(),
      text: input,
      isUser: true,
      createdAt: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      if (!chatId) {
        // Create a new chat
        // This would be an API call to create a chat and get an ID
        // For now, we'll simulate it
        const newChatId = "new-" + Date.now();
        router.push(`/chat/${newChatId}`);
      }

      // Simulate AI response
      setTimeout(() => {
        const aiResponse: Message = {
          id: Date.now().toString(),
          text: "I understand you want to learn about DSA. Let me explain some key concepts about data structures and algorithms...",
          isUser: false,
          createdAt: new Date(),
        };
        setMessages((prev) => [...prev, aiResponse]);
        setIsLoading(false);
      }, 1500);
    } catch (error) {
      console.error("Error sending message:", error);
      setIsLoading(false);
    }
  };

  return (
    <div className={cn("flex h-screen flex-col transition-all duration-300")}>
      <header className="flex h-14 items-center border-b px-4">
        <h2 className="text-lg font-semibold">
          {chatId
            ? messages.length > 0
              ? "Chat about DSA"
              : "Loading..."
            : "New Chat"}
        </h2>
      </header>

      <div className="flex-1 overflow-y-auto p-4">
        {messages.length === 0 && !isLoading ? (
          <div className="flex h-full flex-col items-center justify-center">
            <Card className="max-w-md p-6 text-center">
              <h3 className="mb-2 text-xl font-semibold">
                Welcome to ChatDSAX
              </h3>
              <p className="text-muted-foreground">
                Start a conversation to learn about Data Structures and
                Algorithms with AI assistance.
              </p>
            </Card>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={cn(
                  "flex",
                  message.isUser ? "justify-end" : "justify-start"
                )}
              >
                <div
                  className={cn(
                    "max-w-[80%] rounded-lg px-4 py-2",
                    message.isUser
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary text-secondary-foreground"
                  )}
                >
                  {message.text}
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="flex justify-start">
                <div className="max-w-[80%] rounded-lg bg-secondary px-4 py-2 text-secondary-foreground">
                  <div className="flex space-x-2">
                    <div className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground"></div>
                    <div
                      className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground"
                      style={{ animationDelay: "0.2s" }}
                    ></div>
                    <div
                      className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground"
                      style={{ animationDelay: "0.4s" }}
                    ></div>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      <div className="border-t p-4">
        <form onSubmit={handleSubmit} className="flex space-x-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about data structures and algorithms..."
            disabled={isLoading}
            className="flex-1"
          />
          <Button type="submit" disabled={isLoading || !input.trim()}>
            <Send className="h-4 w-4" />
            <span className="sr-only">Send</span>
          </Button>
        </form>
      </div>
    </div>
  );
}
