import { safeguard } from "lib/utils/cloudflare";

/** Blog Post - Anatomy of a Form
 * 1. Decide fields and data types
 * 2. Create layout with HTML tags
 * 3. Style form with CSS rules
 * 4. Add HTML-based client side validation
 * 5. Add JS-based validation & interactivity
 * 6. Parse data & files on server
 * 7. Validate & save data on server
 * 8. Redisplay form with success or errors
 */

export const onRequestGet = safeguard(async function ({ request, env }) {});
