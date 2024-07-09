import jsx from "lib/utils/jsx";
import { assert, validateUrlOrPath } from "lib/utils/validation";

/** TODO:
 * - [ ] Add a "large" variant (64px)
 */

export function Avatar({ avatar, firstName, lastName }) {
  const tag = "Avatar";
  assert(tag, typeof firstName === "string", "'firstName' must be a string", { firstName });
  assert(tag, firstName.length > 0, "'firstName' must not be empty", { firstName });
  assert(
    tag,
    typeof lastName === "string" || lastName === undefined,
    "'lastName' must be a string or undefined",
    { lastName }
  );
  assert(tag, avatar === undefined || typeof avatar === "string", "'avatar' must be a string or undefined", {
    avatar,
  });
  assert(tag, validateUrlOrPath(avatar), "'avatar' must be a valid URL or URL path");

  const name = makeFullName({ firstName, lastName });
  return avatar ? (
    <img class="avatar" src={avatar} alt={name} title={name} height="32" width="32" />
  ) : (
    <div class="avatar" title={name}>
      {makeInitials({ name })}
    </div>
  );
}

function makeFullName({ firstName, lastName }) {
  return lastName ? `${firstName} ${lastName}` : firstName;
}

const makeInitials = ({ name = "" }) => {
  let arr = name.match(/\b\w/g) || [];

  if (arr.length === 0) {
    return "";
  }
  if (arr.length === 1) {
    return String(arr[0]).toUpperCase();
  }
  return (arr[0] + arr[arr.length - 1]).toUpperCase();
};
