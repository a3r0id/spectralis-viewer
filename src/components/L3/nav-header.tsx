import type { FC, ReactNode } from "react";
import { Link, useNavigate } from "react-router";
import { cx } from "@/utils/cx";
import { MobileNavigationHeader } from "@/components/application/app-navigation/base-components/mobile-header";
import { NavButton } from "@/components/application/app-navigation/base-components/nav-button";
import { NavList } from "@/components/application/app-navigation/base-components/nav-list";
import { FileUploadDropZone } from "./file-dialog";

type NavItem = {
    label: string;
    href: string;
    current?: boolean;
    icon?: FC<{ className?: string }>;
    badge?: ReactNode;
    items?: NavItem[];
};

const isItemActive = (href: string, activeUrl?: string) => {
    if (!activeUrl || !href) return false;
    if (href === activeUrl) return true;
    if (href !== "/" && activeUrl.startsWith(href + "/")) return true;
    return false;
};

interface HeaderNavigationBaseProps {
    activeUrl?: string;
    items: NavItem[];
    hideBorder?: boolean;
    actions?: ReactNode;
    onFileChange?: (file: File) => void;
    fileName?: string | null;
}

const UploadActions = ({
    onFileChange,
    fileName,
}: {
    onFileChange?: (file: File) => void;
    fileName?: string | null;
}) => {
    if (!onFileChange) return null;

    return (
        <div className="flex max-w-sm items-center gap-3">
            {fileName ? (
                <p className="hidden max-w-40 truncate text-sm text-tertiary lg:block" title={fileName}>
                    {fileName}
                </p>
            ) : null}
            <FileUploadDropZone allowsMultiple={false} accept=".bin,application/octet-stream" onDropFiles={(files) => onFileChange(files[0])} />
        </div>
    );
};

export const NavHeader = ({ activeUrl, items, hideBorder = false, actions, onFileChange, fileName }: HeaderNavigationBaseProps) => {
    const navigate = useNavigate();
    const isActive = (item: NavItem) => item.current ?? isItemActive(item.href, activeUrl);
    const hasCustomActions = actions !== undefined;

    return (
        <>
            <MobileNavigationHeader>
                <aside className="flex h-full max-w-full flex-col justify-between overflow-auto bg-primary pt-4">
                    <div className="px-4">
                        <p className="text-md font-semibold text-primary">Spectralis</p>
                    </div>
                    <NavList activeUrl={activeUrl} items={items} />
                    <div className="mt-auto p-4">
                        <UploadActions onFileChange={onFileChange} fileName={fileName} />
                    </div>
                </aside>
            </MobileNavigationHeader>

            <header className="max-lg:hidden">
                <section className={cx("flex h-14 w-full items-center justify-center bg-primary", !hideBorder && "border-b border-secondary")}>
                    <div className="flex w-full max-w-container items-center gap-6 pr-3 pl-4 md:px-8">
                        <Link to="/" className="shrink-0 text-md font-semibold text-primary outline-focus-ring focus-visible:outline-2 focus-visible:outline-offset-2">
                            Spectralis
                        </Link>

                        <nav className="min-w-0">
                            <ul className="flex items-center gap-0.5">
                                {items.map((item) => (
                                    <li key={item.label}>
                                        <NavButton
                                            current={isActive(item)}
                                            href={item.href}
                                            onClick={(event) => {
                                                event.preventDefault();
                                                navigate(item.href);
                                            }}
                                        >
                                            {item.label}
                                        </NavButton>
                                    </li>
                                ))}
                            </ul>
                        </nav>

                        <div className="ml-auto flex items-center gap-3">
                            {hasCustomActions ? actions : <UploadActions onFileChange={onFileChange} fileName={fileName} />}
                        </div>
                    </div>
                </section>
            </header>
        </>
    );
};
