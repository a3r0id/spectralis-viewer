import { Outlet, useLocation } from "react-router";
import { HostStatsPanel } from "@/components/L3/host-stats";
import { MapComponent } from "@/components/L3/map";
import { NavHeader } from "@/components/L3/nav-header";
import { SessionTable } from "@/components/L3/session-table";
import { useSession } from "@/providers/session-provider";

export const HomeScreen = () => {
    const location = useLocation();
    const { error, fileName, loadFile } = useSession();

    return (
        <div className="flex min-h-dvh flex-col bg-secondary">
            <NavHeader
                activeUrl={location.pathname}
                items={[
                    { label: "List", href: "/" },
                    { label: "Analyze", href: "/analyze" },
                ]}
                onFileChange={loadFile}
                fileName={fileName}
            />

            <main className="mx-auto flex w-full max-w-container flex-1 flex-col gap-5 px-4 py-5 md:px-8 md:py-6">
                {error ? (
                    <div className="rounded-lg bg-error-secondary px-4 py-3 text-sm text-error-primary ring-1 ring-error_subtle" role="alert">
                        {error}
                    </div>
                ) : null}

                <Outlet />
            </main>
        </div>
    );
};

export const SessionListPage = () => {
    const { session } = useSession();
    return <SessionTable session={session} />;
};

export const SessionMapPage = () => {
    const { session, hostStats, isLoadingHosts } = useSession();

    return (
        <div className="flex flex-col gap-5">
            <MapComponent hosts={hostStats} isLoading={isLoadingHosts} />
            <HostStatsPanel session={session} hosts={hostStats} isLoading={isLoadingHosts} />
        </div>
    );
};
