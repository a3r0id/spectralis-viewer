import { UploadCloud02 } from "@untitledui/icons";
import { EmptyState } from "@/components/application/empty-state/empty-state";
import type { HostStats, SpectralisSession } from "@/types/spectralis";
import { formatByteSize, formatTimestamp, protocolLabel } from "@/utils/parse-spectralis-session";

interface HostStatsPanelProps {
    session: SpectralisSession | null;
    hosts: HostStats[];
    isLoading?: boolean;
}

export const HostStatsPanel = ({ session, hosts, isLoading }: HostStatsPanelProps) => {
    const totalMessages = session?.entries.length ?? 0;
    const totalBytes = session?.entries.reduce((sum, entry) => sum + entry.length, 0) ?? 0;
    const located = hosts.filter((host) => host.location).length;
    const countries = new Set(hosts.map((host) => host.location?.country).filter(Boolean)).size;

    return (
        <div className="flex flex-col gap-5">
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <StatCard label="Unique hosts" value={String(hosts.length)} hint={isLoading ? "Looking up locations…" : `${located} geolocated`} />
                <StatCard label="Messages" value={String(totalMessages)} hint={session ? protocolLabel(session.header.protocol) : "—"} />
                <StatCard label="Payload bytes" value={formatByteSize(totalBytes)} hint={session ? `Listener ${session.header.ip}:${session.header.port}` : "—"} />
                <StatCard label="Countries" value={String(countries)} hint="From public IP lookups" />
            </div>

            <div className="overflow-hidden rounded-xl bg-primary ring-1 ring-secondary">
                <div className="border-b border-secondary px-4 py-4 md:px-6">
                    <h2 className="text-md font-semibold text-primary">Host breakdown</h2>
                    <p className="mt-0.5 text-sm text-tertiary">Unique remote IPs in this session, sorted by message volume.</p>
                </div>

                {hosts.length === 0 ? (
                    <div className="px-6 py-12">
                        <EmptyState size="sm">
                            <EmptyState.Header pattern="none">
                                <EmptyState.FeaturedIcon icon={UploadCloud02} color="gray" theme="modern" size="md" />
                            </EmptyState.Header>
                            <EmptyState.Content className="mb-0!">
                                <EmptyState.Title>No hosts yet</EmptyState.Title>
                                <EmptyState.Description>Upload a session file to compute host statistics.</EmptyState.Description>
                            </EmptyState.Content>
                        </EmptyState>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full text-left text-sm">
                            <thead className="bg-secondary text-tertiary">
                                <tr>
                                    <th className="px-4 py-3 font-medium md:px-6">IP</th>
                                    <th className="px-4 py-3 font-medium md:px-6">Location</th>
                                    <th className="px-4 py-3 font-medium md:px-6">Messages</th>
                                    <th className="px-4 py-3 font-medium md:px-6">Bytes</th>
                                    <th className="px-4 py-3 font-medium md:px-6">First seen</th>
                                    <th className="px-4 py-3 font-medium md:px-6">Last seen</th>
                                </tr>
                            </thead>
                            <tbody>
                                {hosts.map((host) => (
                                    <tr key={host.ip} className="border-t border-secondary">
                                        <td className="px-4 py-3 font-medium text-primary md:px-6">{host.ip}</td>
                                        <td className="px-4 py-3 text-tertiary md:px-6">
                                            {host.location
                                                ? [host.location.city, host.location.country].filter(Boolean).join(", ") || "Unknown"
                                                : "Unresolved / private"}
                                        </td>
                                        <td className="px-4 py-3 text-tertiary md:px-6">{host.messageCount}</td>
                                        <td className="px-4 py-3 text-tertiary md:px-6">{formatByteSize(host.totalBytes)}</td>
                                        <td className="px-4 py-3 whitespace-nowrap text-tertiary md:px-6">{formatTimestamp(host.firstSeen)}</td>
                                        <td className="px-4 py-3 whitespace-nowrap text-tertiary md:px-6">{formatTimestamp(host.lastSeen)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};

const StatCard = ({ label, value, hint }: { label: string; value: string; hint: string }) => (
    <div className="rounded-xl bg-primary px-4 py-4 ring-1 ring-secondary md:px-5">
        <p className="text-sm text-tertiary">{label}</p>
        <p className="mt-1 text-display-xs font-semibold text-primary">{value}</p>
        <p className="mt-1 truncate text-sm text-quaternary">{hint}</p>
    </div>
);
