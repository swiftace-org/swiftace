export function stringify(source: string | string[] | undefined) {
  if (typeof source === "string") return source
  return (source ?? []).map((line) => line.trim()).join("\n")
}
