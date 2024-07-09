import jsx from "lib/utils/jsx";

const VariantToClass = {
  neutral: "",
  error: "error",
  success: "success",
};

export function Alert({ title, message, variant = "neutral" }) {
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
