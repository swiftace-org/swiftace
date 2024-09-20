import jsx from "../lib/jsx.js";
import { makeHtmlResponse } from "../lib/response.js";

export async function onGetHome(request) {
  return makeHtmlResponse(<HomePage />);
}

function HomePage() {
  return <div>Hello, world</div>;
}
