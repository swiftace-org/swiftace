import { SendEmailCommand } from "@aws-sdk/client-sesv2";
import { MainNav } from "lib/ui/main-nav";
import { RootLayout } from "lib/ui/root-layout";
import { makeHtmlResp, makeSes, safeguard, validateEmail, validateTurnstile } from "lib/utils";
import { createSessionCookie, createUserSession, deleteExpiredUserSessions, generateVerificationCode, getCurrentUser, hashSessionToken } from "lib/utils/auth";
import jsx from "lib/utils/jsx";

export const onRequestGet = safeguard(async function ({ request, env }) {
  const currentUser = await getCurrentUser({ request, env });
  if (currentUser) {
    return new Response(null, { status: 302, statusText: "Found", headers: { Location: "/" } });
  }
  return makeHtmlResp(<LoginPage env={env} />);
});

export const onRequestPost = safeguard(async function ({ request, env, waitUntil }) {
  const formData = await request.formData();
  const email = formData.get("email")?.trim();
  const turnstileToken = formData.get("cf-turnstile-response");
  const code = formData.get("code");
  const firstName = formData.get("first_name")?.trim();
  const lastName = formData.get("last_name")?.trim();

  // Reject if email is not provided or invalid
  if (!email) return makeHtmlResp(<LoginPage env={env} errors={{ email: "Email is required." }} />);
  if (!validateEmail(email)) return makeHtmlResp(<LoginPage env={env} values={{ email }} errors={{ email: "Email is invalid." }} />);

  // Reject if Turnstile token is invalid
  const isTurnstileValid = await validateTurnstile({ env, turnstileToken });
  if (!isTurnstileValid) return makeHtmlResp(<LoginPage env={env} values={{ email }} errors={{ turnstile: "Verification failed. Please try again!" }} />);

  // Look up email in DB and retrieve user (if exists)
  let user = await env.DB.prepare(`SELECT u.id FROM user_emails ue JOIN users u ON ue.user_id = u.id AND ue.email = ? LIMIT 1;`).bind(email).first();

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
    return makeHtmlResp(<LoginPage env={env} values={{ email }} showCode showName={!user} disableEmail />);
  }

  // Verify code if provided by user
  if (code?.trim() !== storedCode.trim()) {
    // Show error if code is invalid
    return makeHtmlResp(
      <LoginPage
        env={env}
        values={{ email, firstName, lastName }}
        errors={{ code: "Invalid code. Please enter the correct code." }}
        showCode
        showName={!user}
        disableEmail
      />
    );
  }

  // Register user if required
  if (!user) {
    // Show error if name is not provided
    if (!firstName)
      return makeHtmlResp(
        <LoginPage env={env} values={{ email, code, firstName, lastName }} errors={{ firstName: "First name is required." }} disableEmail showCode />
      );

    // Add a row to the users table
    user = await env.DB.prepare(`INSERT INTO users (first_name, last_name) VALUES (?, ?) RETURNING id;`).bind(firstName, lastName).first();
    await env.DB.prepare(`INSERT INTO user_emails (user_id, email) VALUES (?, ?)`).bind(user.id, email).first();
  }

  // Create new session and retrive session token
  const { sessionToken } = await createUserSession({ userId: user.id, env });

  // Delete verification code & expired sessions
  waitUntil(env.CACHE_KV.delete(cacheKey));
  waitUntil(deleteExpiredUserSessions({ userId: user.id, env }));

  // Set session token in cookie and redirect to "/"
  return new Response(null, { status: 302, statusText: "Found", headers: { Location: "/", "Set-Cookie": createSessionCookie({ env, sessionToken }) } });
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
      <MainNav logoSrc={env.LOGO_URL} hideSignIn />
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
  values = null,
  errors = null,
  showName = null,
  showCode = null,
  disableEmail = null,
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
        <EmailInput disabled={disableEmail} value={values?.email} error={errors?.email} />
        <NameInputs show={showName} firstName={values?.firstName} lastName={values?.lastName} errors={errors} />
        <CodeInput show={showCode} value={values?.code} autoFocus={!showName || values?.firstName} error={errors?.code} />
        <Turnstile error={errors?.turnstile} siteKey={turnstileSiteKey} />
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

function NameInputs({ show, firstName, lastName, errors }) {
  return (
    show && (
      <>
        <label>
          <div className="ui-form-label">First Name</div>
          <input className="ui-form-input" value={firstName} name="first_name" type="text" placeholder="Your First Name" required autoFocus={!firstName} />
        </label>
        {errors?.firstName && <div className="ui-form-error">{errors?.firstName}</div>}
        <label>
          <div className="ui-form-label">Last Name</div>
          <input className="ui-form-input" value={lastName} name="last_name" type="text" placeholder="Your Last Name" />
        </label>
        {errors?.lastName && <div className="ui-form-error">{errors?.lastName}</div>}
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
