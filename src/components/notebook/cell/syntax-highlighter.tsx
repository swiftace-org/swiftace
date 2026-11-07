import { Light as SyntaxHighlighter } from "react-syntax-highlighter"
// Use the ESM language build to match the ESM-resolved `Light` import above —
// mixing it with the CJS deep-import path caused a Vite interop mismatch where
// the language definition arrived wrapped in a namespace object instead of a
// plain function, breaking `registerLanguage`'s internal `.bind` call.
import python from "react-syntax-highlighter/dist/esm/languages/hljs/python"

SyntaxHighlighter.registerLanguage("python", python)

export default SyntaxHighlighter
