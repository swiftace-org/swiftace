import render from "shared/jsx/render/mod.js";

function RootLayout({ children }) {
  return (
    <html>
      <body>
        {children}
      </body>
    </html>
  );
}

async function onRequest(_request) {
  const name = "Deno <div>Hello</div>";
  const body = (
    <RootLayout>
      <div class="container">Hello, {name}</div>
    </RootLayout>
  );
  // console.log(body);
  const bodyStr = render.jsxToStr(body);
  // console.log(bodyStr);
  return await new Response(
    bodyStr,
    { headers: { "Content-Type": "text/html" } },
  );
}

export default {
  onRequest,
};
