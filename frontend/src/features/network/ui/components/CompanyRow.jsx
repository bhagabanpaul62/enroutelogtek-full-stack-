import { COMPANY_TYPE_LABELS } from '../../constants';

function CompanyAvatar({ company }) {
    if (company.logoUrl) {
        // Plain <img>: logos are on Cloudflare R2, which isn't set up as a next/image domain.
        return (
            // eslint-disable-next-line @next/next/no-img-element
            <img
                src={company.logoUrl}
                alt=""
                className="size-10 shrink-0 rounded-[4px] border border-border object-cover"
            />
        );
    }

    const initials = company.name
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((word) => word[0])
        .join('')
        .toUpperCase();

    return (
        <div
            aria-hidden="true"
            className="flex size-10 shrink-0 items-center justify-center rounded-[4px] border border-surface-container-highest bg-surface-container-low font-mono text-[13px] font-bold text-primary"
        >
            {initials}
        </div>
    );
}

function CompanyTypeBadge({ type }) {
    return (
        <span className="rounded-[2px] border border-surface-container-highest bg-surface-container-low px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider text-[#c6c6c7]">
            {COMPANY_TYPE_LABELS[type] ?? type}
        </span>
    );
}

// One company in a list: logo, name, type, Enroute ID, an optional note and the action buttons.
export default function CompanyRow({ company, meta, actions }) {
    return (
        <li className="flex flex-col gap-3 px-4 py-3 transition-colors hover:bg-[#181818] sm:flex-row sm:items-center">
            <div className="flex min-w-0 flex-1 items-center gap-3">
                <CompanyAvatar company={company} />
                <div className="min-w-0">
                    <p className="truncate text-[14px] font-medium text-foreground">{company.name}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
                        <CompanyTypeBadge type={company.type} />
                        <span className="font-mono text-[11px] text-muted-foreground">
                            {company.enrouteCompanyId}
                        </span>
                        {meta && <span className="text-[11px] text-[#c6c6c7]">{meta}</span>}
                    </div>
                </div>
            </div>

            {actions && (
                <div className="flex shrink-0 flex-wrap gap-2 pl-[52px] sm:pl-0">{actions}</div>
            )}
        </li>
    );
}
