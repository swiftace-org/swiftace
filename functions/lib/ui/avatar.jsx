import jsx from "lib/utils/jsx";

export function Avatar({ avatar, username, name }) {
  return avatar ? (
    <img className="ui-avatar" src={avatar} alt={username} height="32" width="32" />
  ) : (
    <div className="ui-avatar">{makeInitials({ name, username })}</div>
  );
}

const makeInitials = ({ name = "", username = "" }) => {
  let arr = (name || username).match(/\b\w/g) || [];

  if (arr.length === 0 && username.length > 0) {
    arr = [username[0]];
  }
  if (arr.length === 0) {
    return "";
  }
  if (arr.length === 1) {
    return String(arr[0]).toUpperCase();
  }
  return (arr[0] + arr[arr.length - 1]).toUpperCase();
};
