import { assert } from "lib/utils/validation";
import jsx from "lib/utils/jsx";

/** TODO
 * - [ ] Make breadcrumbs brown by default
 * - [ ] Hide breadcrumbs on mobile screens (?)
 * - [ ] Show dropdown on chevron for easy navigation (??)
 */

export function Breadcrumb({ items }) {
  const tag = "Breadcrumb";
  assert({
    tag,
    check: Array.isArray(items) && items.length > 0,
    error: "'items' should be a non-empty array",
    data: { items },
  });

  items.forEach((item, index) => {
    const data = { item, index };
    assert({
      tag,
      check: typeof item === "object",
      error: `Item at index ${index} must be an object`,
      data,
    });
    assert({
      tag,
      check: typeof item.label === "string",
      error: `Item at index ${index} must have a string label`,
      data,
    });
    assert({
      tag,
      check: typeof item.href === "string",
      error: `Item at index ${index} must have a string href`,
      data,
    });
  });

  return (
    <nav aria-label="breadcrumb" class="breadcrumb">
      <ul>
        {items.map((item) => (
          <li>
            <a href={item.href}>{item.label}</a>
            &nbsp;&nbsp;›&nbsp;&nbsp;
          </li>
        ))}
      </ul>
    </nav>
  );
}
