'use client';

import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/shared/ui/primitives/select';

// A single choice from a list (state, country code), in the auth square.
export default function SelectField({ id, value, onChange, options, placeholder }) {
    return (
        <Select value={value || null} onValueChange={onChange}>
            <SelectTrigger id={id} className="au-select__trigger">
                <SelectValue placeholder={placeholder} />
            </SelectTrigger>
            <SelectContent className="au-select__popup">
                {options.map((option) => (
                    <SelectItem key={option} value={option} className="au-select__item">
                        {option}
                    </SelectItem>
                ))}
            </SelectContent>
        </Select>
    );
}
