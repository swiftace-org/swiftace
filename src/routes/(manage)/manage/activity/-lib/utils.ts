import type { SearchParamsInput } from "@/lib/utils"
import type { SiteActivitySearch } from "@/types/user"

export function toSiteActivitySearch(
  search: SearchParamsInput<SiteActivitySearch>,
): SiteActivitySearch {
  return { admins: search.admins === true || search.admins === "true" }
}
