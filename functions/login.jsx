import { SendEmailCommand } from "@aws-sdk/client-sesv2";
import { MainNav } from "lib/ui/main-nav";
import { RootLayout } from "lib/ui/root-layout";
import * as auth from "lib/utils/auth";
import { makeSes } from "lib/utils/aws";
import { CachePrefix, getSiteSettings, makeHtmlResp, safeguard, validateTurnstile } from "lib/utils/cloudflare";
import jsx from "lib/utils/jsx";

export const onRequestGet = safeguard(async function ({ request, env }) {
  const { DB: database, CACHE_KV: cacheKv } = env;
  const siteSettings = await getSiteSettings({ cacheKv });
  const currentUser = await auth.getCurrentUser({ request, database });
  if (currentUser) {
    return new Response(null, { status: 302, statusText: "Found", headers: { Location: "/" } });
  }
  const props = {
    siteTitle: siteSettings.title,
    siteTagline: siteSettings.tagline,
    siteDescription: siteSettings.description,
    faviconUrl: siteSettings.faviconUrl,
    logoUrl: siteSettings.logoUrl,
    turnstileSiteKey: env.TURNSTILE_SITE_KEY,
    formTitle: "Sign In / Sign Up",
  };
  return makeHtmlResp(<LoginPage {...props} />);
});

export const onRequestPost = safeguard(async function ({ request, env, waitUntil }) {
  const { DB: database, CACHE_KV: cacheKv, IS_LOCAL: isLocal } = env;
  const siteSettings = await getSiteSettings({ cacheKv });
  const formData = await request.formData();
  const email = formData.get("email")?.trim();
  const turnstileToken = formData.get("cf-turnstile-response");
  const code = formData.get("code");
  const firstName = formData.get("first_name")?.trim();
  const lastName = formData.get("last_name")?.trim();

  const props = {
    siteTitle: siteSettings.title,
    siteTagline: siteSettings.tagline,
    siteDescription: siteSettings.description,
    faviconUrl: siteSettings.faviconUrl,
    logoUrl: siteSettings.logoUrl,
    turnstileSiteKey: env.TURNSTILE_SITE_KEY,
    formTitle: "Sign In / Sign Up",
    email,
    firstName,
    lastName,
    code,
  };

  // Reject if email is not provided or invalid
  if (!email) return makeHtmlResp(<LoginPage {...props} emailError="Email is required." />);
  if (!auth.validateEmail(email)) return makeHtmlResp(<LoginPage {...props} emailError="Email is invalid." />);

  // Reject if Turnstile token is invalid
  const isTurnstileValid = await validateTurnstile({ env, turnstileToken });
  if (!isTurnstileValid) return makeHtmlResp(<LoginPage {...props} turnstileError="Verification failed. Please try again!" />);

  // Look up email in DB and retrieve user (if exists)
  let user = await database.prepare(`SELECT u.id FROM user_emails ue JOIN users u ON ue.user_id = u.id AND ue.email = ? LIMIT 1;`).bind(email).first();

  // Retrieved stored verfication code if present
  const cacheKey = `${CachePrefix.emailVerificationCode}/${email}`;
  let storedCode = await cacheKv.get(cacheKey);

  // Generate a new stored code if not present
  if (!storedCode) {
    storedCode = auth.generateVerificationCode();
    waitUntil(cacheKv.put(cacheKey, storedCode, { expirationTtl: 600 })); // Valid for 10 minutes
  }

  // Send code if not provided by user
  if (!code) {
    // Send verficiation code over email
    await sendLoginEmail({ env, email, code: storedCode });

    // If user is not registered, show expanded form requesting name and verification code
    return makeHtmlResp(<LoginPage {...props} formTitle={user ? "Sign In" : "Sign Up"} showCode showName={!user} disableEmail />);
  }

  // Verify code if provided by user
  if (code?.trim() !== storedCode.trim()) {
    // Show error if code is invalid
    return makeHtmlResp(
      <LoginPage
        {...props}
        formTitle={user ? "Sign In" : "Sign Up"}
        code={null}
        codeError="Invalid code. Please enter the correct code."
        showCode
        showName={!user}
        disableEmail
      />
    );
  }

  // Register user if required
  if (!user) {
    // Show error if name is not provided
    if (!firstName) return makeHtmlResp(<LoginPage {...props} formTitle="Sign Up" firstNameError="First name is required." disableEmail showCode />);

    // Add a row to the users table
    user = await database.prepare(`INSERT INTO users (first_name, last_name) VALUES (?, ?) RETURNING id;`).bind(firstName, lastName).first();
    await database.prepare(`INSERT INTO user_emails (user_id, email) VALUES (?, ?)`).bind(user.id, email).first();
  }

  // Create new session and retrive session token
  const { sessionToken } = await auth.createUserSession({ userId: user.id, database });

  // Delete verification code & expired sessions
  waitUntil(cacheKv.delete(cacheKey));
  waitUntil(auth.deleteExpiredUserSessions({ userId: user.id, database, maxAge: siteSettings.sessionExpiryInSeconds }));

  // Set session token in cookie and redirect to "/"
  return new Response(null, {
    status: 302,
    statusText: "Found",
    headers: { Location: "/", "Set-Cookie": auth.createSessionCookie({ sessionToken, isLocal, maxAge: siteSettings.sessionExpiryInSeconds }) },
  });
});

