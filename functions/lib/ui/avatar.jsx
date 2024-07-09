import jsx from "lib/utils/jsx";

/** TODO:
 * - [ ] Add a "large" variant (64px)
 */

export function Avatar({ avatar, firstName, lastName }) {
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
