import { useCallback, useEffect, useMemo, useState } from "react";
import type { CommandPaletteItem } from "../types";

function matchesQuery(item: CommandPaletteItem, query: string): boolean {
  const normalizedQuery = query.trim().toLocaleLowerCase();
  if (!normalizedQuery) return true;

  return [item.label, item.description ?? "", ...item.keywords]
    .join(" ")
    .toLocaleLowerCase()
    .includes(normalizedQuery);
}

export function useCommandPalette(items: CommandPaletteItem[] = []) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);

  const filteredItems = useMemo(
    () => items.filter((item) => matchesQuery(item, query)),
    [items, query],
  );

  const open = useCallback(() => {
    setIsOpen(true);
    setActiveIndex(0);
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
    setQuery("");
    setActiveIndex(0);
  }, []);

  const toggle = useCallback(() => {
    setIsOpen((current) => {
      if (current) setQuery("");
      return !current;
    });
    setActiveIndex(0);
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        toggle();
      } else if (event.key === "Escape" && isOpen) {
        event.preventDefault();
        close();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [close, isOpen, toggle]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  const moveActive = useCallback((direction: 1 | -1) => {
    setActiveIndex((current) => {
      if (!filteredItems.length) return 0;
      return (current + direction + filteredItems.length) % filteredItems.length;
    });
  }, [filteredItems.length]);

  return {
    isOpen,
    query,
    setQuery,
    activeIndex,
    setActiveIndex,
    activeItem: filteredItems[activeIndex],
    filteredItems,
    open,
    close,
    toggle,
    moveActive,
  };
}
