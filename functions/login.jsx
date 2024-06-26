import { SendEmailCommand } from "@aws-sdk/client-sesv2";
import { MainNav } from "lib/ui/main-nav";
import { RootLayout } from "lib/ui/root-layout";
import * as auth from "lib/utils/auth";
import { makeSes } from "lib/utils/aws";
import { getSiteSettings, makeHtmlResponse, safeguard, validateTurnstile } from "lib/utils/cloudflare";
import { CachePrefix } from "lib/utils/constants";
import jsx from "lib/utils/jsx";

export const onRequestGet = safeguard(async function ({ request, env }) {
  const { DB: database, CACHE_KV: cacheKv, TURNSTILE_SITE_KEY: turnstileSiteKey } = env;
  const { site_title, site_tagline, site_description, site_favicon_url, site_logo_url } = await getSiteSettings({ cacheKv });
  const currentUser = await auth.getCurrentUser({ request, database });
  if (currentUser) return new Response(null, { status: 302, statusText: "Found", headers: { Location: "/" } });
  return makeHtmlResponse(
    <RootLayout title={`Sign In / Sign Up - ${site_title}`} description={site_description} faviconUrl={site_favicon_url} styles={["ui", "login"]}>
      <MainNav logoUrl={site_logo_url} siteTitle={site_title} hideSignIn />
      <form className="login-form" method="post" action="/login">
        <FormHeader title="Sign In / Sign Up" tagline={site_tagline} />
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
  const { site_title, site_tagline, site_description, site_favicon_url, site_logo_url, session_expiry_seconds, otp_expiry_seconds } = await getSiteSettings({
    cacheKv,
  });
  const formData = await request.formData();
  const email = formData.get("email")?.trim();
  const turnstileToken = formData.get("cf-turnstile-response");
  const userCode = formData.get("code");
  const firstName = formData.get("first_name")?.trim();
  const lastName = formData.get("last_name")?.trim();

  const LoginFrame = ({ formTitle = "Sign In / Sign Up", children }) => (
    <RootLayout title={`${formTitle} - ${site_title}`} description={site_description} faviconUrl={site_favicon_url} styles={["ui", "login"]}>
      <MainNav logoUrl={site_logo_url} siteTitle={site_title} hideSignIn />
      <form className="login-form" method="post" action="/login">
        <FormHeader title={formTitle} tagline={site_tagline} />
        <fieldset>{children}</fieldset>
        <FormFooter />
      </form>
    </RootLayout>
  );

  // Reject if email is not provided or invalid
  const emailError = !email ? "Email is required." : !auth.validateEmail(email) ? "Email is invalid" : null;
  if (emailError) {
    return makeHtmlResponse(
      <LoginFrame>
        <EmailInput value={email} error={emailError} />
        <Turnstile siteKey={turnstileSiteKey} />
      </LoginFrame>
    );
  }

  // Reject if Turnstile token is invalid
  const isTurnstileValid = await validateTurnstile({ env, turnstileToken });
  if (!isTurnstileValid) {
    return makeHtmlResponse(
      <LoginFrame>
        <EmailInput value={email} />
        <Turnstile siteKey={turnstileSiteKey} error="Verification failed. Please try again!" />
      </LoginFrame>
    );
  }

  // Look up email in DB and retrieve user (if exists)
  let user = await database.prepare(`SELECT u.id FROM user_emails ue JOIN users u ON ue.user_id = u.id AND ue.email = ? LIMIT 1;`).bind(email).first();

  // Retrieved stored verfication code if present
  const cacheKey = `${CachePrefix.EMAIL_VERIFICATION_CODE}/${email}`;
  let storedCode = await cacheKv.get(cacheKey);

  // Generate a new stored code if not present
  if (!storedCode) {
    storedCode = auth.generateVerificationCode();
    waitUntil(cacheKv.put(cacheKey, storedCode, { expirationTtl: otp_expiry_seconds }));
  }

  // Send verification code email & show the next screen
  if (!userCode) {
    await sendLoginEmail({ env, email, code: storedCode });
    return makeHtmlResponse(
      <LoginFrame formTitle={user ? "Sign In" : "Sign Up"}>
        <EmailInput disabled value={email} />
        {!user && <NameInputs firstName={firstName} lastName={lastName} />}
        <CodeInput autoFocus={user || firstName} />
        <Turnstile siteKey={turnstileSiteKey} />
      </LoginFrame>
    );
  }

  // Compare the entered code with the stored code
  if (userCode?.trim() !== storedCode?.trim()) {
    return makeHtmlResponse(
      <LoginFrame formTitle={user ? "Sign In" : "Sign Up"}>
        <EmailInput disabled value={email} />
        {!user && <NameInputs firstName={firstName} lastName={lastName} />}
        <CodeInput autoFocus={user || firstName} error="Invalid code. Please enter the correct code." />
        <Turnstile siteKey={turnstileSiteKey} />
      </LoginFrame>
    );
  }

  // Register user if required
  if (!user) {
    // Show error if name is not provided
    if (!firstName) {
      return makeHtmlResponse(
        <LoginFrame formTitle="Sign Up">
          <EmailInput disabled value={email} />
          <NameInputs firstName={firstName} lastName={lastName} firstNameError="First name is required." />
          <CodeInput value={userCode} />
          <Turnstile siteKey={turnstileSiteKey} />
        </LoginFrame>
      );
    }

    // Add a row to the users table
    user = await database.prepare(`INSERT INTO users (first_name, last_name) VALUES (?, ?) RETURNING id;`).bind(firstName, lastName).first();
    await database.prepare(`INSERT INTO user_emails (user_id, email) VALUES (?, ?)`).bind(user.id, email).first();
  }

  // Create new session and retrive session token
  const { sessionToken } = await auth.createUserSession({ userId: user.id, database });

  // Delete verification code & expired sessions
  waitUntil(cacheKv.delete(cacheKey));
  waitUntil(auth.deleteExpiredUserSessions({ userId: user.id, database, maxAge: session_expiry_seconds }));

  // Set session token in cookie and redirect to "/"
  return new Response(null, {
    status: 302,
    statusText: "Found",
    headers: { Location: "/", "Set-Cookie": auth.createSessionCookie({ sessionToken, isLocal, maxAge: session_expiry_seconds }) },
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
          Body: { Text: { Data: "Your verification code is " + code }, Html: { Data: "Your verification code is " + code } },
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
