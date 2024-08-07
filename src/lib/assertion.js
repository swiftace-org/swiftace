export function assert({ tag, check, error, data }) {
  if (!check) {
    if (!(typeof error === "string")) {
      const serializedInput = JSON.stringify({ tag, error, data }, null, 2);
      const message = `[assert] 'error' must be a string\n${serializedInput}`;
      throw new Error(message);
    }
    const serializedData = data !== undefined ? "\n" + JSON.stringify(data, null, 2) + "\n" : "";
    const finalMessage = serializedData ? `[${tag}] ${error}\n${serializedData}` : `[${tag}] ${error}`;
    throw new Error(finalMessage);
  }
}

export function undefinedOrNull(input) {
  return input === undefined || input === null;
}

export function isObject(input) {
  return !!input && typeof input === "object" && !Array.isArray(input);
}

export function isNonEmptyString(input, { trim } = {}) {
  return typeof input === "string" && (trim ? input.trim().length > 0 : input.length > 0);
}

export function assertAll({ tag, asserts }) {
  const errorMessages = [];
  for (const assertion of asserts) {
    const { check, error, data } = assertion;
    if (!check) {
      const serializedData = data !== undefined ? "\n" + JSON.stringify(data, null, 2) + "\n" : "";
      errorMessages.push(serializedData ? `${error}\n${serializedData}` : `${error}`);
    }
  }
  if (errorMessages.length > 0) {
    throw new Error(`[${tag}] Failed assertion(s)\n\n` + errorMessages.join("\n"));
  }
}

export function assertEnvKeys({ tag, env, keys }) {
  assert({
    tag: "assertEnvKeys",
    check: isObject(env),
    error: "'env' must be an object",
    data: { typeOfEnv: typeof env },
  });
  assert({
    tag: "assertEnvKeys",
    check: Array.isArray(keys) && keys.every((key) => typeof key === "string"),
    error: "'keys' must be an array of strings",
    data: { keys },
  });
  const missingVariables = keys.filter((key) => !(key in env));
  assert({
    tag,
    check: missingVariables.length === 0,
    error: "Environment variable(s) not configured",
    data: { missingVariables },
  });
}

export function isValidEmail(email) {
  const EMAIL_REGEX =
    // eslint-disable-next-line no-useless-escape
    /^[-!#$%&'*+\/0-9=?A-Z^_a-z`{|}~](\.?[-!#$%&'*+\/0-9=?A-Z^_a-z`{|}~])*@[a-zA-Z0-9](-*\.?[a-zA-Z0-9])*\.[a-zA-Z](-?[a-zA-Z0-9])+$/;

  if (!email) return false;

  const emailParts = email.split("@");

  if (emailParts.length !== 2) return false;

  const account = emailParts[0];
  if (account.length > 64) return false;

  const address = emailParts[1];
  if (address.length > 255) return false;

  const domainParts = address.split(".");
  if (domainParts.some((part) => part.length > 63)) return false;

  return EMAIL_REGEX.test(email);
}

export function haveSameKeys(input1, input2) {
  assert({
    tag: "haveSameKeys",
    check: isObject(input1),
    error: "'input1' must be an object",
    data: { input1 },
  });
  assert({
    tag: "haveSameKeys",
    check: isObject(input2),
    error: "'input2' must be an object",
    data: { input2 },
  });
  const keys1 = Object.keys(input1).sort();
  const keys2 = Object.keys(input2).sort();
  return keys1.length === keys2.length && keys1.every((key, index) => key === keys2[index]);
}

export function assertNonEmptyString({ tag, trim, ...rest }) {
  const restKeys = Object.keys(rest);
  const varName = restKeys[0];
  assert({
    tag: assertNonEmptyString.name,
    check: restKeys.length === 1,
    error: "Expected exactly one additional key other than 'tag' and 'trim'",
    data: { additionalKeys: restKeys },
  });
  assert({
    tag,
    check: isNonEmptyString(rest[varName], { trim }),
    error: `'${varName}' must be a non-empty string`,
    data: rest,
  });
}

function isClass(obj) {
  const isCtorClass = obj.constructor && obj.constructor.toString().substring(0, 5) === "class";
  if (obj.prototype === undefined) {
    return isCtorClass;
  }
  const isPrototypeCtorClass =
    obj.prototype.constructor &&
    obj.prototype.constructor.toString &&
    obj.prototype.constructor.toString().substring(0, 5) === "class";
  return isCtorClass || isPrototypeCtorClass;
}

export function assertInstanceOf({ tag, cls, ...rest }) {
  const restKeys = Object.keys(rest);
  assert({
    tag: assertInstanceOf.name,
    check: restKeys.length === 1,
    error: "Expected exactly one additional key other than 'tag' and 'cls'",
    data: { additionalKeys: restKeys },
  });
  assert({
    tag: assertInstanceOf.name,
    check: isNonEmptyString(cls) || isClass(cls),
    error: "'cls' must be a class or a string class name",
    data: { "typeof cls": typeof cls },
  });
  const clsName = typeof cls === "string" ? cls : cls.name;
  const varName = restKeys[0];
  const varValue = rest[varName];
  const varConstructorName = varValue?.constructor.name || typeof varValue;
  assert({
    tag,
    check: typeof cls === "string" ? varConstructorName === cls : varValue instanceof cls,
    error: `'${varName}' must be an instance of '${clsName}'`,
    data: { receivedType: varConstructorName },
  });
}
