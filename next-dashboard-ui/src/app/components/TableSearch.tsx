"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";

type TableSearchProps = {
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  suggestions?: string[];
  onSuggestionSelect?: (value: string) => void;
};

const TableSearch = ({
  value,
  onChange,
  placeholder = "Search...",
  suggestions = [],
  onSuggestionSelect,
}: TableSearchProps) => {
  const [internalValue, setInternalValue] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const currentValue = value ?? internalValue;

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const visibleSuggestions = useMemo(() => {
    if (!currentValue.trim()) {
      return suggestions.slice(0, 6);
    }

    const lower = currentValue.toLowerCase();
    const startsWith = suggestions.filter((item) => item.toLowerCase().startsWith(lower));
    const contains = suggestions.filter(
      (item) => !item.toLowerCase().startsWith(lower) && item.toLowerCase().includes(lower)
    );

    return [...startsWith, ...contains].slice(0, 6);
  }, [currentValue, suggestions]);

  const updateValue = (next: string) => {
    if (typeof value === "undefined") {
      setInternalValue(next);
    }
    onChange?.(next);
  };

  const selectSuggestion = (next: string) => {
    updateValue(next);
    onSuggestionSelect?.(next);
    setShowSuggestions(false);
    setActiveIndex(-1);
  };

  const onInputKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (!visibleSuggestions.length) {
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setShowSuggestions(true);
      setActiveIndex((prev) => (prev + 1) % visibleSuggestions.length);
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      setShowSuggestions(true);
      setActiveIndex((prev) => (prev <= 0 ? visibleSuggestions.length - 1 : prev - 1));
    }

    if (event.key === "Enter" && activeIndex >= 0) {
      event.preventDefault();
      selectSuggestion(visibleSuggestions[activeIndex]);
    }

    if (event.key === "Escape") {
      setShowSuggestions(false);
      setActiveIndex(-1);
    }
  };

  return (
    <div className="relative w-full md:w-auto" ref={containerRef}>
      <div className="w-full md:w-auto flex items-center gap-2 text-xs rounded-full ring-[1.5px] ring-gray-300 px-2 bg-white">
        <Image src="/search.png" alt="" width={14} height={14} />
        <input
          type="text"
          value={currentValue}
          onChange={(event) => {
            updateValue(event.target.value);
            setShowSuggestions(true);
            setActiveIndex(-1);
          }}
          onFocus={() => setShowSuggestions(true)}
          onKeyDown={onInputKeyDown}
          placeholder={placeholder}
          className="w-full md:w-[240px] p-2 bg-transparent outline-none"
        />
        {!!currentValue && (
          <button
            type="button"
            onClick={() => {
              updateValue("");
              setShowSuggestions(false);
              setActiveIndex(-1);
            }}
            className="text-gray-400 hover:text-gray-700 text-sm"
            aria-label="Clear search"
          >
            x
          </button>
        )}
      </div>

      {showSuggestions && visibleSuggestions.length > 0 && (
        <div className="absolute z-30 mt-2 w-full rounded-xl border border-gray-200 bg-white shadow-lg overflow-hidden">
          {visibleSuggestions.map((suggestion, index) => (
            <button
              key={`${suggestion}-${index}`}
              type="button"
              onClick={() => selectSuggestion(suggestion)}
              className={`w-full text-left px-3 py-2 text-sm hover:bg-[#f8f3e1] ${
                activeIndex === index ? "bg-[#f8f3e1]" : ""
              }`}
            >
              {suggestion}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default TableSearch;