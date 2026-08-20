import type { HostLocation, HostStats, SessionEntry } from "@/types/spectralis";

const isPrivateIp = (ip: string): boolean => {
    const parts = ip.split(".").map(Number);
    if (parts.length !== 4 || parts.some((p) => Number.isNaN(p))) return true;
    const [a, b] = parts;
    if (a === 10) return true;
    if (a === 127) return true;
    if (a === 0) return true;
    if (a === 169 && b === 254) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    if (a >= 224) return true;
    return false;
};

interface IpWhoResponse {
    success?: boolean;
    message?: string;
    ip?: string;
    latitude?: number;
    longitude?: number;
    city?: string;
    region?: string;
    country?: string;
    country_code?: string;
    connection?: { isp?: string; org?: string };
}

const locationCache = new Map<string, HostLocation | null>();

/** Resolve public IPv4 geolocation (cached). Private/reserved addresses return null. */
export const lookupIpLocation = async (ip: string): Promise<HostLocation | null> => {
    if (locationCache.has(ip)) {
        return locationCache.get(ip) ?? null;
    }

    if (isPrivateIp(ip)) {
        locationCache.set(ip, null);
        return null;
    }

    try {
        const response = await fetch(`https://ipwho.is/${encodeURIComponent(ip)}`);
        if (!response.ok) {
            locationCache.set(ip, null);
            return null;
        }

        const data = (await response.json()) as IpWhoResponse;
        if (data.success === false || data.latitude == null || data.longitude == null) {
            locationCache.set(ip, null);
            return null;
        }

        const location: HostLocation = {
            ip,
            lat: data.latitude,
            lon: data.longitude,
            city: data.city,
            region: data.region,
            country: data.country,
            countryCode: data.country_code,
            isp: data.connection?.isp,
            org: data.connection?.org,
        };
        locationCache.set(ip, location);
        return location;
    } catch {
        locationCache.set(ip, null);
        return null;
    }
};

export const aggregateHostStats = (entries: SessionEntry[]): HostStats[] => {
    const byIp = new Map<string, HostStats>();

    for (const entry of entries) {
        const existing = byIp.get(entry.ip);
        if (!existing) {
            byIp.set(entry.ip, {
                ip: entry.ip,
                messageCount: 1,
                totalBytes: entry.length,
                firstSeen: entry.timestamp,
                lastSeen: entry.timestamp,
            });
            continue;
        }

        existing.messageCount += 1;
        existing.totalBytes += entry.length;
        existing.firstSeen = Math.min(existing.firstSeen, entry.timestamp);
        existing.lastSeen = Math.max(existing.lastSeen, entry.timestamp);
    }

    return [...byIp.values()].sort((a, b) => b.messageCount - a.messageCount);
};

export const enrichHostStats = async (stats: HostStats[]): Promise<HostStats[]> => {
    const enriched = await Promise.all(
        stats.map(async (host) => ({
            ...host,
            location: await lookupIpLocation(host.ip),
        })),
    );
    return enriched;
};
