/**
 * Best-effort country resolution from an IP address.
 *
 * The default implementation returns null: shipping a MaxMind GeoLite2 database
 * requires a license key and a large binary file, which would make the repo
 * harder to clone and run. To enable real geolocation, plug a MaxMind reader
 * here (e.g. the `maxmind` package against a GeoLite2-Country.mmdb) behind an
 * env flag. Demo analytics data is provided by the seed script.
 */
export function resolveCountry(_ip: string): Promise<string | null> {
  return Promise.resolve(null);
}
