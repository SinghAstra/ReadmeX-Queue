import { type Author } from "@/interfaces/author";
import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import CoverImage from "./cover-image";
import DateFormatter from "./date-formatter";

type Props = {
  title: string;
  coverImage: string;
  date: string;
  excerpt: string;
  author: Author;
  slug: string;
};

export function HeroPost({
  title,
  coverImage,
  date,
  excerpt,
  author,
  slug,
}: Props) {
  return (
    <Link href={`/posts/${slug}`} aria-label={title}>
      <div className="mb-8 md:mb-16">
        <CoverImage title={title} src={coverImage} />
      </div>
      <div className="md:grid md:grid-cols-2 md:gap-x-16 lg:gap-x-8 mb-20 md:mb-28">
        <div>
          <h3 className="mb-4 text-4xl lg:text-5xl leading-tight hover:underline">
            {title}
          </h3>
          <div className="mb-4 md:mb-0 text-lg">
            <DateFormatter dateString={date} />
          </div>
        </div>
        <div>
          <p className="text-lg leading-relaxed mb-4">{excerpt}</p>
          <div className="flex items-center gap-4">
            <Avatar>
              <AvatarImage src={author.picture} />
              <AvatarFallback>{author.name[0]}</AvatarFallback>
            </Avatar>
            <span className="text-2xl ">{author.name}</span>
          </div>
        </div>
      </div>
    </Link>
  );
}
