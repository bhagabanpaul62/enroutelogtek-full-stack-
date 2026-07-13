"use client";
import React from "react";
import { twMerge } from "tailwind-merge";

function SelectCheckBox({ list, value, onChange }) {
  return (
    <div className="grid grid-cols-2 gap-4 mt-2">
      {list?.map((item) => (
        <label
          key={item}
          className={twMerge(
            "cursor-pointer rounded-lg border p-4 text-center text-sm font-medium transition-all",
            value === item
              ? "border-primary bg-muted text-primary"
              : "border-border text-foreground hover:border-primary/50 hover:bg-accent",
          )}
        >
          <input
            type="radio"
            name="companyType"
            value={item}
            className="hidden"
            checked={value === item}
            onChange={(e) => onChange(e.target.value)}
          />
          {item}
        </label>
      ))}
    </div>
  );
}

export default SelectCheckBox;
