import { posts, beforePosts } from "lib/content/posts";
import { Layout } from "lib/ui/layout";
import { Markdown } from "lib/ui/markdown";
import { makeMetaDescription } from "lib/utils";
import jsx from "lib/utils/jsx";

function PostPage({ post }) {
  return (
    <Layout
      title={`${post.title} - SwiftAce`}
      description={makeMetaDescription(post.content)}
    >
      <div className="post-page">
        <h1 className="page-heading">{post.title}</h1>
        <div className="post-date">
          {post.date} · {post.author}
        </div>
        <Markdown content={post.content} />
      </div>
    </Layout>
  );
}

export async function onRequestGet(context) {
  const slug = context.params.slug;

  const [post] = [...posts, ...beforePosts].filter((p) => p.slug === slug);
  if (!post) {
    return new Response("not found", { status: 404 });
  }

  // @ts-ignore
  return new Response(<PostPage post={post} />, {
    headers: {
      "content-type": "text/html;charset=UTF-8",
      "Cache-Control": "stale-while-revalidate=60",
    },
  });
}
