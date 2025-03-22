"use client";

import { LogOut, MessageSquare, Plus } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar";
import { siteConfig } from "@/config/site";
import { getChats } from "@/lib/actions/chat";
import { cn } from "@/lib/utils";
import { Chat } from "@prisma/client";
import { signOut } from "next-auth/react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export default function ChatSidebar() {
  const [chats, setChats] = useState<Chat[]>([]);
  const [isFetchingChats, setIsFetchingChats] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const router = useRouter();
  const pathname = usePathname();
  const [dialogOpen, setDialogOpen] = useState(false);

  const handleNewChat = () => {
    router.push("/chat");
  };

  useEffect(() => {
    const fetchChats = async () => {
      try {
        setIsFetchingChats(true);
        const data = await getChats();
        if (!data.success) {
          throw new Error(data.message);
        }
        setChats(data.chats);
      } catch (error) {
        if (error instanceof Error) {
          console.log("error.stack is ", error.stack);
          console.log("error.message is ", error.message);
        }
        setMessage("Check Your Network Connection");
      } finally {
        setIsFetchingChats(false);
      }
    };

    fetchChats();
  }, []);

  useEffect(() => {
    if (!message) return;
    toast(message);
    setMessage(null);
  }, [message]);

  return (
    <Sidebar className="border-r border-border">
      <SidebarHeader className="px-2 py-2">
        <Button
          onClick={handleNewChat}
          className="mt-2 w-full justify-start"
          variant="secondary"
        >
          <Plus className="mr-2 h-4 w-4" />
          <span>New Chat</span>
        </Button>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {isFetchingChats ? (
                Array(3)
                  .fill(0)
                  .map((_, i) => (
                    <SidebarMenuItem key={i}>
                      <div className="h-9 w-full animate-pulse rounded-md bg-secondary/50"></div>
                    </SidebarMenuItem>
                  ))
              ) : chats.length > 0 ? (
                chats.map((chat) => {
                  const isCurrent = pathname === `/chat/${chat.id}`;
                  return (
                    <SidebarMenuItem key={chat.id}>
                      <SidebarMenuButton
                        asChild
                        isActive={isCurrent}
                        tooltip={chat.title || "Untitled Chat"}
                      >
                        <Link href={`/chat/${chat.id}`}>
                          <MessageSquare className="mr-2 h-4 w-4" />
                          <span className="truncate">
                            {chat.title || "Untitled Chat"}
                          </span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })
              ) : (
                <div className={cn("px-2 py-4 text-sm text-muted-foreground")}>
                  No chats yet. Start a new conversation!
                </div>
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <SidebarMenuButton tooltip="Log out">
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Log out</span>
                </SidebarMenuButton>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Log out</DialogTitle>
                  <DialogDescription>
                    Are you sure you want to log out of your account?
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter className="flex justify-between">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => setDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    onClick={() => signOut({ callbackUrl: "/" })}
                  >
                    Log out
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
