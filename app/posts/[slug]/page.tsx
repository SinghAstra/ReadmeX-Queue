import { Navbar } from "@/components/layout/Navbar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getPostBySlug } from "@/lib/api";
import markdownToHtml from "@/lib/markdown-to-html";
import { notFound } from "next/navigation";
import React from "react";
import markdownStyles from "./markdown-styles.module.css";

type Params = {
  params: Promise<{
    slug: string;
  }>;
};

async function Post(props: Params) {
  const params = await props.params;
  const post = getPostBySlug(params.slug);

  if (!post) {
    return notFound();
  }

  const content = await markdownToHtml(post.content || "");

  return (
    <div className="container mx-auto flex flex-col gap-4">
      <Navbar size="small" />
      <h1 className="text-5xl md:text-7xl lg:text-8xl font-bold tracking-tighter leading-tight md:leading-none mb-8 text-center md:text-left">
        {post.title}
      </h1>
      <div className="flex items-center gap-4 ml-4">
        <Avatar>
          <AvatarImage src={post.author.picture} />
          <AvatarFallback>{post.author.name[0]}</AvatarFallback>
        </Avatar>
        <span className="text-2xl ">{post.author.name}</span>
      </div>
      <div className="max-w-2xl mx-auto">
        <div
          className={markdownStyles["markdown"]}
          dangerouslySetInnerHTML={{ __html: content }}
        />
      </div>
    </div>
  );
}

export default Post;
