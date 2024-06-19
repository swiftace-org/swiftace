const { default: jsx } = require("lib/utils/jsx");

export function Asterisk({ title = "Required" }) {
  return <span className="ui-form-asterisk">*</span>;
}
