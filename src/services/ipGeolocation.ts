/**
 * IP Geolocation Service
 * Fetches geographic and network information for IP addresses
 * Used to populate ASN, continent, and other metadata for proxy nodes
 */

import { CONTINENT_MAP } from '../server/database.js';

export interface IPGeoData {
  ip: string;
  country: string;
  countryCode: string;
  continent: string;
  region?: string;
  city?: string;
  latitude?: number;
  longitude?: number;
  timezone?: string;
  isp?: string;
  asn?: number;
  asnOrg?: string;
  connectionType?: 'residential' | 'mobile' | 'datacenter' | 'isp';
  isVpn?: boolean;
  isProxy?: boolean;
  isDatacenter?: boolean;
}

// Cache for IP lookups (1 hour TTL)
const geoCache = new Map<string, { data: IPGeoData; timestamp: number }>();
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

/**
 * Lookup IP geolocation and network info
 * Uses multiple free APIs with fallback
 */
export async function lookupIP(ip: string): Promise<IPGeoData | null> {
  // Check cache first
  const cached = geoCache.get(ip);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.data;
  }

  // Try multiple providers with fallback
  const providers = [
    () => lookupIPApi(ip),
    () => lookupIPInfo(ip),
    () => lookupIPData(ip),
  ];

  for (const provider of providers) {
    try {
      const data = await provider();
      if (data) {
        geoCache.set(ip, { data, timestamp: Date.now() });
        return data;
      }
    } catch (error) {
      // Continue to next provider
      console.warn('[IPGeolocation] Provider failed:', error);
    }
  }

  return null;
}

/**
 * IP-API.com (free, no key needed, 45 req/min)
 */
async function lookupIPApi(ip: string): Promise<IPGeoData | null> {
  const response = await fetch(
    `http://ip-api.com/json/${ip}?fields=status,country,countryCode,region,regionName,city,lat,lon,timezone,isp,as,asname,mobile,proxy,hosting`,
    { signal: AbortSignal.timeout(5000) }
  );

  if (!response.ok) return null;

  const data = await response.json();
  if (data.status !== 'success') return null;

  // Parse ASN from "as" field (format: "AS12345 Company Name")
  let asn: number | undefined;
  let asnOrg: string | undefined;
  if (data.as) {
    const match = data.as.match(/^AS(\d+)\s*(.*)$/);
    if (match) {
      asn = parseInt(match[1], 10);
      asnOrg = match[2] || data.asname;
    }
  }

  // Determine connection type
  let connectionType: 'residential' | 'mobile' | 'datacenter' | 'isp' = 'residential';
  if (data.hosting) connectionType = 'datacenter';
  else if (data.mobile) connectionType = 'mobile';
  else if (data.proxy) connectionType = 'datacenter'; // VPN/proxy usually datacenter

  const countryCode = data.countryCode || 'US';
  const continent = CONTINENT_MAP[countryCode] || 'NA';

  return {
    ip,
    country: data.country || 'Unknown',
    countryCode,
    continent,
    region: data.regionName,
    city: data.city,
    latitude: data.lat,
    longitude: data.lon,
    timezone: data.timezone,
    isp: data.isp,
    asn,
    asnOrg,
    connectionType,
    isVpn: data.proxy,
    isProxy: data.proxy,
    isDatacenter: data.hosting,
  };
}

/**
 * IPInfo.io (free tier: 50k req/month)
 */
async function lookupIPInfo(ip: string): Promise<IPGeoData | null> {
  const response = await fetch(
    `https://ipinfo.io/${ip}/json`,
    { signal: AbortSignal.timeout(5000) }
  );

  if (!response.ok) return null;

  const data = await response.json();
  if (data.bogon) return null; // Private/reserved IP

  // Parse ASN from "org" field (format: "AS12345 Company Name")
  let asn: number | undefined;
  let asnOrg: string | undefined;
  if (data.org) {
    const match = data.org.match(/^AS(\d+)\s*(.*)$/);
    if (match) {
      asn = parseInt(match[1], 10);
      asnOrg = match[2];
    }
  }

  // Parse coordinates
  let latitude: number | undefined;
  let longitude: number | undefined;
  if (data.loc) {
    const [lat, lon] = data.loc.split(',').map(Number);
    latitude = lat;
    longitude = lon;
  }

  const countryCode = data.country || 'US';
  const continent = CONTINENT_MAP[countryCode] || 'NA';

  return {
    ip,
    country: countryCode, // IPInfo only returns code
    countryCode,
    continent,
    region: data.region,
    city: data.city,
    latitude,
    longitude,
    timezone: data.timezone,
    isp: asnOrg,
    asn,
    asnOrg,
    connectionType: 'residential', // IPInfo free doesn't provide this
  };
}

