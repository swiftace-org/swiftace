import jsx from "lib/utils/jsx";

/** TODO
 * - [ ] Make breadcrumbs brown by default
 * - [ ] Hide breadcrumbs on mobile screens (?)
 * - [ ] Show dropdown on chevron for easy navigation (??)
 */

export function Breadcrumbs({ items }) {
  return (
    <ul className="ui-breadcrumbs">
      {items.map((item) => (
        <li>
          <a className="ui-link" href={item.href}>
            {item.label}&nbsp;&nbsp;›&nbsp;&nbsp;
          </a>
        </li>
      ))}
    </ul>
  );
}
