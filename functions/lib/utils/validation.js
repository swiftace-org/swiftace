export function assert({ tag, check, error, data }) {
  if (!check) {
    const serializedData = data !== undefined ? "\n" + JSON.stringify(data, null, 2) + "\n" : "";
    const finalMessage = serializedData ? `[${tag}] ${error}\n${serializedData}` : `[${tag}] ${error}`;
    throw new Error(finalMessage);
  }
}

export function assertOld(displayTag, condition, message, data) {
  if (!condition) {
    const serializedData = data !== undefined ? "\n" + JSON.stringify(data, null, 2) + "\n" : "";
    const finalMessage = `[${displayTag}] ${message}\n${serializedData}`;
    throw new Error(finalMessage);
  }
}

export function assertAll(displayTag, conditionsAndMessages, overallMessage = "Error") {
  const errors = conditionsAndMessages.filter(([condition]) => !condition).map(([_, message]) => message);
  const combinedMessage = `${overallMessage}\n-${errors.join("\n-")}`;
  assertOld(displayTag, errors.length === 0, combinedMessage);
}

export function validateSameKeys(object1, object2) {
  const keys1 = Object.keys(object1).sort();
  const keys2 = Object.keys(object2).sort();
  return keys1.length === keys2.length && keys1.every((key, index) => key === keys2[index]);
}

export function validateUrl(url) {
  try {
    new URL(url);
    return true;
  } catch (e) {
    return false;
  }
}

export function validateUrlPath(urlPath) {
  try {
    new URL(urlPath, "http://example.com");
    return true;
  } catch (e) {
    return false;
  }
}

export function validateUrlOrPath(url) {
  return validateUrl(url) || validateUrlPath(url);
}

export function undefinedOrNull(input) {
  return [undefined, null].includes(input);
}
