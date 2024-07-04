import jsx from "lib/utils/jsx";
import { Avatar } from "./avatar";

export function MainNav({ currentUser = null, logoUrl = null, siteTitle = null, hideSignIn = false }) {
  return (
    <>
      <header className="main-nav">
        <a href="/">
          <img height="28" className="main-nav-logo" src={logoUrl} alt={siteTitle} />
        </a>
        <nav>
          {currentUser ? (
            <ProfileDropdown currentUser={currentUser} />
          ) : !hideSignIn ? (
            <a className="main-nav-link" href="/login">
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
    <div className="dropdown right">
      <button>
        <Avatar
          avatar={currentUser.avatar_url}
          firstName={currentUser.first_name}
          lastName={currentUser.last_name}
        />
      </button>
      <ul>
        <li>
          <a className="dropdown-link" href="/settings">
            Settings
          </a>
        </li>
        <li>
          <a className="dropdown-link" href="/logout">
            Sign Out
          </a>
        </li>
        {currentUser.is_admin && (
          <li>
            <a className="dropdown-link" href="/manage">
              Manage
            </a>
          </li>
        )}
      </ul>
    </div>
  );
}
