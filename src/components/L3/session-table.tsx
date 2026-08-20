import { useMemo, useState } from "react";
import type { SortDescriptor } from "react-aria-components";
import { UploadCloud02 } from "@untitledui/icons";
import { EmptyState } from "@/components/application/empty-state/empty-state";
import { PaginationPageMinimalCenter } from "@/components/application/pagination/pagination";
import { Table, TableCard } from "@/components/application/table/table";
import type { SpectralisSession } from "@/types/spectralis";
import { bytesToHex, formatTimestamp, protocolLabel } from "@/utils/parse-spectralis-session";

const PAGE_SIZE = 25;

interface SessionTableProps {
    session: SpectralisSession | null;
}

export const SessionTable = ({ session }: SessionTableProps) => {
    const [page, setPage] = useState(1);
    const [sortDescriptor, setSortDescriptor] = useState<SortDescriptor>({
        column: "timestamp",
        direction: "descending",
    });

    const sortedItems = useMemo(() => {
        if (!session) return [];

        const items = [...session.entries];
        items.sort((a, b) => {
            const column = sortDescriptor.column as "ip" | "timestamp" | "length" | "payload";
            const direction = sortDescriptor.direction === "descending" ? -1 : 1;

            if (column === "timestamp" || column === "length") {
                return (a[column] - b[column]) * direction;
            }

            if (column === "payload") {
                return a.length - b.length !== 0 ? (a.length - b.length) * direction : 0;
            }

            return a.ip.localeCompare(b.ip) * direction;
        });

        return items;
    }, [session, sortDescriptor]);

    if (!session) {
        return (
            <div className="flex flex-1 items-center justify-center rounded-xl bg-primary px-6 py-16 ring-1 ring-secondary md:py-24">
                <EmptyState size="md">
                    <EmptyState.Header pattern="none">
                        <EmptyState.FeaturedIcon icon={UploadCloud02} color="gray" theme="modern" />
                    </EmptyState.Header>
                    <EmptyState.Content>
                        <EmptyState.Title>No session loaded</EmptyState.Title>
                        <EmptyState.Description>
                            Upload a Spectralis <code className="text-secondary">.session.bin</code> file to browse captured messages.
                        </EmptyState.Description>
                    </EmptyState.Content>
                </EmptyState>
            </div>
        );
    }

    const totalPages = Math.max(1, Math.ceil(sortedItems.length / PAGE_SIZE));
    const currentPage = Math.min(page, totalPages);
    const pageItems = sortedItems.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

    return (
        <TableCard.Root>
            <TableCard.Header
                title={`${session.header.ip}:${session.header.port}`}
                description={`Opened ${formatTimestamp(session.header.timestamp)} · ${protocolLabel(session.header.protocol)}`}
                badge={String(session.entries.length)}
            />
            <Table
                aria-label="Session logs"
                sortDescriptor={sortDescriptor}
                onSortChange={(next) => {
                    setSortDescriptor(next);
                    setPage(1);
                }}
            >
                <Table.Header>
                    <Table.Head id="ip" label="Host IP" isRowHeader allowsSorting className="w-full max-w-1/4" />
                    <Table.Head id="timestamp" label="Timestamp" allowsSorting />
                    <Table.Head id="length" label="Length" allowsSorting />
                    <Table.Head id="payload" label="Payload" allowsSorting />
                </Table.Header>

                <Table.Body items={pageItems}>
                    {(item) => (
                        <Table.Row id={item.id}>
                            <Table.Cell>
                                <p className="text-sm font-medium text-primary">{item.ip}</p>
                            </Table.Cell>
                            <Table.Cell>
                                <div className="whitespace-nowrap text-sm text-tertiary">{formatTimestamp(item.timestamp)}</div>
                            </Table.Cell>
                            <Table.Cell>
                                <div className="whitespace-nowrap text-sm text-tertiary">{item.length}</div>
                            </Table.Cell>
                            <Table.Cell>
                                <code className="block max-w-xl truncate font-mono text-xs text-tertiary" title={bytesToHex(item.payload, item.length)}>
                                    {bytesToHex(item.payload)}
                                </code>
                            </Table.Cell>
                        </Table.Row>
                    )}
                </Table.Body>
            </Table>

            {sortedItems.length > PAGE_SIZE ? (
                <PaginationPageMinimalCenter
                    page={currentPage}
                    total={totalPages}
                    onPageChange={setPage}
                    className="px-4 py-3 md:px-6 md:pt-3 md:pb-4"
                />
            ) : null}
        </TableCard.Root>
    );
};
