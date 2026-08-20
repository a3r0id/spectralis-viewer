import type { SessionEntry, SessionHeader, SpectralisSession } from "@/types/spectralis";

/** Packed SessionHeader: time_t(8) + in_addr(4) + in_port_t(2) + uint16_t(2). */
export const SESSION_HEADER_SIZE = 16;
/** Packed SessionEntry prefix before payload: time_t(8) + in_addr(4) + uint16_t(2). */
export const SESSION_ENTRY_PREFIX_SIZE = 14;

const PROTOCOL_NAMES: Record<number, string> = {
    1: "ICMP",
    6: "TCP",
    17: "UDP",
    132: "SCTP",
};

export class SpectralisParseError extends Error {
    constructor(message: string) {
        super(message);
        this.name = "SpectralisParseError";
    }
}

/** Format an IPv4 address from a network-order (big-endian) `in_addr.s_addr`. */
export const formatIpv4 = (networkOrder: number): string => {
    const a = (networkOrder >>> 24) & 0xff;
    const b = (networkOrder >>> 16) & 0xff;
    const c = (networkOrder >>> 8) & 0xff;
    const d = networkOrder & 0xff;
    return `${a}.${b}.${c}.${d}`;
};

export const protocolLabel = (protocol: number): string => {
    return PROTOCOL_NAMES[protocol] ?? `IP proto ${protocol}`;
};

export const formatTimestamp = (unixSeconds: number): string => {
    if (!Number.isFinite(unixSeconds) || unixSeconds <= 0) return "—";
    return new Date(unixSeconds * 1000).toLocaleString();
};

export const bytesToHex = (bytes: Uint8Array, maxBytes = 64): string => {
    const slice = bytes.subarray(0, maxBytes);
    const hex = Array.from(slice, (b) => b.toString(16).padStart(2, "0")).join("");
    return bytes.length > maxBytes ? `0x${hex}…` : `0x${hex}`;
};

export const formatByteSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
};

/**
 * Parse a Spectralis `.session.bin` buffer.
 *
 * On-disk layout (little-endian host integers; `in_addr.s_addr` network order):
 *   SessionHeader { time_t, in_addr, in_port_t, uint16_t protocol }
 *   SessionEntry  { time_t, in_addr, uint16_t length, uint8_t payload[length] }*
 */
export const parseSpectralisSession = (buffer: ArrayBuffer, fileName: string): SpectralisSession => {
    if (buffer.byteLength < SESSION_HEADER_SIZE) {
        throw new SpectralisParseError(`File too small for SessionHeader (${buffer.byteLength} < ${SESSION_HEADER_SIZE} bytes).`);
    }

    const view = new DataView(buffer);
    let offset = 0;

    const headerTimestamp = Number(view.getBigInt64(offset, true));
    offset += 8;
    const headerIp = formatIpv4(view.getUint32(offset, false));
    offset += 4;
    // Port is stored in host byte order (LE), not htons network order.
    const headerPort = view.getUint16(offset, true);
    offset += 2;
    const protocol = view.getUint16(offset, true);
    offset += 2;

    const header: SessionHeader = {
        timestamp: headerTimestamp,
        ip: headerIp,
        port: headerPort,
        protocol,
    };

    const entries: SessionEntry[] = [];
    let index = 0;

    while (offset + SESSION_ENTRY_PREFIX_SIZE <= buffer.byteLength) {
        const timestamp = Number(view.getBigInt64(offset, true));
        offset += 8;
        const ip = formatIpv4(view.getUint32(offset, false));
        offset += 4;
        const length = view.getUint16(offset, true);
        offset += 2;

        if (offset + length > buffer.byteLength) {
            throw new SpectralisParseError(
                `Entry #${index} payload truncated: need ${length} bytes at offset ${offset}, file ends at ${buffer.byteLength}.`,
            );
        }

        const payload = new Uint8Array(buffer.slice(offset, offset + length));
        offset += length;

        entries.push({
            id: `${index}-${timestamp}-${ip}`,
            timestamp,
            ip,
            length,
            payload,
        });
        index += 1;
    }

    if (offset !== buffer.byteLength) {
        throw new SpectralisParseError(`Trailing ${buffer.byteLength - offset} byte(s) after last entry.`);
    }

    return { fileName, header, entries };
};

export const readSpectralisFile = async (file: File): Promise<SpectralisSession> => {
    const buffer = await file.arrayBuffer();
    return parseSpectralisSession(buffer, file.name);
};
