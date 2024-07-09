import { assert } from "lib/utils/validation";
import jsx from "lib/utils/jsx";

/** TODO
 * - [ ] Make breadcrumbs brown by default
 * - [ ] Hide breadcrumbs on mobile screens (?)
 * - [ ] Show dropdown on chevron for easy navigation (??)
 */

export function Breadcrumb({ items }) {
  const tag = "Breadcrumb";
  assert(tag, Array.isArray(items), "'items' should be an array", { items });
  assert(tag, items.length > 0, "'items' should have at least one element", { items });
  items.forEach((item, index) => {
    const data = { item, index };
    assert(tag, typeof item === "object", `Item at index ${index} must be an object`, data);
    assert(tag, typeof item.label === "string", `Item at index ${index} must have a string label`, data);
    assert(tag, typeof item.href === "string", `Item at index ${index} must have a string href`, data);
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
