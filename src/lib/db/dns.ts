import dns from "node:dns";

/**
 * A mongodb+srv:// address needs a DNS SRV lookup, which Node does itself rather than
 * through the operating system. On some Windows networks (the router is only announced
 * as an IPv6 link-local resolver) Node finds no usable DNS server, falls back to
 * 127.0.0.1 and fails with "querySrv ECONNREFUSED". Only then, use public resolvers.
 */
export function ensureSrvDns() {
  const loopbackOnly = dns.getServers().every((s) => s === "127.0.0.1" || s === "::1");
  if (loopbackOnly) dns.setServers(["1.1.1.1", "8.8.8.8"]);
}
