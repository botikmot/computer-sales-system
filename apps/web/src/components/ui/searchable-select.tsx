"use client";

import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown, Search, X } from "lucide-react";

export type SelectOption = {
  value: string;
  label: string;
  description?: string;
  disabled?: boolean;
};

type SearchableSelectProps = {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  searchPlaceholder?: string;
  emptyMessage?: string;
  disabled?: boolean;
  loading?: boolean;
  className?: string;
};

export function SearchableSelect({
  value,
  onChange,
  options,
  placeholder = "Select an option",
  searchPlaceholder = "Search...",
  emptyMessage = "No results found.",
  disabled = false,
  loading = false,
  className = "",
}: SearchableSelectProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const selectedOption = options.find((option) => option.value === value);

  const filteredOptions = options.filter((option) => {
    const query = search.trim().toLowerCase();

    if (!query) {
      return true;
    }

    return (
      option.label.toLowerCase().includes(query) ||
      option.description?.toLowerCase().includes(query)
    );
  });

  useEffect(() => {
    if (!open) {
      return;
    }

    function handlePointerDown(event: PointerEvent) {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(false);
        setSearch("");
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
        setSearch("");
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);

      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  useEffect(() => {
    if (open) {
      requestAnimationFrame(() => {
        searchInputRef.current?.focus();
      });
    }
  }, [open]);

  function handleToggle() {
    if (disabled || loading) {
      return;
    }

    setOpen((current) => !current);

    if (open) {
      setSearch("");
    }
  }

  function handleSelect(option: SelectOption) {
    if (option.disabled) {
      return;
    }

    onChange(option.value);
    setOpen(false);
    setSearch("");
  }

  function handleClear(event: React.MouseEvent<HTMLButtonElement>) {
    event.stopPropagation();

    onChange("");
    setSearch("");
  }

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      {/* Trigger + clear button wrapper */}
      <div
        className={`flex h-11 w-full items-center rounded-xl border border-slate-200 bg-white transition ${
          open
            ? "border-blue-400 ring-4 ring-blue-50"
            : "hover:border-slate-300"
        } ${disabled || loading ? "bg-slate-50" : ""}`}
      >
        {/* Main trigger button */}
        <button
          type="button"
          onClick={handleToggle}
          disabled={disabled || loading}
          aria-expanded={open}
          aria-haspopup="listbox"
          className="flex min-w-0 flex-1 items-center gap-3 px-3.5 text-left text-sm outline-none disabled:cursor-not-allowed"
        >
          <div className="min-w-0 flex-1">
            {loading ? (
              <span className="text-slate-400">Loading...</span>
            ) : selectedOption ? (
              <div className="min-w-0">
                <div className="truncate font-medium text-slate-800">
                  {selectedOption.label}
                </div>

                {selectedOption.description && (
                  <div className="truncate text-[11px] text-slate-400">
                    {selectedOption.description}
                  </div>
                )}
              </div>
            ) : (
              <span className="text-slate-400">{placeholder}</span>
            )}
          </div>
        </button>

        {/* Clear button — sibling, NOT inside trigger */}
        {selectedOption && !disabled && !loading ? (
          <button
            type="button"
            onClick={handleClear}
            aria-label="Clear selection"
            className="mr-0.5 shrink-0 rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
          >
            <X className="h-4 w-4" />
          </button>
        ) : null}

        {/* Dropdown chevron */}
        <button
          type="button"
          onClick={handleToggle}
          disabled={disabled || loading}
          aria-label={open ? "Close options" : "Open options"}
          className="shrink-0 rounded-lg p-1.5 mr-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:cursor-not-allowed"
        >
          <ChevronDown
            className={`h-4 w-4 transition-transform ${
              open ? "rotate-180" : ""
            }`}
          />
        </button>
      </div>

      {/* Dropdown */}
      {open && (
        <div className="absolute left-0 right-0 top-[calc(100%+8px)] z-50 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl shadow-slate-900/10">
          <div className="border-b border-slate-100 p-2">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

              <input
                ref={searchInputRef}
                type="text"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder={searchPlaceholder}
                className="h-10 w-full rounded-xl bg-slate-50 pl-9 pr-3 text-sm text-slate-800 outline-none placeholder:text-slate-400 focus:bg-white focus:ring-2 focus:ring-blue-100"
              />
            </div>
          </div>

          <div role="listbox" className="max-h-64 overflow-y-auto p-1.5">
            {filteredOptions.length === 0 ? (
              <div className="px-3 py-8 text-center">
                <Search className="mx-auto h-5 w-5 text-slate-300" />

                <p className="mt-2 text-sm font-medium text-slate-600">
                  {emptyMessage}
                </p>

                {search && (
                  <p className="mt-1 text-xs text-slate-400">
                    Try a different search term.
                  </p>
                )}
              </div>
            ) : (
              filteredOptions.map((option) => {
                const selected = option.value === value;

                return (
                  <button
                    key={option.value}
                    type="button"
                    role="option"
                    aria-selected={selected}
                    disabled={option.disabled}
                    onClick={() => handleSelect(option)}
                    className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition ${
                      option.disabled
                        ? "cursor-not-allowed opacity-40"
                        : selected
                          ? "bg-blue-50"
                          : "hover:bg-slate-50"
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <div
                        className={`truncate text-sm font-medium ${
                          selected ? "text-primary" : "text-slate-800"
                        }`}
                      >
                        {option.label}
                      </div>

                      {option.description && (
                        <div className="mt-0.5 truncate text-[11px] text-slate-400">
                          {option.description}
                        </div>
                      )}
                    </div>

                    {selected && (
                      <Check className="h-4 w-4 shrink-0 text-primary" />
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
