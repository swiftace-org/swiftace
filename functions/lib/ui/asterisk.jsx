const { default: jsx } = require("lib/utils/jsx");

export function Asterisk({ title = "Required" }) {
  return (
    <span title={title} class="asterisk">
      &nbsp;*&nbsp;
    </span>
  );
}
