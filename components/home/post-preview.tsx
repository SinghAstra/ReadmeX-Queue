import { Post } from "@/interfaces/post";
import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import CoverImage from "./cover-image";
import DateFormatter from "./date-formatter";

type Props = {
  post: Post;
};

export function PostPreview({ post }: Props) {
  return (
    <Link href={`/posts/${post.slug}`} aria-label={post.title}>
      <div className="mb-5">
        <CoverImage title={post.title} src={post.coverImage} />
      </div>
      <h3 className="text-3xl mb-3 leading-snug hover:underline">
        {post.title}
      </h3>
      <div className="text-lg mb-4">
        <DateFormatter dateString={post.date} />
      </div>
      <p className="text-lg leading-relaxed mb-4">{post.excerpt}</p>
      <div className="flex items-center gap-4">
        <Avatar>
          <AvatarImage src={post.author.picture} />
          <AvatarFallback>{post.author.name[0]}</AvatarFallback>
        </Avatar>
        <span className="text-2xl ">{post.author.name}</span>
      </div>
    </Link>
  );
}
