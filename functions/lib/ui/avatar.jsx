import jsx from "lib/utils/jsx";

export function Avatar({ avatar, name }) {
  return avatar ? (
    <img className="ui-avatar" src={avatar} alt={name} title={name} height="32" width="32" />
  ) : (
    <div className="ui-avatar" title={name}>
      {makeInitials({ name })}
    </div>
  );
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
