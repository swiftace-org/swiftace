import { SendEmailCommand } from "@aws-sdk/client-sesv2";
import { MainNav } from "lib/ui/main-nav";
import { RootLayout } from "lib/ui/root-layout";
import { makeHtmlResp, makeSes, safeguard, validateEmail, validateTurnstile } from "lib/utils";
import { generateAuthToken, generateVerificationCode } from "lib/utils/auth";
import jsx from "lib/utils/jsx";

export const onRequestGet = safeguard(async function ({ env }) {
  return makeHtmlResp(<LoginPage env={env} />);
});

export const onRequestPost = safeguard(async function ({ request, env, waitUntil }) {
  const formData = await request.formData();
  const email = formData.get("email")?.trim();
  const turnstileToken = formData.get("cf-turnstile-response");
  const code = formData.get("code");
  const name = formData.get("name");

  // Reject if email is not provided or invalid
  if (!email) return makeHtmlResp(<LoginPage env={env} email={email} emailError="Email is required" />);
  if (!validateEmail(email)) return makeHtmlResp(<LoginPage env={env} email={email} emailError="Email is invalid" />);

  // Reject if Turnstile token is invalid
  const isTurnstileValid = await validateTurnstile({ env, turnstileToken });
  if (!isTurnstileValid) return makeHtmlResp(<LoginPage env={env} email={email} turnstileError="Verification failed. Please try again!" />);

  // Look up email in DB and retrieve user (if exists)
  const user = await env.DB.prepare(`select * from users where email=? limit 1`).bind(email).first();

  // Retrieved stored verfication code if present
  const cacheKey = `EMAIL_VERIFICATION_CODE/${email}`;
  let storedCode = await env.CACHE_KV.get(cacheKey);

  // Generate a new stored code if not present
  if (!storedCode) {
    storedCode = generateVerificationCode();
    waitUntil(env.CACHE_KV.put(cacheKey, storedCode, { expirationTtl: 600 })); // Valid for 10 minutes
  }

  // Send code if not provided by user
  if (!code) {
    // Send verficiation code over email
    await sendLoginEmail({ env, email, code: storedCode });

    // If user is not registered, show expanded form requesting name and verification code
    return makeHtmlResp(<LoginPage env={env} email={email} showCode showName={!user} disableEmail />);
  }

  // Verify code if provided by user
  if (code?.trim() !== storedCode.trim()) {
    // Show error if code is invalid
    return makeHtmlResp(<LoginPage env={env} email={email} showCode codeError="Invalid code. Please enter the correct code." showName={!user} disableEmail />);
  }

  // TODO - Register user if required
  if (!user) {
    // Show error if name is not provided
    if (!name) return makeHtmlResp(<LoginPage env={env} email={email} disableEmail code={code} showCode nameError="Please enter your name." />);

    // TODO - Add rows to the account and profile tables (requires DB write access)
    return makeHtmlResp(<LoginPage env={env} email={email} emailError="Sign up not implemented. Try existing email!" />);
  }

  // Generate JWT token and set cookie
  const authToken = await generateAuthToken({ userId: user.id, env });
  const authCookie = `AUTH_TOKEN=${authToken}; Max-Age=${45 * 24 * 60 * 60}; Path="/"; ${env.LOCAL ? "" : "Secure"}`;

  // Delete stored verification code
  waitUntil(env.CACHE_KV.delete(cacheKey));

  // Set cookie and redirect to dashboard
  return new Response(null, { status: 302, statusText: "Found", headers: { Location: "/", "Set-Cookie": authCookie } });
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

function LoginPage({ env, ...props }) {
  return (
    <RootLayout title="Sign In" description={env.SITE_DESCRIPTION} faviconSrc={env.FAVICON_URL} styles={["ui", "login"]}>
      <MainNav logoSrc={env.LOGO_URL} />
      <LoginForm
        turnstileSiteKey={env.TURNSTILE_SITE_KEY}
        subtitle={env.SITE_TAGLINE}
        privacyPolicyUrl={env.PRIVACY_POLICY_URL}
        termsOfServiceUrl={env.TERMS_OF_SERVICE_URL}
        {...props}
      />
    </RootLayout>
  );
}

function LoginForm({
  subtitle = null,
  email = null,
  emailError = null,
  disableEmail = null,
  code = null,
  showCode = null,
  codeError = null,
  turnstileError = null,
  showName = null,
  nameError = null,
  privacyPolicyUrl = null,
  termsOfServiceUrl = null,
  turnstileSiteKey = null,
}) {
  return (
    <form className="login-form" method="post" action="/login">
      <header>
        <h2>Sign In / Sign Up </h2>
        {subtitle && <p>{subtitle}</p>}
      </header>
      <fieldset>
        <label>
          <div className="ui-form-label">
            <span>Email Address </span>
            {disableEmail && (
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
            value={email}
            required
            readOnly={disableEmail}
            autoFocus={!disableEmail}
          />
        </label>
        {emailError && <div className="ui-form-error">{emailError}</div>}

        {showName && (
          <>
            <label>
              <div className="ui-form-label">Full Name</div>
              <input className="ui-form-input" name="name" type="text" placeholder="Your Name" required />
            </label>
            {nameError && <div className="ui-form-error">{nameError}</div>}
          </>
        )}

        {showCode && (
          <>
            <label>
              <div className="ui-form-label">Verification Code</div>
              <input className="ui-form-input" name="code" type="text" placeholder="6-digit code" required defaultValue={code} autoFocus={!showName} />
            </label>
            {codeError ? <div className="ui-form-error">{codeError}</div> : <div className="ui-form-hint">We've sent a code over email. Please check!</div>}
          </>
        )}

        <label>
          <div className="ui-form-label">Human Verification</div>
          <div className="cf-turnstile" data-sitekey={turnstileSiteKey} data-theme="light" />
        </label>
        {turnstileError && <div className="ui-form-error">{turnstileError}</div>}
      </fieldset>

      <footer>
        <input type="submit" className="ui-button" value="Continue" />
        <p>
          By signing in you agree to our
          <br />
          <a href={privacyPolicyUrl} rel="noopener noreferrer nofollow" target="_blank" className="ui-link">
            privacy policy
          </a>
          {" and "}
          <a href={termsOfServiceUrl} rel="noopener noreferrer nofollow" target="_blank" className="ui-link">
            terms of service
          </a>
          .
        </p>
      </footer>
    </form>
  );
}
