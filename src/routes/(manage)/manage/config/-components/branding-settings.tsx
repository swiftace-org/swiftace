import { useState } from "react"

import { FieldDescription } from "@/components/ui/field"
import { Separator } from "@/components/ui/separator"
import type { BrandingSettings as BrandingSettingsValues } from "@/types/site-config"

import { BRANDING_TAB_ASSETS } from "../-lib/constants"
import { BrandAssetRow } from "./brand-asset-row"

/** Each image saves on its own as soon as it's picked, so there's no Save button here. */
export function BrandingSettings({ settings }: { settings: BrandingSettingsValues }) {
  const [branding, setBranding] = useState(settings)

  return (
    <div className="flex flex-col gap-5">
      <FieldDescription>
        Images apply as soon as they upload. Until one is uploaded, a generic default is used.
      </FieldDescription>
      {BRANDING_TAB_ASSETS.map((asset, index) => (
        <div key={asset} className="flex flex-col gap-5">
          {index > 0 && <Separator />}
          <BrandAssetRow asset={asset} branding={branding} onChange={setBranding} />
        </div>
      ))}
    </div>
  )
}
