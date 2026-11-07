import { useRouter } from "@tanstack/react-router"
import { ImageIcon, Trash2Icon, UploadIcon } from "lucide-react"
import { useRef, useState } from "react"

import { Button } from "@/components/ui/button"
import { FieldContent, FieldDescription, FieldError, FieldTitle } from "@/components/ui/field"
import { toast } from "@/components/ui/toast"
import { DEFAULT_COURSE_COVER_PATH, DEFAULT_ICON_PATH } from "@/lib/config"
import { cn, refreshSession, toSubmitErrorMessage } from "@/lib/utils"
import type { BrandAsset, BrandingSettings } from "@/types/site-config"

import { submitBrandAsset } from "../-functions/submit-brand-asset"
import { submitRemoveBrandAsset } from "../-functions/submit-remove-brand-asset"
import { BRAND_ASSET_DETAILS, type BrandAssetDetail } from "../-lib/constants"
import { BRAND_IMAGE_CONTENT_TYPES } from "../../../../brand/-lib/constants"
import { toBrandAssetUrl } from "../../../../brand/-lib/utils"

/** One image, uploaded as soon as it's picked. Also on `/manage/ai-tutor`, for the tutor's avatar. */
export function BrandAssetRow({
  asset,
  branding,
  onChange,
}: {
  asset: BrandAsset
  branding: BrandingSettings
  onChange: (branding: BrandingSettings) => void
}) {
  const detail = BRAND_ASSET_DETAILS[asset]
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const [pending, setPending] = useState<"upload" | "remove">()
  const [error, setError] = useState<string>()
  const key = branding[asset]

  async function save(request: () => Promise<{ branding: BrandingSettings } | { error: string }>) {
    setError(undefined)
    try {
      const result = await request()
      if ("error" in result) {
        setError(result.error)
        return
      }
      onChange(result.branding)
      toast.add({ type: "success", description: `${detail.title} saved!` })
      await refreshSession(router)
    } catch (error) {
      setError(toSubmitErrorMessage(error, `Failed to save the ${detail.title.toLowerCase()}.`))
    } finally {
      setPending(undefined)
    }
  }

  function handleFile(file: File | undefined) {
    if (!file) return
    const formData = new FormData()
    formData.set("asset", asset)
    formData.set("file", file)
    setPending("upload")
    void save(() => submitBrandAsset({ data: formData }))
  }

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
      <BrandAssetPreview asset={asset} detail={detail} branding={branding} />
      <FieldContent>
        <FieldTitle>{detail.title}</FieldTitle>
        <FieldDescription>{detail.description}</FieldDescription>
        <div className="flex flex-wrap gap-2 pt-1">
          <input
            ref={inputRef}
            type="file"
            className="hidden"
            accept={detail.types.map((type) => BRAND_IMAGE_CONTENT_TYPES[type]).join(",")}
            aria-label={`Upload the ${detail.title.toLowerCase()}`}
            onChange={(event) => {
              handleFile(event.target.files?.[0])
              // Cleared, so picking the same file again after an error still fires a change.
              event.target.value = ""
            }}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={!!pending}
            onClick={() => inputRef.current?.click()}
          >
            <UploadIcon />
            {pending === "upload" ? "Uploading..." : key ? "Replace" : "Upload"}
          </Button>
          {key && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={!!pending}
              onClick={() => {
                setPending("remove")
                void save(() => submitRemoveBrandAsset({ data: { asset } }))
              }}
            >
              <Trash2Icon />
              {pending === "remove" ? "Removing..." : "Remove"}
            </Button>
          )}
        </div>
        <FieldError>{error}</FieldError>
      </FieldContent>
    </div>
  )
}

/** Shows what the site will use, so a default or a fallback reads as such rather than as empty. */
function BrandAssetPreview({
  asset,
  detail,
  branding,
}: {
  asset: BrandAsset
  detail: BrandAssetDetail
  branding: BrandingSettings
}) {
  const ownUrl = toBrandAssetUrl(branding[asset])
  const fallbackUrl = {
    icon: DEFAULT_ICON_PATH,
    // Without an upload, `/favicon.ico` is the one built from the icon.
    favicon: `/favicon.ico?v=${branding.icon || "default"}`,
    logoLight: "",
    logoDark: toBrandAssetUrl(branding.logoLight),
    socialImage: "",
    courseCover: DEFAULT_COURSE_COVER_PATH,
    aiTutorAvatar: "",
  }[asset]
  const src = ownUrl || fallbackUrl

  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center overflow-hidden rounded-lg border bg-muted",
        detail.preview === "icon" ? "size-24" : "h-24 w-full sm:w-48",
        // Fixed colours rather than theme tokens: each logo is judged against the background it's
        // made for, whichever theme the admin happens to be in.
        detail.preview === "logo-light" && "bg-white",
        detail.preview === "logo-dark" && "bg-black",
        detail.preview.startsWith("logo") && "px-4",
      )}
    >
      {src ? (
        <img
          alt=""
          src={src}
          className={cn(
            detail.preview === "icon" && "size-16 rounded-xl",
            detail.preview.startsWith("logo") && "h-8 w-auto max-w-full",
            detail.preview === "wide" && "size-full object-cover",
            !ownUrl && "opacity-60",
          )}
        />
      ) : (
        <ImageIcon className="size-6 text-muted-foreground" aria-label="No image" />
      )}
    </div>
  )
}
