import webserver from "infra/webserver";

function extractFromRequest(request) {
  let realIp;

  if (request instanceof Request) {
    // edge runtime
    realIp = webserver.isServerlessRuntime
      ? request.headers.get("x-vercel-proxied-for")?.split(", ").at(-1) // Vercel
      : request.headers.get("x-forwarded-for")?.split(", ").at(-1); // remote development
  } else {
    // node runtime
    realIp = webserver.isServerlessRuntime
      ? request.headers["x-vercel-proxied-for"]?.split(", ").at(-1) // Vercel
      : request.headers["x-forwarded-for"]?.split(", ").at(-1); // remote development
  }

  if (!realIp) {
    // local development
    realIp = request.socket?.remoteAddress || "127.0.0.1";
  }

  if (!webserver.isServerlessRuntime) {
    // Localhost loopback in IPv6
    if (realIp === "::1") {
      realIp = "127.0.0.1";
    }

    // IPv4-mapped IPv6 addresses
    if (realIp.substr(0, 7) == "::ffff:") {
      realIp = realIp.substr(7);
    }
  }

  return realIp;
}

export default {
  extractFromRequest,
};
