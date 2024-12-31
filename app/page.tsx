import { HeroPost } from "@/components/home/hero-post";
import { Navbar } from "@/components/layout/Navbar";
import { getAllPosts } from "@/lib/api";

export default function Home() {
  const allPosts = getAllPosts();

  const heroPost = allPosts[0];

  return (
    <div className="container mx-auto min-h-screen">
      <Navbar />
      <HeroPost
        title={heroPost.title}
        coverImage={heroPost.coverImage}
        date={heroPost.date}
        author={heroPost.author}
        slug={heroPost.slug}
        excerpt={heroPost.excerpt}
      />
    </div>
  );
}
