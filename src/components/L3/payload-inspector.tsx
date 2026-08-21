import { useMemo, useState } from "react";
import { Check, Copy01, Download01 } from "@untitledui/icons";
import { Button } from "@/components/base/buttons/button";
import { CloseButton } from "@/components/base/buttons/close-button";
import { Dialog, Modal, ModalOverlay } from "@/components/application/modals/modal";
import { useClipboard } from "@/hooks/use-clipboard";
import type { SessionEntry } from "@/types/spectralis";
import { bytesToHex, formatByteSize, formatTimestamp } from "@/utils/parse-spectralis-session";
import { cx } from "@/utils/cx";

type PayloadView = "text" | "hex";

interface PayloadInspectorProps {
    entry: SessionEntry | null;
    onClose: () => void;
}

interface PayloadAnalysis {
    text: string;
    displayText: string;
    isValidUtf8: boolean;
    printablePercent: number;
    nullBytes: number;
    format: "JSON" | "HTTP" | "UTF-8 text" | "Binary";
}

const analyzePayload = (payload: Uint8Array): PayloadAnalysis => {
    const text = new TextDecoder().decode(payload);
    let isValidUtf8 = true;

    try {
        new TextDecoder("utf-8", { fatal: true }).decode(payload);
    } catch {
        isValidUtf8 = false;
    }

    const printableBytes = payload.reduce(
        (count, byte) => count + (byte === 9 || byte === 10 || byte === 13 || (byte >= 32 && byte <= 126) ? 1 : 0),
        0,
    );
    const printablePercent = payload.length === 0 ? 100 : Math.round((printableBytes / payload.length) * 100);
    const nullBytes = payload.reduce((count, byte) => count + (byte === 0 ? 1 : 0), 0);

    let format: PayloadAnalysis["format"] = isValidUtf8 && printablePercent >= 80 ? "UTF-8 text" : "Binary";
    let displayText = text;

    try {
        const json = JSON.parse(text);
        displayText = JSON.stringify(json, null, 2);
        format = "JSON";
    } catch {
        if (/^(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS|HTTP\/)\s/m.test(text)) {
            format = "HTTP";
        }
    }

    return { text, displayText, isValidUtf8, printablePercent, nullBytes, format };
};

const createHexDump = (payload: Uint8Array): string => {
    const rows: string[] = [];

    for (let offset = 0; offset < payload.length; offset += 16) {
        const chunk = payload.subarray(offset, offset + 16);
        const hex = Array.from(chunk, (byte) => byte.toString(16).padStart(2, "0"));
        const left = hex.slice(0, 8).join(" ").padEnd(23, " ");
        const right = hex.slice(8).join(" ").padEnd(23, " ");
        const ascii = Array.from(chunk, (byte) => (byte >= 32 && byte <= 126 ? String.fromCharCode(byte) : ".")).join("");
        rows.push(`${offset.toString(16).padStart(8, "0")}  ${left}  ${right}  |${ascii.padEnd(16, " ")}|`);
    }

    return rows.join("\n") || "00000000";
};

