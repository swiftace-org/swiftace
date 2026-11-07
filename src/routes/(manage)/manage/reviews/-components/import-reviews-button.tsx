import { useRouter } from "@tanstack/react-router"
import { UploadIcon } from "lucide-react"
import { useRef, useState } from "react"

import { Button } from "@/components/ui/button"
import { toast } from "@/components/ui/toast"
import { toSubmitErrorMessage } from "@/lib/utils"

import { submitImportReviews } from "../-functions/import-reviews"
import { parseReviewsCsv } from "../-lib/utils"

export function ImportReviewsButton() {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isImporting, setIsImporting] = useState(false)

  async function handleFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    // Cleared so picking the same file again after fixing it still fires `change`.
    event.target.value = ""
    if (!file) return

    const parsed = parseReviewsCsv(await file.text())
    if ("error" in parsed) {
      toast.add({ type: "error", title: `Couldn't import ${file.name}`, description: parsed.error })
      return
    }
    const count = parsed.rows.length
    const noun = count === 1 ? "review" : "reviews"
    if (!window.confirm(`Add ${count} ${noun} from "${file.name}" to the end of the list?`)) return

    setIsImporting(true)
    try {
      const result = await submitImportReviews({ data: { rows: parsed.rows } })
      if ("error" in result) {
        toast.add({ type: "error", description: result.error })
        return
      }
      toast.add({ type: "success", description: `Imported ${result.imported} ${noun}!` })
      await router.invalidate()
    } catch (error) {
      toast.add({
        type: "error",
        description: toSubmitErrorMessage(error, "Failed to import the reviews."),
      })
    } finally {
      setIsImporting(false)
    }
  }

  return (
    <>
      <Button
        variant="outline"
        disabled={isImporting}
        onClick={() => fileInputRef.current?.click()}
      >
        <UploadIcon />
        {isImporting ? "Importing..." : "Import CSV"}
      </Button>
      <input
        ref={fileInputRef}
        type="file"
        accept=".csv,text/csv"
        className="hidden"
        onChange={handleFile}
      />
    </>
  )
}
