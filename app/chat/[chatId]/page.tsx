"use client";

import type React from "react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { saveMessage } from "@/lib/actions/chat";
import { cn } from "@/lib/utils";
import { useChat } from "ai/react";
import { Bot } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ChatMessage } from "./chat-message";

export function ChatInterface() {
  const router = useRouter();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const [isFetchingChat, setIsFetchingChat] = useState(true);
  const [messages, setMessages] = useState([]);

  useEffect(() => {
    const fetchMessages = async () => {
      const data = await getChatMessages(chatId);
      if (data.success) {
        const formattedMessages = data.chat.messages.map((message) => ({
          id: message.id,
          role: message.isUser ? "user" : "assistant",
          content: message.text,
        }));
        setInitialMessages(formattedMessages);
      } else {
        router.push("/chat");
      }
      setLoading(false);
    };

    fetchMessages();
  }, [chatId, router]);

  const { messages, input, handleInputChange, handleSubmit, isLoading } =
    useChat({
      api: "/api/chat",
      initialMessages,
      body: {
        chatId: chat.id,
      },
      onFinish: async (message) => {
        // Save the AI response to the database
        await saveMessage({
          chatId: chat.id,
          text: message.content,
          isUser: false,
        });
        router.refresh();
      },
    });

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Handle form submission
  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!input.trim()) return;

    // Save user message to database before sending to API
    await saveMessage({
      chatId: chat.id,
      text: input,
      isUser: true,
    });

    // Submit the form to send message to AI
    handleSubmit(e);
  };

  return (
    <div className="flex flex-col w-full h-full bg-background">
      {/* Chat header */}
      <div className="flex items-center justify-between p-4 border-b">
        <h1 className="text-xl font-semibold">
          {chat.title || "DSA Learning Session"}
        </h1>
      </div>

      {/* Messages container */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
            <Bot size={64} className="mb-4 opacity-50" />
            <h3 className="text-xl font-medium">Start Learning DSA</h3>
            <p className="max-w-md mt-2">
              Ask any question about data structures and algorithms. I'm here to
              help you learn!
            </p>
          </div>
        ) : (
          messages.map((message) => (
            <ChatMessage key={message.id} message={message} />
          ))
        )}

        {/* Loading indicator */}
        {isLoading && (
          <div className="flex items-start gap-3">
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10">
              <Bot size={18} className="text-primary" />
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 rounded-full bg-muted-foreground/30 animate-bounce" />
              <div
                className="w-3 h-3 rounded-full bg-muted-foreground/30 animate-bounce"
                style={{ animationDelay: "0.2s" }}
              />
              <div
                className="w-3 h-3 rounded-full bg-muted-foreground/30 animate-bounce"
                style={{ animationDelay: "0.4s" }}
              />
            </div>
          </div>
        )}

        {/* Invisible element for auto-scrolling */}
        <div ref={messagesEndRef} />
      </div>

      {/* Message input */}
      <div className="p-4 border-t">
        <form ref={formRef} onSubmit={onSubmit} className="relative">
          <Textarea
            value={input}
            onChange={handleInputChange}
            placeholder="Ask about any DSA concept..."
            className="min-h-[60px] w-full resize-none rounded-lg border border-input pr-16 focus-visible:ring-1"
            rows={1}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                formRef.current?.requestSubmit();
              }
            }}
          />
          <Button
            type="submit"
            size="icon"
            disabled={isLoading || !input.trim()}
            className={cn(
              "absolute right-2 top-2 h-8 w-8",
              !input.trim() && "opacity-50"
            )}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-4 w-4"
            >
              <path d="M22 2L11 13" />
              <path d="M22 2L15 22L11 13L2 9L22 2Z" />
            </svg>
            <span className="sr-only">Send</span>
          </Button>
        </form>
        <p className="mt-2 text-xs text-center text-muted-foreground">
          Press Enter to send, Shift+Enter for a new line
        </p>
      </div>
    </div>
  );
}
