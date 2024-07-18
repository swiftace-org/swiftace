import jsx from "lib/jsx";
import { assert } from "lib/assertion";

/** TODO:
 * - [ ] Trim title and message before asserting or using them
 * - [ ] Create a set of pages to test components is various states
 */

const VariantToClass = {
  neutral: "",
  error: "error",
  success: "success",
};

export function Alert({ title, message, variant = "neutral" }) {
  const tag = "Alert";
  assert({
    tag,
    check: typeof title === "string" && title.length > 0,
    error: "'title' must be a non-empty string",
    data: { title },
  });
  assert({
    tag,
    check: typeof message === "string" && message.length > 0,
    error: "'message' must be a non-empty string",
    data: { message },
  });
  assert({
    tag,
    check: variant in VariantToClass,
    error: "'variant' must be one of the allowed values",
    data: {
      variant,
      allowedValues: Object.values(AlertVariant),
    },
  });

  return (
    <aside class={`alert ${VariantToClass[variant]}`} role="alert">
      <h4>{title}</h4>
      <p>{message}</p>
    </aside>
  );
}

export const AlertVariant = {
  NEUTRAL: "neutral",
  ERROR: "error",
  SUCCESS: "success",
};
