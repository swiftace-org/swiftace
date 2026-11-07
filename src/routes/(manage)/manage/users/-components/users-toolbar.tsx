import { getRouteApi } from "@tanstack/react-router"
import { ArrowDownWideNarrow, ArrowUpNarrowWide, X } from "lucide-react"

import { DebouncedSearchInput } from "@/components/debounced-search-input"
import { IconButton } from "@/components/icon-button"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { ManageUsersRoleFilter, ManageUsersSearch, ManageUsersSortField } from "@/types/user"

import {
  MANAGE_USERS_ROLE_LABELS,
  MANAGE_USERS_ROLE_OPTIONS,
  MANAGE_USERS_SORT_LABELS,
  MANAGE_USERS_SORT_OPTIONS,
} from "../-lib/constants"
import { defaultSortOrder, hasManageUsersFilters } from "../-lib/utils"

const usersRoute = getRouteApi("/(manage)/manage/users/")

export function UsersToolbar({ search }: { search: ManageUsersSearch }) {
  const navigate = usersRoute.useNavigate()

  // Any change can leave the current page past the end of the results, so all of them
  // go back to the first page.
  function updateSearch(patch: Partial<ManageUsersSearch>, replace = false) {
    void navigate({ search: (prev) => ({ ...prev, ...patch, page: 1 }), replace })
  }

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
      <DebouncedSearchInput
        value={search.q}
        onChange={(q) => updateSearch({ q }, true)}
        label="Search users"
        placeholder="Search name or email"
        className="sm:w-80"
      />
      <Select
        items={MANAGE_USERS_ROLE_LABELS}
        value={search.role}
        onValueChange={(value) => updateSearch({ role: value as ManageUsersRoleFilter })}
      >
        <SelectTrigger aria-label="Filter by role" className="h-9! w-full sm:w-44">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {MANAGE_USERS_ROLE_OPTIONS.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {/* The email header is hidden on narrow screens, so sorting moves here. */}
      <div className="flex items-center gap-1 md:hidden">
        <Select
          items={MANAGE_USERS_SORT_LABELS}
          value={search.sort}
          onValueChange={(value) => {
            const sort = value as ManageUsersSortField
            updateSearch({ sort, order: defaultSortOrder(sort) })
          }}
        >
          <SelectTrigger aria-label="Sort by" className="h-9! flex-1">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {MANAGE_USERS_SORT_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <IconButton
          tooltip={search.order === "asc" ? "Ascending" : "Descending"}
          variant="outline"
          size="icon"
          onClick={() => updateSearch({ order: search.order === "asc" ? "desc" : "asc" })}
        >
          {search.order === "asc" ? <ArrowUpNarrowWide /> : <ArrowDownWideNarrow />}
        </IconButton>
      </div>
      {hasManageUsersFilters(search) ? (
        <Button
          variant="ghost"
          size="sm"
          className="self-start sm:self-auto"
          onClick={() => updateSearch({ q: "", role: "all" })}
        >
          <X />
          Clear
        </Button>
      ) : null}
    </div>
  )
}
