"use client";

import { useEffect, useMemo, useRef, useState } from "react";

interface SearchPickerProps {
  label: string;
  placeholder: string;
  items: {
    task_name: string;
    outline_number: string;
    display_name?: string;
    context_name?: string;
    show_context?: boolean;
  }[];
  value: string;
  displayValue?: string;
  onSelect: (
    value: string,
    item: SearchPickerProps["items"][number]
  ) => void;
}

export default function SearchPicker({
  label,
  placeholder,
  items,
  value,
  displayValue,
  onSelect,
}: SearchPickerProps) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);

  const wrapperRef = useRef<HTMLDivElement>(null);

  const filtered = useMemo(() => {
  if (!query) return items;

  const tokens = query
    .toLowerCase()
    .trim()
    .split(/\s+/);

  return items.filter((item) => {
      const text = [
        item.display_name,
        item.task_name,
        item.outline_number,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return tokens.every((token) =>
        text.includes(token)
      );
    });
  }, [items, query]);

  const selectedItem = useMemo(() => {

    return items.find(
      (x) => x.outline_number === value
    );

  }, [items, value]);
  
  useEffect(() => {

      if (!value) {

          setQuery("");

          return;

      }

      if (displayValue) {

          setQuery(displayValue);

          return;

      }

      const match = items.find(
          (x) => x.outline_number === value
      );

      if (match) {

          setQuery(
              match.display_name ||
              match.task_name
          );

      }

  }, [items, value, displayValue]);

useEffect(() => {
  function handleClickOutside(event: MouseEvent) {
    if (
      wrapperRef.current &&
      !wrapperRef.current.contains(event.target as Node)
    ) {
      setOpen(false);
    }
  }

  document.addEventListener("mousedown", handleClickOutside);

  return () => {
    document.removeEventListener(
      "mousedown",
      handleClickOutside
    );
  };
}, []);

  return (
    <div className="relative" ref={wrapperRef}>
      <label className="block text-sm font-medium mb-2">
        {label}
      </label>

      <input
        type="text"
        value={query}
        placeholder={placeholder}
        onFocus={() => setOpen(true)}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        className="
        w-full
        rounded-xl
        border
        border-zinc-800
        bg-zinc-950
        text-white
        p-3
        truncate
        "
      />

      {open && (
        <div className="absolute z-50 mt-1 w-full bg-zinc-900 border border-zinc-800 rounded-xl max-h-60 overflow-y-auto shadow-lg">
          {filtered.map((item) => (
            <button
              key={item.outline_number}
              type="button"
              className="block w-full text-left px-3 py-2 text-white hover:bg-zinc-800"
              onClick={() => {
                onSelect(
                    item.outline_number,
                    item
                );

                setQuery(
                  item.display_name ||
                  item.task_name
                );

                setOpen(false);
              }}
            >
              <div>
                <div>
                  {item.display_name ||
                    item.task_name}
                </div>

                {item.show_context &&
                  item.context_name && (
                    <div className="text-xs text-zinc-500">
                      ↳ {item.context_name}
                    </div>
                  )}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}