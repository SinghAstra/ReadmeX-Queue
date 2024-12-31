import { HeroPost } from "@/components/home/hero-post";
import { MoreStories } from "@/components/home/more-stories";
import { Navbar } from "@/components/layout/Navbar";
import { getAllPosts } from "@/lib/api";

export default function Home() {
  const allPosts = getAllPosts();

  const heroPost = allPosts[0];

  const morePosts = allPosts.slice(1);

  return (
    <div className="container mx-auto min-h-screen">
      <Navbar />
      <HeroPost post={heroPost} />
      {morePosts.length > 0 && <MoreStories posts={morePosts} />}
    </div>
  );
}
