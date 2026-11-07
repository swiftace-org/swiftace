import { useRouter } from "@tanstack/react-router"
import { useState } from "react"

import { toast } from "@/components/ui/toast"
import { refreshSession, toSubmitErrorMessage } from "@/lib/utils"

type SettingsResult<T> = { settings: T } | { error: string }

/**
 * A tab's form state and save. The check runs here and again on the server, so both reject the
 * same input, and the session is refetched after since pages read the config from it.
 */
export function useSettingsForm<T>({
  settings,
  check,
  submit,
  name,
}: {
  settings: T
  check: (values: T) => SettingsResult<T>
  submit: (options: { data: { values: T } }) => Promise<SettingsResult<T>>
  /** Lowercase, as in "Pricing settings saved!" and "Failed to save the pricing settings." */
  name: string
}) {
  const router = useRouter()
  const [values, setValues] = useState(settings)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string>()

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    const checked = check(values)
    if ("error" in checked) {
      setError(checked.error)
      return
    }

    setIsSaving(true)
    setError(undefined)
    try {
      const result = await submit({ data: { values } })
      if ("error" in result) {
        setError(result.error)
        return
      }
      setValues(result.settings)
      toast.add({ type: "success", description: `${name[0].toUpperCase()}${name.slice(1)} saved!` })
      await refreshSession(router)
    } catch (error) {
      setError(toSubmitErrorMessage(error, `Failed to save the ${name}.`))
    } finally {
      setIsSaving(false)
    }
  }

  return { values, setValues, isSaving, error, handleSubmit }
}
