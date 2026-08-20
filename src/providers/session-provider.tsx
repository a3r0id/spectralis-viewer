import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import type { HostStats, SpectralisSession } from "@/types/spectralis";
import { aggregateHostStats, enrichHostStats } from "@/utils/ip-geolocation";
import { readSpectralisFile, SpectralisParseError } from "@/utils/parse-spectralis-session";

interface SessionContextValue {
    session: SpectralisSession | null;
    hostStats: HostStats[];
    isLoadingHosts: boolean;
    error: string | null;
    fileName: string | null;
    loadFile: (file: File) => Promise<void>;
    clearSession: () => void;
}

const SessionContext = createContext<SessionContextValue | null>(null);

export const SessionProvider = ({ children }: { children: ReactNode }) => {
    const [session, setSession] = useState<SpectralisSession | null>(null);
    const [hostStats, setHostStats] = useState<HostStats[]>([]);
    const [isLoadingHosts, setIsLoadingHosts] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const loadFile = async (file: File) => {
        setError(null);
        setIsLoadingHosts(true);

        try {
            const parsed = await readSpectralisFile(file);
            setSession(parsed);

            const baseStats = aggregateHostStats(parsed.entries);
            setHostStats(baseStats);

            const withLocations = await enrichHostStats(baseStats);
            setHostStats(withLocations);
        } catch (err) {
            setSession(null);
            setHostStats([]);
            const message =
                err instanceof SpectralisParseError
                    ? err.message
                    : err instanceof Error
                      ? err.message
                      : "Failed to parse Spectralis session file.";
            setError(message);
        } finally {
            setIsLoadingHosts(false);
        }
    };

    const clearSession = () => {
        setSession(null);
        setHostStats([]);
        setError(null);
        setIsLoadingHosts(false);
    };

    const value = useMemo<SessionContextValue>(
        () => ({
            session,
            hostStats,
            isLoadingHosts,
            error,
            fileName: session?.fileName ?? null,
            loadFile,
            clearSession,
        }),
        [session, hostStats, isLoadingHosts, error],
    );

    return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
};

export const useSession = (): SessionContextValue => {
    const ctx = useContext(SessionContext);
    if (!ctx) {
        throw new Error("useSession must be used within SessionProvider");
    }
    return ctx;
};
