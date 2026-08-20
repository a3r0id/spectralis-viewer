export interface SessionHeader {
    /** Unix timestamp (seconds) when the session was opened. */
    timestamp: number;
    /** Honeypot listener IP (IPv4 dotted quad). */
    ip: string;
    /** Honeypot listener port. */
    port: number;
    /** IP protocol number (e.g. 6 = TCP, 17 = UDP). */
    protocol: number;
}

export interface SessionEntry {
    /** Stable row id for tables. */
    id: string;
    /** Unix timestamp (seconds) for this message. */
    timestamp: number;
    /** Remote host IPv4. */
    ip: string;
    /** Payload length in bytes. */
    length: number;
    /** Raw message bytes. */
    payload: Uint8Array;
}

export interface SpectralisSession {
    fileName: string;
    header: SessionHeader;
    entries: SessionEntry[];
}

export interface HostLocation {
    ip: string;
    lat: number;
    lon: number;
    city?: string;
    region?: string;
    country?: string;
    countryCode?: string;
    isp?: string;
    org?: string;
}

export interface HostStats {
    ip: string;
    messageCount: number;
    totalBytes: number;
    firstSeen: number;
    lastSeen: number;
    location?: HostLocation | null;
}
