/**
 * www.decentralschool.org → decentralschool.org, path and query kept. Its own small Worker
 * (wrangler.www.jsonc) so the main site never runs code for static files. Sign-in cookies
 * belong to the bare domain, so a sign-in started on www could never finish.
 */
export default {
  fetch(request) {
    const url = new URL(request.url);
    url.hostname = "decentralschool.org";
    return Response.redirect(url.toString(), 301);
  },
} satisfies ExportedHandler;