const downloadPayload = (entry: SessionEntry) => {
    const blob = new Blob([entry.payload as BlobPart], { type: "application/octet-stream" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `payload-${entry.ip}-${entry.timestamp}.bin`;
    anchor.click();
    URL.revokeObjectURL(url);
};

export const getPayloadPreview = (payload: Uint8Array): { label: string; value: string } => {
    const analysis = analyzePayload(payload);

    if (analysis.format !== "Binary") {
        const oneLine = analysis.text.replace(/\s+/g, " ").trim();
        return {
            label: analysis.format,
            value: oneLine || "(empty text)",
        };
    }

    return {
        label: "Binary",
        value: bytesToHex(payload, 24),
    };
};

export const PayloadInspector = ({ entry, onClose }: PayloadInspectorProps) => {
    const [view, setView] = useState<PayloadView>("text");
    const { copied, copy } = useClipboard();
    const analysis = useMemo(() => (entry ? analyzePayload(entry.payload) : null), [entry]);
    const hexDump = useMemo(() => (entry ? createHexDump(entry.payload) : ""), [entry]);

    if (!entry || !analysis) return null;

    const currentContent = view === "hex" ? hexDump : analysis.displayText;

    return (
        <ModalOverlay isOpen isDismissable onOpenChange={(isOpen) => !isOpen && onClose()}>
            <Modal className="max-w-5xl">
                <Dialog>
                    <div className="flex max-h-[85vh] w-full flex-col overflow-hidden rounded-xl bg-primary shadow-xl ring-1 ring-secondary">
                        <header className="flex items-start gap-4 border-b border-secondary px-5 py-4 md:px-6">
                            <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-center gap-2">
                                    <h2 className="text-lg font-semibold text-primary">Payload inspector</h2>
                                    <span className="rounded-md bg-secondary px-2 py-0.5 text-xs font-medium text-secondary">
                                        {analysis.format}
                                    </span>
                                </div>
                                <p className="mt-1 text-sm text-tertiary">
                                    {entry.ip} · {formatTimestamp(entry.timestamp)}
                                </p>
                            </div>
                            <CloseButton onPress={onClose} />
                        </header>

                        <div className="grid grid-cols-2 border-b border-secondary sm:grid-cols-4">
                            <Metric label="Size" value={formatByteSize(entry.length)} />
                            <Metric label="UTF-8" value={analysis.isValidUtf8 ? "Valid" : "Invalid"} />
                            <Metric label="Printable" value={`${analysis.printablePercent}%`} />
                            <Metric label="Null bytes" value={String(analysis.nullBytes)} />
                        </div>

                        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-secondary px-5 py-3 md:px-6">
                            <div className="flex rounded-lg bg-secondary p-1 ring-1 ring-secondary ring-inset">
                                <ViewButton isActive={view === "text"} onClick={() => setView("text")}>
                                    Text
                                </ViewButton>
                                <ViewButton isActive={view === "hex"} onClick={() => setView("hex")}>
                                    Hex dump
                                </ViewButton>
                            </div>

                            <div className="flex items-center gap-2">
                                <Button
                                    size="sm"
                                    color="secondary"
                                    iconLeading={copied === view ? Check : Copy01}
                                    onClick={() => void copy(currentContent, view)}
                                >
                                    {copied === view ? "Copied" : "Copy"}
                                </Button>
                                <Button size="sm" color="secondary" iconLeading={Download01} onClick={() => downloadPayload(entry)}>
                                    Download
                                </Button>
                            </div>
                        </div>

                        <div className="min-h-0 flex-1 overflow-auto bg-secondary px-5 py-5 md:px-6">
                            <pre
                                className={cx(
                                    "min-h-64 whitespace-pre-wrap break-words rounded-lg bg-primary p-4 font-mono text-xs leading-6 text-secondary ring-1 ring-secondary",
                                    view === "hex" && "min-w-max whitespace-pre",
                                )}
                            >
                                {currentContent || "(empty payload)"}
                            </pre>
                        </div>
                    </div>
                </Dialog>
            </Modal>
        </ModalOverlay>
    );
};

const Metric = ({ label, value }: { label: string; value: string }) => (
    <div className="border-r border-secondary px-5 py-3 last:border-r-0 md:px-6">
        <p className="text-xs text-tertiary">{label}</p>
        <p className="mt-0.5 text-sm font-semibold text-primary">{value}</p>
    </div>
);

const ViewButton = ({
    isActive,
    onClick,
    children,
}: {
    isActive: boolean;
    onClick: () => void;
    children: string;
}) => (
    <button
        type="button"
        className={cx(
            "rounded-md px-3 py-1.5 text-sm font-semibold text-tertiary transition duration-100 ease-linear hover:text-secondary",
            isActive && "bg-primary text-secondary shadow-xs ring-1 ring-primary ring-inset",
        )}
        onClick={onClick}
    >
        {children}
    </button>
);
