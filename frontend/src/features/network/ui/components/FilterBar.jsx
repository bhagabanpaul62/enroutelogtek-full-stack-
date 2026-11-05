'use client';

import { Search } from 'lucide-react';
import { Input } from '@/shared/ui/primitives/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/shared/ui/primitives/select';

const ALL_TYPES = 'all';

// Search box + company type filter. companyType '' means "all types".
export default function FilterBar({
    search,
    onSearchChange,
    searchPlaceholder,
    companyType,
    onCompanyTypeChange,
    typeOptions,
}) {
    const items = [{ value: ALL_TYPES, label: 'All types' }, ...typeOptions];

    return (
        <div className="flex flex-col gap-2 sm:flex-row">
            <div className="relative flex-1">
                <Search
                    size={14}
                    className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground"
                />
                <Input
                    type="search"
                    value={search}
                    onChange={(event) => onSearchChange(event.target.value)}
                    placeholder={searchPlaceholder}
                    aria-label={searchPlaceholder}
                    maxLength={100}
                    className="pl-8"
                />
            </div>

            <Select
                items={items}
                value={companyType || ALL_TYPES}
                onValueChange={(value) => onCompanyTypeChange(value === ALL_TYPES ? '' : value)}
            >
                <SelectTrigger className="w-full sm:w-44" aria-label="Filter by company type">
                    <SelectValue />
                </SelectTrigger>
                <SelectContent>
                    {items.map((item) => (
                        <SelectItem key={item.value} value={item.value}>
                            {item.label}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </div>
    );
}
