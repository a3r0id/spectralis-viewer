# Spectralis Honeypot Viewer

A browser-based dashboard for inspecting Spectralis honeypot session files. Files
are parsed locally so captured payloads do not need to be uploaded to a server.

<img width="2556" height="1223" alt="image" src="https://github.com/user-attachments/assets/f4a59971-f778-43c0-bb16-a92d7c6ed910" />

<img width="2556" height="1227" alt="image" src="https://github.com/user-attachments/assets/5b940b38-1725-4a8c-8f95-21ac4e89a843" />


## Features

- Open `.spectralis.session.bin` files by selecting or dropping them
- Browse, sort, and paginate captured session messages
- Inspect message timestamps, source IPs, lengths, and hexadecimal payloads
- Aggregate message and byte counts by unique host
- Geolocate public IP addresses and plot them on an interactive map
- Search for places, display their geometry, and fit the map to their bounds
- Light and dark theme support

## Requirements

- Node.js 20 or newer
- npm
- A modern browser with WebGL support
- Internet access for map tiles, place search, and public-IP geolocation

## Getting started

```bash
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

To create and preview a production build:

```bash
npm run build
npm run preview
```

## Usage

1. Click **Upload** and select a Spectralis session binary.
2. Use **List** to inspect individual messages.
3. Use **Analyze** to review host statistics and mapped locations.
4. Search the map for a place to display its geometry and zoom to it.

Selecting another file replaces the current session. Private, reserved, or
unresolved IP addresses remain in the host statistics but are not plotted.

## Session file format

The viewer expects one packed session header followed by zero or more entries:

```c
struct SessionHeader {
    time_t timestamp;
    in_addr ip;
    in_port_t port;
    uint16_t protocol;
};

struct SessionEntry {
    time_t timestamp;
    in_addr ip;
    uint16_t length;
    const uint8_t* payload;
};
```

The current parser assumes:

- 64-bit little-endian `time_t`
- IPv4 addresses stored in network byte order
- Port, protocol, and payload length stored as little-endian 16-bit integers
- Entry payload bytes stored inline immediately after each entry prefix; the
  pointer itself is not serialized
- A 16-byte header and 14-byte entry prefix with no alignment padding

Files generated with a 32-bit `time_t`, native struct padding, or different byte
order require parser changes.

## Privacy and external services

Session files and payloads are read in the browser. Public host IP addresses are
sent to `ipwho.is` for geolocation. Map tiles are loaded from CARTO/OpenStreetMap,
and place searches are sent to OpenStreetMap Nominatim.

## Technology

- React 19 and TypeScript
- Vite
- Untitled UI
- Tailwind CSS
- MapLibre GL

## License

[MIT](./LICENSE)

