import jsx from "lib/utils/jsx";

export const NotFound = ({ currentUser = null }) => {
  return (
    <div className="container small">
      <header className="UI-Page-Header">
        <h1 className="UI-Page-Heading">Page Not Found</h1>
        <p className="UI-Page-Subheading">Sorry, this page does not exist or is private.</p>
      </header>
      <section className="UI-Page-Section button-row">
        <a className="button wide" href="/">
          Home
        </a>
        {!currentUser && (
          <a className="button outline wide" href="/login">
            Sign In
          </a>
        )}
      </section>
    </div>
  );
};
