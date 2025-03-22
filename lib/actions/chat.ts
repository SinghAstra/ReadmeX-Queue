"use server";
import { Chat, Message } from "@prisma/client";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth-options";
import { prisma } from "../prisma";

type GetChatsResponse =
  | { success: true; chats: Chat[] }
  | { success: false; message: string };

export interface ChatWithMessage extends Chat {
  messages: Message[];
}

type getChatResponse =
  | { success: true; chat: ChatWithMessage }
  | { success: false; message: string };

export async function getChats(): Promise<GetChatsResponse> {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return { success: false, message: "User not authenticated" };
    }

    const chats = await prisma.chat.findMany({
      where: { userId: session.user.id },
      orderBy: { updatedAt: "desc" },
    });

    return { success: true, chats };
  } catch (error) {
    if (error instanceof Error) {
      console.log("error.stack is ", error.stack);
      console.log("error.message is ", error.message);
    }
    return { success: false, message: "Failed to fetch chats" };
  }
}

export async function createChat(firstMessage: string) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return { success: false, message: "User not authenticated" };
    }

    const chat = await prisma.chat.create({
      data: {
        userId: session.user.id,
        messages: {
          create: {
            text: firstMessage,
            isUser: true,
          },
        },
      },
    });

    return { success: true, chatId: chat.id };
  } catch (error) {
    if (error instanceof Error) {
      console.log("error.stack is ", error.stack);
      console.log("error.message is ", error.message);
    }
    return { success: false, message: "Failed to create chat" };
  }
}

export async function getChat(chatId: string): Promise<getChatResponse> {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return { success: false, message: "User not authenticated" };
    }

    const chat = await prisma.chat.findUnique({
      where: { id: chatId, userId: session.user.id },
      include: { messages: true },
    });

    if (!chat) {
      return { success: false, message: "Chat Not Found" };
    }

    return { success: true, chat };
  } catch (error) {
    if (error instanceof Error) {
      console.log("error.stack is ", error.stack);
      console.log("error.message is ", error.message);
    }
    return { success: false, message: "Failed to fetch chat messages" };
  }
}
