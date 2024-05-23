import { SendEmailCommand } from "@aws-sdk/client-sesv2";
import { MainNav } from "lib/ui/main-nav";
import { RootLayout } from "lib/ui/root-layout";
import * as auth from "lib/utils/auth";
import { makeSes } from "lib/utils/aws";
import { CachePrefix, getSiteSettings, makeHtmlResponse, safeguard, validateTurnstile } from "lib/utils/cloudflare";
import jsx from "lib/utils/jsx";

export const onRequestGet = safeguard(async function ({ request, env }) {
  const { DB: database, CACHE_KV: cacheKv, TURNSTILE_SITE_KEY: turnstileSiteKey } = env;
  const { title, tagline, description, faviconUrl, logoUrl } = await getSiteSettings({ cacheKv });
  const currentUser = await auth.getCurrentUser({ request, database });
  if (currentUser) return new Response(null, { status: 302, statusText: "Found", headers: { Location: "/" } });
  return makeHtmlResponse(
    <RootLayout title={`Sign In / Sign Up - ${title}`} description={description} faviconUrl={faviconUrl} styles={["ui", "login"]}>
      <MainNav logoUrl={logoUrl} siteTitle={title} hideSignIn />
      <form className="login-form" method="post" action="/login">
        <FormHeader title="Sign In / Sign Up" tagline={tagline} />
        <fieldset>
          <EmailInput />
          <Turnstile siteKey={turnstileSiteKey} />
        </fieldset>
        <FormFooter />
      </form>
    </RootLayout>
  );
});

export const onRequestPost = safeguard(async function ({ request, env, waitUntil }) {
  const { DB: database, CACHE_KV: cacheKv, IS_LOCAL: isLocal, TURNSTILE_SITE_KEY: turnstileSiteKey } = env;
  const { title, tagline, description, faviconUrl, logoUrl, sessionExpiryInSeconds } = await getSiteSettings({ cacheKv });
  const formData = await request.formData();
  const email = formData.get("email")?.trim();
  const turnstileToken = formData.get("cf-turnstile-response");
  const userCode = formData.get("code");
  const firstName = formData.get("first_name")?.trim();
  const lastName = formData.get("last_name")?.trim();

  function LoginPage({
    code = userCode,
    formTitle = "Sign In / Sign Up",
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
      <RootLayout title={`${formTitle} - ${title}`} description={description} faviconUrl={faviconUrl} styles={["ui", "login"]}>
        <MainNav logoUrl={logoUrl} siteTitle={title} hideSignIn />
        <form className="login-form" method="post" action="/login">
          <FormHeader title={formTitle} tagline={tagline} />
          <fieldset>
            <EmailInput disabled={disableEmail} value={email} error={emailError} />
            {showName && <NameInputs firstName={firstName} lastName={lastName} firstNameError={firstNameError} lastNameError={lastNameError} />}
            {showCode && <CodeInput value={code} autoFocus={!showName || firstName} error={codeError} />}
            <Turnstile error={turnstileError} siteKey={turnstileSiteKey} />
          </fieldset>
          <FormFooter />
        </form>
      </RootLayout>
    );
  }

  // Reject if email is not provided or invalid
  if (!email) return makeHtmlResponse(<LoginPage emailError="Email is required." />);
  if (!auth.validateEmail(email)) return makeHtmlResponse(<LoginPage emailError="Email is invalid." />);

  // Reject if Turnstile token is invalid
  const isTurnstileValid = await validateTurnstile({ env, turnstileToken });
  if (!isTurnstileValid) return makeHtmlResponse(<LoginPage turnstileError="Verification failed. Please try again!" />);

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
  if (!userCode) {
    // Send verficiation code over email
    await sendLoginEmail({ env, email, code: storedCode });

    // If user is not registered, show expanded form requesting name and verification code
    return makeHtmlResponse(<LoginPage formTitle={user ? "Sign In" : "Sign Up"} showCode showName={!user} disableEmail />);
  }

  // Verify code if provided by user
  if (userCode?.trim() !== storedCode.trim()) {
    // Show error if code is invalid
    const codeError = "Invalid code. Please enter the correct code.";
    return makeHtmlResponse(<LoginPage formTitle={user ? "Sign In" : "Sign Up"} code={null} codeError={codeError} showCode showName={!user} disableEmail />);
  }

  // Register user if required
  if (!user) {
    // Show error if name is not provided
    if (!firstName) return makeHtmlResponse(<LoginPage formTitle="Sign Up" firstNameError="First name is required." disableEmail showCode />);

    // Add a row to the users table
    user = await database.prepare(`INSERT INTO users (first_name, last_name) VALUES (?, ?) RETURNING id;`).bind(firstName, lastName).first();
    await database.prepare(`INSERT INTO user_emails (user_id, email) VALUES (?, ?)`).bind(user.id, email).first();
  }

  // Create new session and retrive session token
  const { sessionToken } = await auth.createUserSession({ userId: user.id, database });

  // Delete verification code & expired sessions
  waitUntil(cacheKv.delete(cacheKey));
  waitUntil(auth.deleteExpiredUserSessions({ userId: user.id, database, maxAge: sessionExpiryInSeconds }));

  // Set session token in cookie and redirect to "/"
  return new Response(null, {
    status: 302,
    statusText: "Found",
    headers: { Location: "/", "Set-Cookie": auth.createSessionCookie({ sessionToken, isLocal, maxAge: sessionExpiryInSeconds }) },
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

const EmailInput = ({ disabled = false, value = null, error = null }) => (
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

const NameInputs = ({ firstName = null, lastName = null, firstNameError = null, lastNameError = null }) => (
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
);

const CodeInput = ({ autoFocus = false, value = null, error = null }) => (
  <>
    <label>
      <div className="ui-form-label">Verification Code</div>
      <input className="ui-form-input" name="code" type="text" placeholder="6-digit code" required value={value} autoFocus={autoFocus} />
    </label>
    {error ? <div className="ui-form-error">{error}</div> : <div className="ui-form-hint">We've sent a code over email. Please check!</div>}
  </>
);

const Turnstile = ({ error = null, siteKey }) => (
  <>
    <label>
      <div className="ui-form-label">Human Verification</div>
      <div className="cf-turnstile" data-sitekey={siteKey} data-theme="light" />
    </label>
    {error && <div className="ui-form-error">{error}</div>}
  </>
);

const FormHeader = ({ title, tagline }) => (
  <header>
    <h2>{title}</h2>
    {tagline && <p>{tagline}</p>}
  </header>
);

const FormFooter = () => (
  <footer>
    <input type="submit" className="ui-button" value="Continue" />
    <p>
      By signing in you agree to our <Outlink href="/privacy-policy">privacy policy</Outlink> and <Outlink href="/terms-of-service">terms of service</Outlink>.
    </p>
  </footer>
);

const Outlink = ({ href, children }) => (
  <a href={href} rel="noopener noreferrer nofollow" target="_blank" className="ui-link">
    {children}
  </a>
);
