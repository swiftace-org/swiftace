export function jsx(type, props, key = null) {
  return {
    type,
    props,
    key,
  };
}

export function jsxs(type, props, key) {
  return jsx(type, props, key);
}

export function Fragment(props) {
  return props.children;
}
