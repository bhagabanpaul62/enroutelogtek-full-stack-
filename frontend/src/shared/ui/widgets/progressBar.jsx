"use client";
import React from "react";
import { twMerge } from "tailwind-merge";

function ProgressBar({
  label,
  percentage = 0,
  showLabel = true,
  height = "h-2",
  barColor = "bg-primary",
  trackColor = "bg-muted",
  className = "",
  labelClassName = "",
}) {
  // Clamp percentage between 0-100
  const clampedValue = Math.min(100, Math.max(0, percentage));

  return (
    <div className={twMerge("w-full", className)}>
      {/* Label row */}
      {showLabel && (
        <div
          className={twMerge(
            "flex justify-between items-center mb-2 ",
            labelClassName,
          )}
        >
          <span className="text-sm  font-medium ">
            {label}
          </span>
          <span className="text-sm text-foreground font-semibold">
            {clampedValue}%
          </span>
        </div>
      )}

      {/* Track (background bar) */}
      <div
        className={twMerge(
          "w-full rounded-full overflow-hidden",
          height,
          trackColor,
        )}
      >
        {/* Fill (animated bar) */}
        <div
          className={twMerge(
            "h-full rounded-full transition-all duration-500 ease-out",
            barColor,
          )}
          style={{ width: `${clampedValue}%` }}
        />
      </div>
    </div>
  );
}

export default ProgressBar;
