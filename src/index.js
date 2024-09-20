async function onRequest(request) {
  return new Response("Hello, world");
}

export default { fetch: onRequest };
