import React from "react";

const VARIANTS = {
  primary:
    "bg-[#6c3fc8] hover:bg-[#7d52d8] text-white",
  gold: "bg-[#e8a930] hover:bg-[#f0b840] text-[#1a1035] font-semibold",
  ghost:
    "border border-[#3d3570] hover:bg-[#251e50] text-[#f0edf9]",
  danger: "bg-[#e83030] hover:opacity-90 text-white",
  secondary: "bg-[#251e50] hover:bg-[#2e2760] border border-[#3d3570] text-[#f0edf9]",
};

const SIZES = {
  xs: "px-2 py-1 text-xs rounded-md",
  sm: "px-3 py-1.5 text-xs rounded-lg",
  md: "px-4 py-2 text-sm rounded-[10px]",
  lg: "px-6 py-3 text-base rounded-[10px]",
};

export function Button({
  variant = "primary",
  size = "md",
  children,
  className = "",
  disabled = false,
  loading = false,
  ...props
}) {
  return (
    <button
      className={`
        ${VARIANTS[variant]} ${SIZES[size]}
        inline-flex items-center justify-center gap-2
        font-medium transition-all duration-150
        disabled:opacity-50 disabled:cursor-not-allowed
        cursor-pointer select-none
        ${className}
      `}
      disabled={disabled || loading}
      {...props}
    >
      {loading && (
        <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
      )}
      {children}
    </button>
  );
}
