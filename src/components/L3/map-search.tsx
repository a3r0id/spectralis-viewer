import { useEffect, useId, useRef, useState } from "react";
import type { Geometry } from "geojson";
import { SearchLg } from "@untitledui/icons";
import { InputBase } from "@/components/base/input/input";
import { cx } from "@/utils/cx";

export interface NominatimResult {
    place_id: number;
    osm_type: "node" | "way" | "relation";
    osm_id: number;
    display_name: string;
    lat: string;
    lon: string;
    /** [south, north, west, east] */
    boundingbox: [string, string, string, string];
    geojson?: Geometry;
}

export interface SelectedLocation {
    label: string;
    geometry: Geometry;
    /** [west, south, east, north] for MapLibre fitBounds */
    bbox: [number, number, number, number];
}

interface MapSearchProps {
    onLocationSelect: (location: SelectedLocation) => void;
    className?: string;
}

const NOMINATIM_HEADERS = {
    Accept: "application/json",
};

const osmIdPrefix = (osmType: NominatimResult["osm_type"]) => {
    if (osmType === "node") return "N";
    if (osmType === "way") return "W";
    return "R";
};

const toBbox = (boundingbox: NominatimResult["boundingbox"]): SelectedLocation["bbox"] => {
    const [south, north, west, east] = boundingbox.map(Number);
    return [west, south, east, north];
};

const pointGeometry = (lon: string, lat: string): Geometry => ({
    type: "Point",
    coordinates: [Number(lon), Number(lat)],
});

const searchNominatim = async (query: string, signal?: AbortSignal): Promise<NominatimResult[]> => {
    const url = new URL("https://nominatim.openstreetmap.org/search");
    url.searchParams.set("q", query);
    url.searchParams.set("format", "jsonv2");
    url.searchParams.set("addressdetails", "0");
    url.searchParams.set("limit", "8");

    const response = await fetch(url, { headers: NOMINATIM_HEADERS, signal });
    if (!response.ok) throw new Error(`Nominatim search failed (${response.status})`);
    return (await response.json()) as NominatimResult[];
};

const fetchPlaceGeometry = async (result: NominatimResult, signal?: AbortSignal): Promise<SelectedLocation> => {
    const url = new URL("https://nominatim.openstreetmap.org/lookup");
    url.searchParams.set("osm_ids", `${osmIdPrefix(result.osm_type)}${result.osm_id}`);
    url.searchParams.set("format", "jsonv2");
    url.searchParams.set("polygon_geojson", "1");

    const response = await fetch(url, { headers: NOMINATIM_HEADERS, signal });
    if (!response.ok) throw new Error(`Nominatim lookup failed (${response.status})`);

    const [place] = (await response.json()) as NominatimResult[];
    if (!place) throw new Error("No geometry returned for selected place.");

    return {
        label: place.display_name || result.display_name,
        geometry: place.geojson ?? pointGeometry(place.lon, place.lat),
        bbox: toBbox(place.boundingbox ?? result.boundingbox),
    };
};

export const MapSearch = ({ onLocationSelect, className }: MapSearchProps) => {
    const listId = useId();
    const [query, setQuery] = useState("");
    const [results, setResults] = useState<NominatimResult[]>([]);
    const [isOpen, setIsOpen] = useState(false);
    const [isSearching, setIsSearching] = useState(false);
    const [isFetchingGeometry, setIsFetchingGeometry] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const abortRef = useRef<AbortController | null>(null);

    useEffect(() => {
        const trimmed = query.trim();
        if (trimmed.length < 2) {
            setResults([]);
            setIsSearching(false);
            setError(null);
            return;
        }

        const timer = window.setTimeout(async () => {
            abortRef.current?.abort();
            const controller = new AbortController();
            abortRef.current = controller;

            setIsSearching(true);
            setError(null);

            try {
                const data = await searchNominatim(trimmed, controller.signal);
                setResults(data);
                setIsOpen(true);
            } catch (err) {
                if ((err as Error).name === "AbortError") return;
                setResults([]);
                setError(err instanceof Error ? err.message : "Search failed.");
            } finally {
                setIsSearching(false);
            }
        }, 300);

        return () => {
            window.clearTimeout(timer);
            abortRef.current?.abort();
        };
    }, [query]);

    const handleSelect = async (result: NominatimResult) => {
        setIsFetchingGeometry(true);
        setError(null);
        setIsOpen(false);
        setQuery(result.display_name);

        try {
            const location = await fetchPlaceGeometry(result);
            onLocationSelect(location);
        } catch (err) {
            // Fall back to bbox/point from the search hit if lookup fails.
            onLocationSelect({
                label: result.display_name,
                geometry: pointGeometry(result.lon, result.lat),
                bbox: toBbox(result.boundingbox),
            });
            setError(err instanceof Error ? err.message : "Could not load full geometry.");
        } finally {
            setIsFetchingGeometry(false);
        }
    };

    return (
        <div className={cx("relative z-10 w-full max-w-md", className)}>
            <InputBase
                size="sm"
                icon={SearchLg}
                value={query}
                placeholder="Search location"
                wrapperClassName="bg-primary/90 shadow-xs backdrop-blur-sm"
                aria-autocomplete="list"
                aria-controls={listId}
                aria-expanded={isOpen && results.length > 0}
                onChange={(event) => {
                    setQuery(event.target.value);
                    setIsOpen(true);
                }}
                onFocus={() => {
                    if (results.length > 0) setIsOpen(true);
                }}
                onBlur={() => {
                    window.setTimeout(() => setIsOpen(false), 150);
                }}
            />

            {(isSearching || isFetchingGeometry) && (
                <p className="mt-1 rounded-md bg-primary/80 px-2 py-1 text-xs text-tertiary backdrop-blur-sm">
                    {isFetchingGeometry ? "Loading geometry…" : "Searching…"}
                </p>
            )}
            {error ? <p className="mt-1 rounded-md bg-primary/80 px-2 py-1 text-xs text-error-primary backdrop-blur-sm">{error}</p> : null}

            {isOpen && results.length > 0 ? (
                <ul
                    id={listId}
                    role="listbox"
                    className="absolute top-full right-0 left-0 z-20 mt-1 max-h-64 overflow-auto rounded-lg bg-primary py-1 shadow-lg ring-1 ring-secondary"
                >
                    {results.map((result) => (
                        <li key={result.place_id} role="option">
                            <button
                                type="button"
                                className="w-full px-3 py-2 text-left text-sm text-secondary transition duration-100 ease-linear hover:bg-primary_hover hover:text-primary"
                                onMouseDown={(event) => event.preventDefault()}
                                onClick={() => void handleSelect(result)}
                            >
                                {result.display_name}
                            </button>
                        </li>
                    ))}
                </ul>
            ) : null}
        </div>
    );
};
