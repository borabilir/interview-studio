export type ThemePreference = "light" | "dark" | "system";
export type AccentColor = "indigo" | "blue" | "violet" | "emerald" | "rose" | "orange";
export type AppLanguage = "en" | "tr";
export type AIProvider = "openai" | "azure-openai" | "anthropic" | "local";

export interface EditorSettings {
  fontSize: number;
  tabSize: 2 | 4;
  wordWrap: boolean;
  minimap: boolean;
  autoFormat: boolean;
  ligatures: boolean;
}

export interface UserSettings {
  theme: ThemePreference;
  accent: AccentColor;
  fontSize: "small" | "medium" | "large";
  language: AppLanguage;
  aiProvider: AIProvider;
  apiKey?: string;
  autoSave: boolean;
  editor: EditorSettings;
}

