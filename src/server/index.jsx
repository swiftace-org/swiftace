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
  const name = "Deno";
  const body = (
    <RootLayout>
      <div>Hello, {name}</div>
    </RootLayout>
  );
  console.log(body);
  return await new Response(
    body,
    { headers: { "Content-Type": "text/html" } },
  );
}

export default {
  onRequest,
};
