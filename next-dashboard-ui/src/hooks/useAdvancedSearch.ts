"use client";

import { useEffect, useMemo, useState } from "react";

type FieldResolver<T> = keyof T | string | ((item: T) => unknown);

type UseAdvancedSearchOptions<T> = {
  items: T[];
  fields: FieldResolver<T>[];
  suggestionField?: FieldResolver<T>;
  debounceMs?: number;
  suggestionLimit?: number;
  initialQuery?: string;
};

type UseAdvancedSearchResult<T> = {
  query: string;
  setQuery: (value: string) => void;
  debouncedQuery: string;
  filteredItems: T[];
  suggestions: string[];
};

function resolvePath(obj: unknown, path: string): unknown {
  if (!obj || !path) return "";

  return path.split(".").reduce<unknown>((acc, key) => {
    if (acc && typeof acc === "object" && key in (acc as Record<string, unknown>)) {
      return (acc as Record<string, unknown>)[key];
    }
    return "";
  }, obj);
}

function toText(value: unknown): string {
  if (value == null) return "";
  if (Array.isArray(value)) return value.map((item) => toText(item)).join(" ");
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "object") return Object.values(value as Record<string, unknown>).map((entry) => toText(entry)).join(" ");
  return String(value);
}

function normalize(value: string): string {
  return value.toLowerCase().trim().replace(/\s+/g, " ");
}

function resolveField<T>(item: T, resolver: FieldResolver<T>): string {
  const raw = typeof resolver === "function"
    ? resolver(item)
    : typeof resolver === "string"
      ? resolvePath(item, resolver)
      : item[resolver as keyof T];

  return toText(raw);
}

function computeScore(text: string, query: string): number {
  if (!query) return 0;
  if (!text) return -1;

  const normalizedText = normalize(text);
  const normalizedQuery = normalize(query);

  if (!normalizedText.includes(normalizedQuery)) {
    const queryChars = normalizedQuery.split("");
    let pointer = 0;

    for (let i = 0; i < normalizedText.length && pointer < queryChars.length; i += 1) {
      if (normalizedText[i] === queryChars[pointer]) {
        pointer += 1;
      }
    }

    if (pointer === queryChars.length) {
      return 12;
    }

    return -1;
  }

  if (normalizedText === normalizedQuery) return 120;
  if (normalizedText.startsWith(normalizedQuery)) return 90;

  const wordPrefix = normalizedText.split(" ").some((token) => token.startsWith(normalizedQuery));
  if (wordPrefix) return 72;

  return 50;
}

export function useAdvancedSearch<T>({
  items,
  fields,
  suggestionField,
  debounceMs = 180,
  suggestionLimit = 6,
  initialQuery = "",
}: UseAdvancedSearchOptions<T>): UseAdvancedSearchResult<T> {
  const [query, setQuery] = useState(initialQuery);
  const [debouncedQuery, setDebouncedQuery] = useState(initialQuery);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => setDebouncedQuery(query), debounceMs);
    return () => window.clearTimeout(timeoutId);
  }, [query, debounceMs]);

  const indexedItems = useMemo(() => {
    return items.map((item) => {
      const aggregateText = fields.map((field) => resolveField(item, field)).join(" ");
      const label = suggestionField ? resolveField(item, suggestionField) : resolveField(item, fields[0]);
      return {
        item,
        aggregateText,
        label,
      };
    });
  }, [items, fields, suggestionField]);

  const filteredItems = useMemo(() => {
    if (!debouncedQuery.trim()) {
      return items;
    }

    const scored = indexedItems
      .map((entry) => ({
        item: entry.item,
        score: computeScore(entry.aggregateText, debouncedQuery),
      }))
      .filter((entry) => entry.score >= 0)
      .sort((a, b) => b.score - a.score);

    return scored.map((entry) => entry.item);
  }, [debouncedQuery, indexedItems, items]);

  const suggestions = useMemo(() => {
    const q = normalize(query);

    const counts = new Map<string, number>();

    indexedItems.forEach((entry) => {
      const label = normalize(entry.label);
      if (!label) return;

      if (!q || label.includes(q)) {
        counts.set(label, (counts.get(label) || 0) + 1);
      }

      label.split(/[^a-z0-9]+/i).forEach((token) => {
        if (token.length < 2) return;
        if (!q || token.startsWith(q)) {
          counts.set(token, (counts.get(token) || 0) + 1);
        }
      });
    });

    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([value]) => value)
      .slice(0, suggestionLimit);
  }, [indexedItems, query, suggestionLimit]);

  return {
    query,
    setQuery,
    debouncedQuery,
    filteredItems,
    suggestions,
  };
}
