import "dotenv/config";

const LOCAL_CLIENT_URLS = ["http://localhost:3000", "http://127.0.0.1:3000"];

const stripTrailingSlashes = (value) => value.replace(/\/+$/, "");

const parseList = (value) =>
  (value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
    .map(stripTrailingSlashes);

export const isProduction =
  process.env.NODE_ENV === "production" || process.env.VERCEL === "1";

/**
 * Browser origins that are allowed to call this API with cookies.
 * Set CLIENT_URLS in Vercel, e.g.
 * CLIENT_URLS=https://my-client.vercel.app,https://www.example.com
 */
export const allowedOrigins = [
  ...new Set([
    ...parseList(process.env.CLIENT_URLS || process.env.CLIENT_URL),
    ...(isProduction ? [] : LOCAL_CLIENT_URLS),
  ]),
];

const escapeRegExp = (value) => value.replace(/[.+?^${}()|[\]\\]/g, "\\$&");

const toOriginMatcher = (pattern) => {
  if (!pattern.includes("*")) {
    return (origin) => origin === pattern;
  }

  const regex = new RegExp(
    `^${pattern.split("*").map(escapeRegExp).join(".*")}$`,
    "i"
  );

  return (origin) => regex.test(origin);
};

const originMatchers = allowedOrigins.map(toOriginMatcher);

export function isOriginAllowed(origin) {
  if (!origin) return true;

  const normalizedOrigin = stripTrailingSlashes(origin);

  return originMatchers.some((matches) => matches(normalizedOrigin));
}

function resolveBaseURL() {
  const explicit = process.env.BETTER_AUTH_URL?.trim();

  if (explicit) {
    const pointsToLocalhost = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?/i.test(
      explicit
    );

    if (!isProduction || !pointsToLocalhost) {
      return stripTrailingSlashes(explicit);
    }

    console.warn(
      "[config] BETTER_AUTH_URL points to localhost in production. Falling back to the Vercel URL."
    );
  }

  const vercelHost =
    process.env.VERCEL_ENV === "production"
      ? process.env.VERCEL_PROJECT_PRODUCTION_URL || process.env.VERCEL_URL
      : process.env.VERCEL_URL ||
        process.env.VERCEL_PROJECT_PRODUCTION_URL;

  if (vercelHost) {
    return `https://${stripTrailingSlashes(vercelHost)}`;
  }

  return `http://localhost:${process.env.PORT || 5000}`;
}

export const baseURL = resolveBaseURL();

function getOrigin(value) {
  try {
    return new URL(value).origin;
  } catch {
    return stripTrailingSlashes(value);
  }
}

export const trustedOrigins = [
  ...new Set([...allowedOrigins, getOrigin(baseURL)]),
];

if (isProduction && allowedOrigins.length === 0) {
  console.warn(
    "[config] CLIENT_URLS is not set. Browser requests from the deployed client will be blocked by CORS."
  );
}
