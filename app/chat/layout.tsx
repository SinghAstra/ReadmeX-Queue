import { SidebarProvider } from "@/components/ui/sidebar";
import { authOptions } from "@/lib/auth-options";
import { Metadata } from "next";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import React from "react";
import ChatSidebar from "./chat-sidebar";

interface Props {
  children: React.ReactNode;
}

export const metadata: Metadata = {
  title: `Chat `,
  description: "Learn DSA concepts with AI assistance",
};

const ChatLayout = async ({ children }: Props) => {
  const session = await getServerSession(authOptions);
  if (!session) {
    redirect("/auth/sign-in");
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen w-full flex">
        <ChatSidebar />
        <main className="flex-1 ">{children}</main>
      </div>
    </SidebarProvider>
  );
};

export default ChatLayout;
