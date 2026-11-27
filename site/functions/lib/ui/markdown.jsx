import jsx from "lib/utils/jsx";
import { parseMarkdown } from "lib/utils";

export function Markdown({ content }) {
  return (
    <div
      className="markdown-body"
      dangerouslySetInnerHTML={{ __html: parseMarkdown(content) }}
    />
  );
}
