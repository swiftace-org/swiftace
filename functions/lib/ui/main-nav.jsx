import jsx from "lib/utils/jsx";
import { Avatar } from "./avatar";
import { DEFAULT_LOGO_SRC } from "lib/utils/constants";

export function MainNav({ currentUser = null, logoSrc = DEFAULT_LOGO_SRC, siteTitle = null }) {
  return (
    <>
      <header className="ui-main-nav">
        <a href="/">
          <img height="28" className="ui-main-nav-logo" src={logoSrc} alt={siteTitle} />
        </a>
        <nav>
          {currentUser ? (
            <ProfileDropdown currentUser={currentUser} />
          ) : (
            <a className="ui-main-nav-link" href="/login">
              Sign In
            </a>
          )}
        </nav>
      </header>
      <div />
    </>
  );
}

function ProfileDropdown({ currentUser }) {
  return (
    <div className="ui-dropdown">
      <button>
        <Avatar avatar={currentUser.avatar} username={currentUser.username} name={currentUser.name} />
      </button>
      <ul>
        <li>
          <a href="/aakashns">Profile</a>
        </li>
        <li>
          <a href="/settings">Settings</a>
        </li>
        <li>
          <a href="/logout">Sign Out</a>
        </li>
      </ul>
    </div>
  );
}
