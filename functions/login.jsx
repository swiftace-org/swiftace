import { MainNav } from "lib/ui/main-nav";
import { RootLayout } from "lib/ui/root-layout";
import { makeHtmlResp, safeguard } from "lib/utils";
import jsx from "lib/utils/jsx";

export const onRequestGet = safeguard(async function ({ env }) {
  return makeHtmlResp(
    <RootLayout title="Sign In" description={env.SITE_DESCRIPTION} faviconSrc={env.FAVICON_URL} styles={["ui", "login"]}>
      <MainNav logoSrc={env.LOGO_URL} />
      <LoginForm subtitle={env.SITE_TAGLINE} privacyPolicyUrl={env.PRIVACY_POLICY_URL} termsOfServiceUrl={env.TERMS_OF_SERVICE_URL} />
    </RootLayout>
  );
});

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
          <div className="cf-turnstile" data-sitekey="0x4AAAAAAAR15yk00ygFtc-o" data-theme="light" />
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
