import jsx from "lib/jsx";
import { assert, undefinedOrNull } from "lib/validation";

export function Outlink({ href, children, class: className = "link" }) {
  const tag = "Outlink";
  assert({
    tag,
    check: typeof href === "string" && href.length > 0,
    error: "'href' must be a non-empty string",
    data: { href },
  });
  assert({
    tag,
    check: !undefinedOrNull(children),
    error: "'children' must not be undefined/null",
    data: { children },
  });

  return (
    <a href={href} rel="noopener noreferrer nofollow" target="_blank" class={className}>
      {children}
    </a>
  );
}
