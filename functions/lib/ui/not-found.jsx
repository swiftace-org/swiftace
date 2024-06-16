import jsx from "lib/utils/jsx";

export const NotFound = () => {
  return (
    <div className="ui-container-sm ui-not-found">
      <header>
        <h1 className="ui-page-heading">Page Not Found</h1>
        <p>Sorry, this page does not exist or is private.</p>
      </header>

      <a className="ui-button" href="/">
        Home
      </a>
    </div>
  );
};
