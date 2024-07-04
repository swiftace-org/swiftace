import jsx from "lib/utils/jsx";

export const NotFound = ({ currentUser = null }) => {
  return (
    <div className="container small">
      <header className="page-header">
        <h1 className="page-heading">Page Not Found</h1>
        <p className="page-subheading">Sorry, this page does not exist or is private.</p>
      </header>
      <section className="page-section">
        <div className="button-row">
          <a className="button wide" href="/">
            Home
          </a>
          {!currentUser && (
            <a className="button outline wide" href="/login">
              Sign In
            </a>
          )}
        </div>
      </section>
    </div>
  );
};
