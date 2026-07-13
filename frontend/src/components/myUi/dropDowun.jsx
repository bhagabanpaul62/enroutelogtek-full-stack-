"use client";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { twMerge } from "tailwind-merge";

function DropDown({
  options = [],
  value,
  onChange,
  placeholder = "Select an option",
  label,
  className = "",
}) {
  return (
    <div className={twMerge("w-full", className)}>
      {/* Label — same style as InputWithLabel's label */}
      {label && <label className="font-medium block">{label}</label>}

      <Select value={value} onValueChange={onChange}>
        {/* Trigger — matches InputWithLabel's Input exactly: h-10 mt-2 mb-3 border-white/10 */}
        <SelectTrigger
          className="w-full h-15 mt-2 mb-3 px-3 py-4.5 md:text-lg text-[16px] rounded-md
                     border border-white/10 bg-input/20
                     text-foreground data-placeholder:text-neutral-400
                     focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30"
        >
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>

        <SelectContent>
          {options.map((option) => (
            <SelectItem className='text-lg' key={option} value={option}>
              {option}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

export default DropDown;
