import jsx from "lib/utils/jsx";

const VariantToClass = {
  neutral: "ui-alert",
  error: "ui-alert-error",
  success: "ui-alert-success",
};

export function Alert({ title, message, variant = "neutral" }) {
  return (
    <aside className={VariantToClass[variant]}>
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