function sendLoginEmail({ env, email, code }) {
  const ses = makeSes({ env });
  return ses.send(
    new SendEmailCommand({
      FromEmailAddress: env.AWS_FROM_EMAIL,
      Destination: { ToAddresses: [email] },
      Content: {
        Simple: {
          Subject: { Data: "Your verification code is " + code },
          Body: {
            Text: { Data: "Your verification code is " + code },
            Html: { Data: "Your verification code is " + code },
          },
        },
      },
    })
  );
}

function LoginPage({
  siteTitle,
  siteTagline,
  siteDescription,
  turnstileSiteKey,
  faviconUrl,
  logoUrl,
  formTitle,
  email = null,
  firstName = null,
  lastName = null,
  code = null,
  disableEmail = false,
  emailError = null,
  showName = false,
  firstNameError = null,
  lastNameError = null,
  showCode = false,
  codeError = null,
  turnstileError = null,
}) {
  return (
    <RootLayout title={`${formTitle} - ${siteTitle}`} description={siteDescription} faviconUrl={faviconUrl} styles={["ui", "login"]}>
      <MainNav logoUrl={logoUrl} hideSignIn />
      <form className="login-form" method="post" action="/login">
        <header>
          <h2>{formTitle}</h2>
          {siteTagline && <p>{siteTagline}</p>}
        </header>
        <fieldset>
          <EmailInput disabled={disableEmail} value={email} error={emailError} />
          <NameInputs show={showName} firstName={firstName} lastName={lastName} firstNameError={firstNameError} lastNameError={lastNameError} />
          <CodeInput show={showCode} value={code} autoFocus={!showName || firstName} error={codeError} />
          <Turnstile error={turnstileError} siteKey={turnstileSiteKey} />
        </fieldset>
        <footer>
          <input type="submit" className="ui-button" value="Continue" />
          <p>
            By signing in you agree to our
            <br />
            <a href="/privacy-policy" rel="noopener noreferrer nofollow" target="_blank" className="ui-link">
              privacy policy
            </a>
            {" and "}
            <a href="/terms-of-service" rel="noopener noreferrer nofollow" target="_blank" className="ui-link">
              terms of service
            </a>
            .
          </p>
        </footer>
      </form>
    </RootLayout>
  );
}

function EmailInput({ disabled, value, error }) {
  return (
    <>
      <label>
        <div className="ui-form-label">
          <span>Email Address </span>
          {disabled && (
            <a href="/login" className="ui-link">
              Edit
            </a>
          )}
        </div>
        <input
          className="ui-form-input"
          name="email"
          type="email"
          placeholder="yourname@domain.com"
          value={value}
          required
          readOnly={disabled}
          autoFocus={!disabled}
        />
      </label>
      {error && <div className="ui-form-error">{error}</div>}
    </>
  );
}

function NameInputs({ show, firstName, lastName, firstNameError, lastNameError }) {
  return (
    show && (
      <>
        <label>
          <div className="ui-form-label">First Name</div>
          <input className="ui-form-input" value={firstName} name="first_name" type="text" placeholder="Your First Name" required autoFocus={!firstName} />
        </label>
        {firstNameError && <div className="ui-form-error">{firstNameError}</div>}
        <label>
          <div className="ui-form-label">Last Name</div>
          <input className="ui-form-input" value={lastName} name="last_name" type="text" placeholder="Your Last Name" />
        </label>
        {lastNameError && <div className="ui-form-error">{lastNameError}</div>}
      </>
    )
  );
}

function CodeInput({ show, autoFocus, value, error }) {
  return (
    show && (
      <>
        <label>
          <div className="ui-form-label">Verification Code</div>
          <input className="ui-form-input" name="code" type="text" placeholder="6-digit code" required value={value} autoFocus={autoFocus} />
        </label>
        {error ? <div className="ui-form-error">{error}</div> : <div className="ui-form-hint">We've sent a code over email. Please check!</div>}
      </>
    )
  );
}

function Turnstile({ error, siteKey }) {
  return (
    <>
      <label>
        <div className="ui-form-label">Human Verification</div>
        <div className="cf-turnstile" data-sitekey={siteKey} data-theme="light" />
      </label>
      {error && <div className="ui-form-error">{error}</div>}
    </>
  );
}
