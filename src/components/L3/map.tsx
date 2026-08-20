import { useCallback, useMemo, useRef, useState } from "react";
import type { FeatureCollection } from "geojson";
import { Layer, Map, Source } from "@vis.gl/react-maplibre";
import type { LayerProps, MapRef } from "@vis.gl/react-maplibre";
import type { StyleSpecification } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import "@/utils/maplibre-worker";
import type { HostStats } from "@/types/spectralis";
import { MapSearch, type SelectedLocation } from "./map-search";

const basemapStyle: StyleSpecification = {
    version: 8,
    sources: {
        carto: {
            type: "raster",
            tiles: [
                "https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png",
                "https://b.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png",
                "https://c.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png",
                "https://d.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png",
            ],
            tileSize: 256,
            attribution:
                '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
        },
    },
    layers: [
        {
            id: "carto-dark",
            type: "raster",
            source: "carto",
            minzoom: 0,
            maxzoom: 20,
        },
    ],
};

const hostLayerStyle: LayerProps = {
    id: "hosts",
    type: "circle",
    paint: {
        "circle-radius": ["interpolate", ["linear"], ["get", "messageCount"], 1, 6, 20, 14],
        "circle-color": "#38bdf8",
        "circle-opacity": 0.9,
        "circle-stroke-width": 1.5,
        "circle-stroke-color": "#0f172a",
    },
};

const searchFillStyle: LayerProps = {
    id: "search-fill",
    type: "fill",
    filter: ["in", ["geometry-type"], ["literal", ["Polygon", "MultiPolygon"]]],
    paint: {
        "fill-color": "#38bdf8",
        "fill-opacity": 0.18,
    },
};

const searchLineStyle: LayerProps = {
    id: "search-line",
    type: "line",
    filter: ["in", ["geometry-type"], ["literal", ["Polygon", "MultiPolygon", "LineString", "MultiLineString"]]],
    paint: {
        "line-color": "#7dd3fc",
        "line-width": 2,
    },
};

const searchPointStyle: LayerProps = {
    id: "search-point",
    type: "circle",
    filter: ["==", ["geometry-type"], "Point"],
    paint: {
        "circle-radius": 7,
        "circle-color": "#7dd3fc",
        "circle-stroke-width": 2,
        "circle-stroke-color": "#0f172a",
    },
};

const emptyCollection: FeatureCollection = { type: "FeatureCollection", features: [] };

interface MapComponentProps {
    hosts: HostStats[];
    isLoading?: boolean;
}

export const MapComponent = ({ hosts, isLoading }: MapComponentProps) => {
    const mapRef = useRef<MapRef>(null);
    const [searchFeatures, setSearchFeatures] = useState<FeatureCollection>(emptyCollection);
    const [selectedLabel, setSelectedLabel] = useState<string | null>(null);

    const hostFeatures = useMemo<FeatureCollection>(() => {
        const points = hosts.filter((host) => host.location?.lat != null && host.location?.lon != null);

        return {
            type: "FeatureCollection",
            features: points.map((host) => ({
                type: "Feature",
                properties: {
                    ip: host.ip,
                    messageCount: host.messageCount,
                    totalBytes: host.totalBytes,
                    city: host.location?.city ?? "",
                    country: host.location?.country ?? "",
                },
                geometry: {
                    type: "Point",
                    coordinates: [host.location!.lon, host.location!.lat],
                },
            })),
        };
    }, [hosts]);

    const handleLocationSelect = useCallback((location: SelectedLocation) => {
        setSearchFeatures({
            type: "FeatureCollection",
            features: [
                {
                    type: "Feature",
                    properties: { name: location.label },
                    geometry: location.geometry,
                },
            ],
        });
        setSelectedLabel(location.label);

        const map = mapRef.current;
        if (!map) return;

        const [west, south, east, north] = location.bbox;
        const hasArea = west !== east && south !== north;

        if (hasArea) {
            map.fitBounds(
                [
                    [west, south],
                    [east, north],
                ],
                { padding: 48, duration: 800, maxZoom: 14 },
            );
        } else {
            map.flyTo({
                center: [west, south],
                zoom: 12,
                duration: 800,
            });
        }
    }, []);

    const locatedCount = hostFeatures.features.length;
    const statusText = selectedLabel
        ? selectedLabel
        : isLoading
          ? "Resolving host locations…"
          : locatedCount === 0
            ? "No geolocated hosts yet"
            : `${locatedCount} host${locatedCount === 1 ? "" : "s"} plotted`;

    return (
        <div className="relative overflow-hidden rounded-xl bg-primary ring-1 ring-secondary">
            <Map
                ref={mapRef}
                initialViewState={{
                    longitude: 0,
                    latitude: 20,
                    zoom: 1.4,
                }}
                style={{ width: "100%", height: 440 }}
                mapStyle={basemapStyle}
                attributionControl={{ compact: true }}
            >
                <Source id="hosts" type="geojson" data={hostFeatures}>
                    <Layer {...hostLayerStyle} />
                </Source>

                <Source id="search-location" type="geojson" data={searchFeatures}>
                    <Layer {...searchFillStyle} />
                    <Layer {...searchLineStyle} />
                    <Layer {...searchPointStyle} />
                </Source>
            </Map>

            <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between gap-3 p-3 md:p-4">
                <div className="pointer-events-none max-w-[min(100%,28rem)] rounded-lg bg-primary/85 px-3 py-2 text-xs text-tertiary shadow-xs ring-1 ring-secondary backdrop-blur-sm md:text-sm">
                    <span className="line-clamp-2">{statusText}</span>
                </div>
                <div className="pointer-events-auto shrink-0">
                    <MapSearch onLocationSelect={handleLocationSelect} className="w-56 sm:w-72" />
                </div>
            </div>
        </div>
    );
};
