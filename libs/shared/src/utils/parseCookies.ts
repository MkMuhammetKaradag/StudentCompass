export function parseCookies(cookieString: string): Record<string, string> {
  if (!cookieString) return {};

  return cookieString.split(';').reduce(
    (cookies, cookie) => {
      const [name, value] = cookie.trim().split('=');
      cookies[name] = decodeURIComponent(value);
      return cookies;
    },
    {} as Record<string, string>,
  );
}
