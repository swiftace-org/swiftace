import jsx from "lib/utils/jsx";
import { Avatar } from "./avatar";

export function MainNav({ currentUser = null, logoUrl = null, siteTitle = null, hideSignIn = false }) {
  return (
    <>
      <header className="UI-Main-Nav">
        <a href="/">
          <img height="28" className="ui-main-nav-logo" src={logoUrl} alt={siteTitle} />
        </a>
        <nav>
          {currentUser ? (
            <ProfileDropdown currentUser={currentUser} />
          ) : !hideSignIn ? (
            <a className="ui-main-nav-link" href="/login">
              Sign In
            </a>
          ) : null}
        </nav>
      </header>
      <div className="ui-main-nav-spacer" />
    </>
  );
}

/**
 * A dropdown component for user profile actions.
 *
 * @component
 * @param {Object} props - The component props.
 * @param {Object} props.currentUser - The current user object.
 * @param {string} props.currentUser.avatar_url - URL of the user's avatar image.
 * @param {string} props.currentUser.first_name - User's first name.
 * @param {string} props.currentUser.last_name - User's last name.
 * @param {boolean} props.currentUser.is_admin - Whether the user has admin privileges.
 *
 * @returns {JSX.Element} A dropdown menu with user avatar and action links.
 *
 * @example
 * const user = {
 *   avatar_url: 'https://example.com/avatar.jpg',
 *   first_name: 'John',
 *   last_name: 'Doe',
 *   is_admin: true
 * };
 *
 * return (
 *   <ProfileDropdown currentUser={user} />
 * );
 */
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
