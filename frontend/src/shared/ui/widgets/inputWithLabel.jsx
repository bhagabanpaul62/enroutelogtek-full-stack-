import React from "react";
import { twMerge } from "tailwind-merge";
import { Input } from "@/shared/ui/primitives/input";

function InputWithLabel({
  id,
  label,
  rootClassName,
  labelClassName,
  inputClassName,
  inputProps = {},
  labelProps = {},
  rootProps = {},
}) {
  return (
    <div {...rootProps} className={twMerge(rootClassName)}>
      <label className={twMerge("font-medium", labelClassName)} htmlFor={id} {...labelProps}>
        {label}
      </label>
      <Input
        {...inputProps}
        className={twMerge(
          "h-10 mt-2 mb-3 md:text-lg placeholder:text-[16px]  border-white/10 placeholder:text-neutral-400 ",
          inputClassName
        )}
      />
    </div>
  );
}

export default InputWithLabel;
