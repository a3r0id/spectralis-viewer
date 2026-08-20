/**
 * Quick sanity check for Spectralis binary packing / parsing.
 * Run: node scripts/verify-spectralis-parser.mjs
 */
import { readFileSync, writeFileSync, unlinkSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));

const formatIpv4 = (networkOrder) => {
    const a = (networkOrder >>> 24) & 0xff;
    const b = (networkOrder >>> 16) & 0xff;
    const c = (networkOrder >>> 8) & 0xff;
    const d = networkOrder & 0xff;
    return `${a}.${b}.${c}.${d}`;
};

const writeIpv4 = (view, offset, ip) => {
    const [a, b, c, d] = ip.split(".").map(Number);
    view.setUint32(offset, ((a << 24) | (b << 16) | (c << 8) | d) >>> 0, false);
};

const encodeSession = () => {
    const enc = new TextEncoder();
    const payloads = [enc.encode("hello"), enc.encode("world!!"), enc.encode("x")];
    const hosts = ["8.8.8.8", "1.1.1.1", "8.8.8.8"];
    const size = 16 + payloads.reduce((sum, p) => sum + 14 + p.length, 0);
    const buf = new ArrayBuffer(size);
    const view = new DataView(buf);
    let o = 0;

    view.setBigInt64(o, 1700000000n, true);
    o += 8;
    writeIpv4(view, o, "203.0.113.10");
    o += 4;
    view.setUint16(o, 102, true);
    o += 2;
    view.setUint16(o, 6, true);
    o += 2;

    payloads.forEach((payload, i) => {
        view.setBigInt64(o, BigInt(1700000000 + i * 10), true);
        o += 8;
        writeIpv4(view, o, hosts[i]);
        o += 4;
        view.setUint16(o, payload.length, true);
        o += 2;
        new Uint8Array(buf, o, payload.length).set(payload);
        o += payload.length;
    });

    return new Uint8Array(buf);
};

const parseSession = (bytes) => {
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    let o = 0;
    const header = {
        timestamp: Number(view.getBigInt64(o, true)),
        ip: formatIpv4(view.getUint32((o += 8), false)),
        port: view.getUint16((o += 4), true),
        protocol: view.getUint16((o += 2), true),
    };
    o += 2;

    const entries = [];
    while (o + 14 <= bytes.byteLength) {
        const timestamp = Number(view.getBigInt64(o, true));
        o += 8;
        const ip = formatIpv4(view.getUint32(o, false));
        o += 4;
        const length = view.getUint16(o, true);
        o += 2;
        const payload = bytes.subarray(o, o + length);
        o += length;
        entries.push({
            timestamp,
            ip,
            length,
            text: new TextDecoder().decode(payload),
        });
    }

    if (o !== bytes.byteLength) throw new Error(`Trailing bytes: ${bytes.byteLength - o}`);
    return { header, entries };
};

const sample = encodeSession();
const outPath = join(__dirname, "sample.spectralis.session.bin");
writeFileSync(outPath, sample);
const parsed = parseSession(readFileSync(outPath));
unlinkSync(outPath);

const uniqueHosts = new Set(parsed.entries.map((e) => e.ip));
console.log(
    JSON.stringify(
        {
            ok: parsed.header.ip === "203.0.113.10" && parsed.header.port === 102 && parsed.entries.length === 3 && uniqueHosts.size === 2,
            header: parsed.header,
            entries: parsed.entries,
            uniqueHosts: [...uniqueHosts],
        },
        null,
        2,
    ),
);
