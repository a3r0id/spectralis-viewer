import { setWorkerUrl } from "maplibre-gl";
import maplibreWorkerUrl from "maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url";

// MapLibre v6 loads a sibling worker module; Vite needs an explicit URL.
setWorkerUrl(maplibreWorkerUrl);
