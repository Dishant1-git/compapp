import dns from "node:dns";

const PUBLIC_DNS = ["1.1.1.1", "8.8.8.8"];
const SRV = "mongodb+srv://";

/** "querySrv ECONNREFUSED …" and friends: the lookup failed, not the database. */
function isDnsLookupError(error: unknown) {
  const syscall = (error as { syscall?: unknown } | null)?.syscall;
  return typeof syscall === "string" && syscall.startsWith("query");
}

/**
 * Do the mongodb+srv:// lookup ourselves and return the plain mongodb:// address it
 * stands for: the hosts from the SRV record, plus the options from the TXT record.
 * Uses its own resolver on public DNS servers, so it doesn't depend on Node's default one.
 */
async function resolveSrvUri(uri: string) {
  const url = new URL(uri);
  const resolver = new dns.promises.Resolver();
  resolver.setServers(PUBLIC_DNS);

  const [hosts, txt] = await Promise.all([
    resolver.resolveSrv(`_mongodb._tcp.${url.hostname}`),
    resolver.resolveTxt(url.hostname).catch(() => [] as string[][]),
  ]);
  if (!hosts.length) throw new Error(`No database servers found for ${url.hostname}`);

  // Options in the address itself win over the ones Atlas publishes; srv implies TLS.
  const options = new URLSearchParams(txt.map((chunks) => chunks.join("")).join("&"));
  for (const [key, value] of url.searchParams) options.set(key, value);
  if (!options.has("tls") && !options.has("ssl")) options.set("tls", "true");

  const login = url.username ? `${url.username}${url.password ? `:${url.password}` : ""}@` : "";
  const servers = hosts.map((h) => `${h.name}:${h.port}`).join(",");
  return `mongodb://${login}${servers}${url.pathname || "/"}?${options}`;
}

/**
 * Connect to the database, working around "querySrv ECONNREFUSED".
 *
 * A mongodb+srv:// address needs a DNS SRV lookup, which Node does itself rather than
 * through the operating system. On some Windows networks (the router is only announced
 * as an IPv6 link-local resolver) Node finds no usable DNS server, falls back to
 * 127.0.0.1 and the lookup is refused. Pointing Node's default resolver at other servers
 * (dns.setServers) does not repair it inside the Next.js server, so when the lookup
 * fails we look the address up with a resolver of our own and connect to the result.
 */
export async function withSrvDnsFallback<T>(uri: string, connect: (uri: string) => Promise<T>): Promise<T> {
  try {
    return await connect(uri);
  } catch (error) {
    if (!uri.startsWith(SRV) || !isDnsLookupError(error)) throw error;
    let resolved: string;
    try {
      resolved = await resolveSrvUri(uri);
    } catch {
      throw error; // no internet at all: the original message is the useful one
    }
    return connect(resolved);
  }
}
