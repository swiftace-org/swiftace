import jsx from "lib/utils/jsx";

export function PostItem({ slug, title, date }) {
  return (
    <div className="post-item">
      <h3 className="post-title">
        <a className="post-title-link" href={`/posts/${slug}`}>
          {title}
        </a>
      </h3>
      <div className="post-date">{date}</div>
    </div>
  );
}
