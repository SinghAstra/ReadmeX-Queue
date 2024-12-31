import { Post } from "@/interfaces/post";
import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import CoverImage from "./cover-image";
import DateFormatter from "./date-formatter";

type Props = {
  post: Post;
};

export function HeroPost({ post }: Props) {
  return (
    <Link href={`/posts/${post.slug}`} aria-label={post.title}>
      <div className="mb-8 md:mb-16">
        <CoverImage title={post.title} src={post.coverImage} />
      </div>
      <div className="md:grid md:grid-cols-2 md:gap-x-16 lg:gap-x-8 mb-20 md:mb-28">
        <div>
          <h3 className="mb-4 text-4xl lg:text-5xl leading-tight hover:underline">
            {post.title}
          </h3>
          <div className="mb-4 md:mb-0 text-lg">
            <DateFormatter dateString={post.date} />
          </div>
        </div>
        <div>
          <p className="text-lg leading-relaxed mb-4">{post.excerpt}</p>
          <div className="flex items-center gap-4">
            <Avatar>
              <AvatarImage src={post.author.picture} />
              <AvatarFallback>{post.author.name[0]}</AvatarFallback>
            </Avatar>
            <span className="text-2xl ">{post.author.name}</span>
          </div>
        </div>
      </div>
    </Link>
  );
}
