import jsx from "lib/utils/jsx";
import { assert } from "lib/utils/validation";

const VariantToClass = {
  neutral: "",
  error: "error",
  success: "success",
};

export function Alert({ title, message, variant = "neutral" }) {
  const tag = "Alert";
  assert(tag, typeof title === "string", "'title' must be a string", { title });
  assert(tag, title.length > 0, "'title' must not be empty", { title });
  assert(tag, typeof message === "string", "'message' must be a string", { message });
  assert(tag, message.length > 0, "'message' must not be empty", { message });
  assert(tag, variant in VariantToClass, "'variant' must be one of the allowed values", {
    variant,
    allowedValues: Object.values(AlertVariant),
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
