export function Json({ data }: { data: unknown }) {
  return (
    <pre style={{ fontSize: 14, tabSize: 4 }} className="m-0">
      {JSON.stringify(data, undefined, 2)}
    </pre>
  )
}
