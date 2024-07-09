import jsx from "lib/utils/jsx";
import { Avatar } from "./avatar";

export function MainNav({ currentUser = null, logoUrl = null, siteTitle = null, hideSignIn = false }) {
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
