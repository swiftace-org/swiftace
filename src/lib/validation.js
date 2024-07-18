export function assert({ tag, check, error, data }) {
  if (!check) {
    const serializedData = data !== undefined ? "\n" + JSON.stringify(data, null, 2) + "\n" : "";
    const finalMessage = serializedData ? `[${tag}] ${error}\n${serializedData}` : `[${tag}] ${error}`;
    throw new Error(finalMessage);
  }
}

export function assertAll({ tag, asserts }) {
  const errorMessages = [];
  for (const assertion of asserts) {
    const { check, error, data } = assertion;
    if (!check) {
      const serializedData = data !== undefined ? "\n" + JSON.stringify(data, null, 2) + "\n" : "";
      errorMessages.push(serializedData ? `[${tag}] ${error}\n${serializedData}` : `[${tag}] ${error}`);
    }
  }
  throw new Error("Failed assetion(s)\n\n" + errorMessages.join("\n"));
}

export function assertOld(displayTag, condition, message, data) {
  if (!condition) {
    const serializedData = data !== undefined ? "\n" + JSON.stringify(data, null, 2) + "\n" : "";
    const finalMessage = `[${displayTag}] ${message}\n${serializedData}`;
    throw new Error(finalMessage);
  }
}

export function assertAllOld(displayTag, conditionsAndMessages, overallMessage = "Error") {
  const errors = conditionsAndMessages.filter(([condition]) => !condition).map(([_, message]) => message);
  const combinedMessage = `${overallMessage}\n-${errors.join("\n-")}`;
  assertOld(displayTag, errors.length === 0, combinedMessage);
}

export function validateSameKeys(object1, object2) {
  const keys1 = Object.keys(object1).sort();
  const keys2 = Object.keys(object2).sort();
  return keys1.length === keys2.length && keys1.every((key, index) => key === keys2[index]);
}

export function isUrl(url) {
  try {
    new URL(url);
    return true;
  } catch (e) {
    return false;
  }
}

export function isUrlPath(urlPath) {
  try {
    new URL(urlPath, "http://example.com");
    return true;
  } catch (e) {
    return false;
  }
}

export function isUrlOrPath(url) {
  return isUrl(url) || isUrlPath(url);
}

export function undefinedOrNull(input) {
  return [undefined, null].includes(input);
}

export function isObject(value) {
  return value && typeof value === "object" && !Array.isArray(value);
}

export function isNonEmptyString(str, { trim } = {}) {
  return typeof str === "string" && (trim ? str.trim().length > 0 : str.length > 0);
}

export function assertEnvKeys({ tag, env, keys }) {
  assert({
    tag: "assertEnvKeys",
    check: isObject(env),
    error: "'env' must be an object",
    data: { typeOfEnv: typeof env },
  });
  const missing = keys.filter((key) => !(key in env));
  assert({
    tag,
    check: missing.length === 0,
    error: `${missing.join(", ")} not configured in environment`,
  });
}
