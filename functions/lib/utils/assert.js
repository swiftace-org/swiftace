export function assert(displayTag, condition, message) {
  if (!condition) throw new Error(`[${displayTag}] ${message}\n`);
}

export function assertAll(displayTag, conditionsAndMessages, overallMessage = "Error") {
  const errors = conditionsAndMessages.filter(([condition]) => !condition).map(([_, message]) => message);
  const combinedMessage = `${overallMessage}\n-${errors.join("\n-")}`;
  assert(displayTag, errors.length === 0, combinedMessage);
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