/**
 * IP-Data.co (free tier: 1500 req/day)
 */
async function lookupIPData(ip: string): Promise<IPGeoData | null> {
  const response = await fetch(
    `https://api.ipdata.co/${ip}?api-key=test`, // "test" key for limited free access
    { signal: AbortSignal.timeout(5000) }
  );

  if (!response.ok) return null;

  const data = await response.json();

  const countryCode = data.country_code || 'US';
  const continent = CONTINENT_MAP[countryCode] || 'NA';

  // Determine connection type from threat data
  let connectionType: 'residential' | 'mobile' | 'datacenter' | 'isp' = 'residential';
  if (data.threat?.is_datacenter) connectionType = 'datacenter';
  else if (data.carrier?.name) connectionType = 'mobile';

  return {
    ip,
    country: data.country_name || 'Unknown',
    countryCode,
    continent,
    region: data.region,
    city: data.city,
    latitude: data.latitude,
    longitude: data.longitude,
    timezone: data.time_zone?.name,
    isp: data.asn?.name,
    asn: data.asn?.asn ? parseInt(data.asn.asn.replace('AS', ''), 10) : undefined,
    asnOrg: data.asn?.name,
    connectionType,
    isVpn: data.threat?.is_vpn,
    isProxy: data.threat?.is_proxy,
    isDatacenter: data.threat?.is_datacenter,
  };
}

/**
 * Batch lookup multiple IPs
 */
export async function lookupIPs(ips: string[]): Promise<Map<string, IPGeoData>> {
  const results = new Map<string, IPGeoData>();

  // Process in batches of 10 to avoid rate limits
  const batchSize = 10;
  for (let i = 0; i < ips.length; i += batchSize) {
    const batch = ips.slice(i, i + batchSize);
    const lookups = batch.map(async (ip) => {
      const data = await lookupIP(ip);
      if (data) {
        results.set(ip, data);
      }
    });

    await Promise.all(lookups);

    // Small delay between batches to respect rate limits
    if (i + batchSize < ips.length) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  return results;
}

/**
 * Check if an IP is likely residential (not datacenter/VPN)
 */
export async function isResidentialIP(ip: string): Promise<boolean> {
  const data = await lookupIP(ip);
  if (!data) return false;

  return !data.isDatacenter && !data.isVpn && !data.isProxy;
}

/**
 * Get ASN info for an IP
 */
export async function getASNInfo(ip: string): Promise<{ asn: number; org: string } | null> {
  const data = await lookupIP(ip);
  if (!data || !data.asn) return null;

  return {
    asn: data.asn,
    org: data.asnOrg || 'Unknown',
  };
}

/**
 * Clear the geo cache
 */
export function clearGeoCache(): void {
  geoCache.clear();
}

/**
 * Get cache stats
 */
export function getGeoCacheStats(): { size: number; hitRate: number } {
  return {
    size: geoCache.size,
    hitRate: 0, // Would need to track hits/misses for accurate rate
  };
}

// Known datacenter ASNs (used for classification)
export const DATACENTER_ASNS = new Set([
  // Major cloud providers
  16509, // Amazon
  14618, // Amazon
  8075, // Microsoft
  15169, // Google
  396982, // Google Cloud
  13335, // Cloudflare
  20940, // Akamai
  16276, // OVH
  24940, // Hetzner
  14061, // DigitalOcean
  63949, // Linode
  20473, // Vultr
  // VPN providers
  9009, // M247 (VPN infrastructure)
  174, // Cogent (often used by VPNs)
  // Hosting providers
  46606, // Unified Layer
  26496, // GoDaddy
  33070, // Rackspace
  19994, // Rackspace
]);

// Known residential ISP ASNs (for validation)
export const RESIDENTIAL_ASNS = new Set([
  // US ISPs
  7922, // Comcast
  20001, // Charter/Spectrum
  22773, // Cox
  7018, // AT&T
  701, // Verizon
  // UK ISPs
  5089, // Virgin Media
  2856, // BT
  6871, // Sky
  // European ISPs
  3320, // Deutsche Telekom
  12322, // Free (France)
  3215, // Orange (France)
  // Add more as needed
]);

/**
 * Classify an ASN as residential, datacenter, or mobile
 */
export function classifyASN(asn: number): 'residential' | 'datacenter' | 'mobile' | 'unknown' {
  if (DATACENTER_ASNS.has(asn)) return 'datacenter';
  if (RESIDENTIAL_ASNS.has(asn)) return 'residential';
  // Could add mobile carrier ASNs here
  return 'unknown';
}
