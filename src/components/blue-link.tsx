import { createLink, type LinkComponent } from "@tanstack/react-router"
import * as React from "react"

import { cn } from "@/lib/utils"

type BlueLinkBaseProps = React.AnchorHTMLAttributes<HTMLAnchorElement> & {
  /** Blue at rest, not just on hover — for links inside prose and free-flowing text. */
  colored?: boolean
}

const BlueLinkBase = React.forwardRef<HTMLAnchorElement, BlueLinkBaseProps>(
  ({ className, colored, ...props }, ref) => (
    // oxlint-disable-next-line jsx-a11y/anchor-has-content -- children come from spread props
    <a
      ref={ref}
      className={cn(
        "inline-flex items-center hover:underline hover:text-blue-500 hover:underline-offset-4 hover:decoration-1 hover:decoration-blue-500/50",
        colored && "text-blue-500",
        className,
      )}
      {...props}
    />
  ),
)
BlueLinkBase.displayName = "BlueLink"

// The public type below is what callers see; the implementation stays loose so it can branch.
const RoutedBlueLink = createLink(BlueLinkBase) as unknown as React.ComponentType<
  Record<string, unknown>
>

type ExternalBlueLinkProps = BlueLinkBaseProps & { external: true }

type BlueLinkComponent = LinkComponent<typeof BlueLinkBase> & {
  (props: ExternalBlueLinkProps): React.ReactElement
}

/** Pass `external` with an `href` for URLs the router can't route to; otherwise give it a `to`. */
export const BlueLink = ((props: Record<string, unknown>) => {
  if (props.external) {
    const { external: _external, ...rest } = props
    return <BlueLinkBase {...(rest as BlueLinkBaseProps)} />
  }
  return <RoutedBlueLink {...props} />
}) as BlueLinkComponent
