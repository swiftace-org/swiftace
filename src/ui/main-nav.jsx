import jsx from "lib/jsx";
import { Avatar } from "./avatar";
import { assert, isObject, isUrlOrPath, undefinedOrNull } from "lib/assertion";

export function MainNav({ currentUser, logoUrl, siteTitle, hideSignIn }) {
  const tag = "MainNav";
  assert({
    tag,
    check: undefinedOrNull(logoUrl) || (typeof logoUrl === "string" && isUrlOrPath(logoUrl)),
    error: "'logoUrl' must be undefined/null or a valid URL or URL path",
    data: { logoUrl },
  });

  assert({
    tag,
    check: undefinedOrNull(siteTitle) || (typeof siteTitle === "string" && siteTitle.length > 0),
    error: "'siteTitle' must be undefined/null or a non-empty string",
    data: { siteTitle },
  });

  assert({
    tag,
    check: undefinedOrNull(hideSignIn) || typeof hideSignIn === "boolean",
    error: "'hideSignIn' must be undefined/null or a boolean",
    data: { hideSignIn },
  });

  return (
    <>
      <header class="main-nav">
        <a href="/">
          <img height="28" class="main-nav-logo" src={logoUrl} alt={siteTitle} />
        </a>
        <nav>
          {currentUser ? (
            <ProfileDropdown currentUser={currentUser} />
          ) : !hideSignIn ? (
            <a class="main-nav-link" href="/login">
              Sign In
            </a>
          ) : null}
        </nav>
      </header>
      <div />
    </>
  );
}

export function ProfileDropdown({ currentUser }) {
  const tag = "ProfileDropdown";
  assert({
    tag,
    check: isObject(currentUser),
    error: "'currentUser' must be an object",
    data: { currentUser },
  });

  return (
    <div class="dropdown right">
      <button>
        <Avatar
          avatar={currentUser.avatar_url}
          firstName={currentUser.first_name}
          lastName={currentUser.last_name}
        />
      </button>
      <ul>
        <li>
          <a class="dropdown-link" href="/settings">
            Settings
          </a>
        </li>
        <li>
          <a class="dropdown-link" href="/logout">
            Sign Out
          </a>
        </li>
        {currentUser.is_admin && (
          <li>
            <a class="dropdown-link" href="/manage">
              Manage
            </a>
          </li>
        )}
      </ul>
    </div>
  );
}
