import CoverImage from "@/components/home/cover-image";
import { Navbar } from "@/components/layout/Navbar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getPostBySlug } from "@/lib/api";
import markdownToHtml from "@/lib/markdown-to-html";
import { Metadata } from "next";
import { notFound } from "next/navigation";
import React from "react";

type Params = {
  params: Promise<{
    slug: string;
  }>;
};

async function PostDetailPage(props: Params) {
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
      <CoverImage title={post.title} src={post.coverImage} />
      <div className="max-w-2xl mx-auto">
        <div
          className="markdown"
          dangerouslySetInnerHTML={{ __html: content }}
        />
      </div>
    </div>
  );
}

export async function generateMetadata(props: Params): Promise<Metadata> {
  const params = await props.params;
  const post = getPostBySlug(params.slug);

  if (!post) {
    return notFound();
  }

  const title = `${post.title} | ${post.author}`;

  return {
    title,
    openGraph: {
      title,
      images: [post.ogImage.url],
    },
  };
}

// export async function generateStaticParams() {
//   const posts = getAllPosts();

//   return posts.map((post: Post) => ({
//     slug: post.slug,
//   }));
// }

export default PostDetailPage;
