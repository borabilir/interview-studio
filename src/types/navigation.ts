import type { EntityId } from "./common";

export type NavigationIcon =
  | "layout-dashboard"
  | "calendar-check"
  | "library"
  | "notebook-pen"
  | "code-2"
  | "network"
  | "messages-square"
  | "layers-3"
  | "chart-no-axes-combined"
  | "settings"
  | "search";

export interface NavigationBadge {
  label: string;
  tone?: "neutral" | "accent" | "success" | "warning";
}

export interface NavigationItem {
  id: EntityId;
  label: string;
  href: string;
  icon: NavigationIcon;
  shortcut?: string;
  badge?: NavigationBadge;
  exact?: boolean;
}

export interface NavigationSection {
  id: EntityId;
  label?: string;
  items: NavigationItem[];
}

export interface CommandPaletteItem {
  id: EntityId;
  label: string;
  description?: string;
  icon: NavigationIcon;
  group: "Navigate" | "Create" | "Study" | "Settings";
  keywords: string[];
  href?: string;
  action?: "new-note" | "new-coding-attempt" | "start-mock" | "toggle-theme";
  shortcut?: string;
}

