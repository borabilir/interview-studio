import { useState } from "react";
import { accentColors, useAppearance, type AccentColor } from "../hooks/use-appearance";
import { useTheme } from "../hooks/use-theme";
import { useLocalStorage } from "../hooks/use-local-storage";
import { useI18n } from "../i18n";
import {
  Accessibility,
  Bot,
  Check,
  ChevronDown,
  CircleHelp,
  Code2,
  Database,
  Download,
  Eye,
  EyeOff,
  Globe2,
  KeyRound,
  Keyboard,
  Laptop,
  Moon,
  Palette,
  Save,
  Settings2,
  ShieldCheck,
  Sparkles,
  Sun,
  Upload,
  UserRound,
} from "lucide-react";
import {
  ActionButton,
  PageHeader,
  Panel,
  StatusPill,
} from "../components/features/FeaturePrimitives";
import { cn } from "../components/features/featureClassNames";

const sections = [
  { label: "Appearance", icon: Palette },
  { label: "Editor", icon: Code2 },
  { label: "AI & models", icon: Sparkles },
  { label: "Preferences", icon: Settings2 },
  { label: "Shortcuts", icon: Keyboard },
  { label: "Data & privacy", icon: ShieldCheck },
] as const;

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (checked: boolean) => void; label: string }) {
  return (
    <button type="button" role="switch" aria-checked={checked} aria-label={label} onClick={() => onChange(!checked)} className={cn("relative h-6 w-10 rounded-full transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50", checked ? "bg-primary" : "bg-muted-foreground/25")}>
      <span className={cn("absolute top-0.5 size-5 rounded-full bg-white shadow-sm transition-transform", checked ? "translate-x-[18px]" : "translate-x-0.5")} />
    </button>
  );
}

function SettingRow({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return <div className="flex flex-col gap-4 border-b border-border/60 py-5 last:border-0 sm:flex-row sm:items-center sm:justify-between"><div className="max-w-lg"><p className="text-sm font-medium text-foreground">{title}</p><p className="mt-1 text-xs leading-5 text-muted-foreground">{description}</p></div><div className="shrink-0">{children}</div></div>;
}

export default function SettingsPage() {
  const [section, setSection] = useState<(typeof sections)[number]["label"]>("Appearance");
  const { theme, setTheme } = useTheme();
  const { t, language, setLanguage } = useI18n();
  const { accent, setAccent, fontSize, setFontSize, reduceMotion, setReduceMotion } = useAppearance();
  const [autoSave, setAutoSave] = useLocalStorage("auto-save", true);
  const [cloudSync, setCloudSync] = useLocalStorage("cloud-sync", false);
  const [aiSuggestions, setAiSuggestions] = useLocalStorage("ai-suggestions", true);
  const [minimap, setMinimap] = useLocalStorage("editor-minimap", true);
  const [wordWrap, setWordWrap] = useLocalStorage("editor-word-wrap", true);
  const [editorFontSize, setEditorFontSize] = useLocalStorage("editor-font-size", 14);
  const [formatOnSave, setFormatOnSave] = useLocalStorage("editor-format-on-save", true);
  const [showKey, setShowKey] = useState(false);
  const [saved, setSaved] = useState(false);

  const save = () => { setSaved(true); window.setTimeout(() => setSaved(false), 1800); };
  const sectionLabel = (label: (typeof sections)[number]["label"]) => ({
    Appearance: t("Görünüm", "Appearance"),
    Editor: t("Editör", "Editor"),
    "AI & models": t("AI ve modeller", "AI & models"),
    Preferences: t("Tercihler", "Preferences"),
    Shortcuts: t("Kısayollar", "Shortcuts"),
    "Data & privacy": t("Veri ve gizlilik", "Data & privacy"),
  })[label];

  return (
    <div className="mx-auto w-full max-w-[1320px] space-y-7">
      <PageHeader
        eyebrow={t("Çalışma alanını kişiselleştir", "Personalize your studio")}
        title={t("Ayarlar", "Settings")}
        description={t("Çalışma, yazma, kodlama ve AI kullanım biçimine göre çalışma alanını şekillendir.", "Shape the workspace around how you study, write, code, and use AI.")}
        actions={<ActionButton icon={saved ? Check : Save} variant="primary" onClick={save}>{saved ? t("Kaydedildi", "Saved") : t("Değişiklikleri kaydet", "Save changes")}</ActionButton>}
      />

      <div className="grid gap-6 lg:grid-cols-[230px_minmax(0,1fr)]">
        <nav className="h-fit space-y-1 lg:sticky lg:top-5" aria-label={t("Ayar bölümleri", "Settings sections")}>
          <div className="mb-3 flex items-center gap-3 rounded-2xl border border-border bg-card p-3"><div className="grid size-9 place-items-center rounded-xl bg-gradient-to-br from-primary to-violet-500 text-xs font-semibold text-white">BK</div><div className="min-w-0"><p className="truncate text-xs font-semibold text-foreground">Bora Kasmer</p><p className="mt-0.5 truncate text-[10px] text-muted-foreground">bora@example.com</p></div></div>
          {sections.map(({ label, icon: Icon }) => <button key={label} type="button" onClick={() => setSection(label)} className={cn("flex h-10 w-full items-center gap-3 rounded-xl px-3 text-left text-xs font-medium transition", section === label ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground")}><Icon className="size-4" />{sectionLabel(label)}</button>)}
          <div className="my-2 h-px bg-border" />
          <button type="button" className="flex h-10 w-full items-center gap-3 rounded-xl px-3 text-xs font-medium text-muted-foreground transition hover:bg-muted hover:text-foreground"><UserRound className="size-4" />{t("Hesap", "Account")}</button>
          <button type="button" className="flex h-10 w-full items-center gap-3 rounded-xl px-3 text-xs font-medium text-muted-foreground transition hover:bg-muted hover:text-foreground"><CircleHelp className="size-4" />{t("Yardım ve geri bildirim", "Help & feedback")}</button>
        </nav>

        <div className="min-w-0 space-y-5">
          {section === "Appearance" ? (
            <>
              <Panel className="overflow-hidden">
                <div className="border-b border-border/70 px-5 py-4"><h2 className="text-sm font-semibold text-foreground">{t("Görünüm", "Appearance")}</h2><p className="mt-1 text-xs text-muted-foreground">{t("Interview Studio'nun görünümünü ve hissini seç.", "Choose how Interview Studio looks and feels.")}</p></div>
                <div className="px-5">
                  <SettingRow title={t("Arayüz teması", "Interface theme")} description={t("Açık, koyu veya sistemle eşleşen çalışma alanını kullan.", "Use a light, dark, or system-matched workspace.")}>
                    <div className="grid grid-cols-3 gap-2">{([{ tr: "Açık", en: "Light", value: "light", icon: Sun }, { tr: "Koyu", en: "Dark", value: "dark", icon: Moon }, { tr: "Sistem", en: "System", value: "system", icon: Laptop }] as const).map(({ tr, en, value, icon: Icon }) => <button key={value} type="button" onClick={() => setTheme(value)} className={cn("flex w-24 flex-col items-center gap-2 rounded-2xl border p-3 text-[11px] font-medium transition", theme === value ? "border-primary bg-primary/5 text-primary ring-2 ring-primary/10" : "border-border text-muted-foreground hover:bg-muted")}><Icon className="size-4" />{t(tr, en)}</button>)}</div>
                  </SettingRow>
                  <SettingRow title={t("Vurgu rengi", "Accent color")} description={t("Odak, ilerleme, seçim ve vurgularda kullanılır.", "Used for focus, progress, selected states, and highlights.")}>
                    <div className="flex gap-2">{(Object.entries(accentColors) as Array<[AccentColor, string]>).map(([name, color]) => <button key={name} type="button" aria-label={t(`${name} vurgu rengi`, `${name} accent`)} onClick={() => setAccent(name)} className={cn("grid size-9 place-items-center rounded-xl border transition", accent === name ? "border-foreground/25 bg-muted ring-2 ring-ring/25" : "border-transparent hover:bg-muted")}><span className="grid size-5 place-items-center rounded-full" style={{ backgroundColor: `rgb(${color})` }}>{accent === name ? <Check className="size-3 text-white" /> : null}</span></button>)}</div>
                  </SettingRow>
                  <SettingRow title={t("Arayüz yazı boyutu", "Interface text size")} description={t("Uygulamadaki etiketleri ve okuma alanlarını ayarla.", "Adjust labels and reading surfaces across the app.")}>
                    <div className="flex items-center gap-3"><span className="text-[10px] text-muted-foreground">A</span><input type="range" min="13" max="18" value={fontSize} onChange={(event) => setFontSize(Number(event.target.value))} aria-label={t("Arayüz font boyutu", "Interface font size")} className="w-36 accent-primary" /><span className="text-base text-foreground">A</span><span className="w-9 rounded-lg bg-muted px-2 py-1 text-center text-[10px] font-medium text-foreground">{fontSize}</span></div>
                  </SettingRow>
                  <SettingRow title={t("Hareketi azalt", "Reduce motion")} description={t("Arayüzdeki geçişleri ve mekânsal animasyonları en aza indir.", "Minimize transitions and spatial animations throughout the interface.")}><Toggle checked={reduceMotion} onChange={setReduceMotion} label={t("Hareketi azalt", "Reduce motion")} /></SettingRow>
                </div>
              </Panel>
              <Panel className="p-5"><div className="flex items-center gap-3"><div className="grid size-9 place-items-center rounded-xl bg-violet-500/10 text-violet-500"><Accessibility className="size-4" /></div><div><p className="text-xs font-semibold text-foreground">{t("Odak için tasarlandı", "Designed for focus")}</p><p className="mt-1 text-[11px] leading-5 text-muted-foreground">{t("Kontrast, keyboard focus ve azaltılmış hareket tercihleri tüm çalışma modlarında korunur.", "Contrast, keyboard focus, and reduced-motion preferences are respected across study modes.")}</p></div></div></Panel>
            </>
          ) : section === "Editor" ? (
            <Panel className="overflow-hidden">
              <div className="border-b border-border/70 px-5 py-4"><h2 className="text-sm font-semibold text-foreground">{t("Kod editörü", "Code editor")}</h2><p className="mt-1 text-xs text-muted-foreground">{t("Coding soruları ve code block'ları için varsayılanlar.", "Defaults for coding questions and code blocks.")}</p></div>
              <div className="px-5">
                <SettingRow title={t("Editör fontu", "Editor font")} description={t("Monaco'da kullanılan monospaced fontu seç.", "Choose the monospaced font used in Monaco.")}><button type="button" className="flex h-9 min-w-44 items-center justify-between rounded-xl border border-border bg-background px-3 text-xs text-foreground">JetBrains Mono <ChevronDown className="size-3.5 text-muted-foreground" /></button></SettingRow>
                <SettingRow title={t("Font boyutu", "Font size")} description={t("Temel editör boyutunu arayüzden bağımsız ayarla.", "Set the base editor size independently from the UI.")}><div className="flex items-center rounded-xl border border-border bg-background"><button type="button" onClick={() => setEditorFontSize((value) => Math.max(11, value - 1))} className="size-9 text-muted-foreground" aria-label={t("Editör fontunu küçült", "Decrease editor font size")}>−</button><span className="w-9 text-center text-xs font-semibold text-foreground">{editorFontSize}</span><button type="button" onClick={() => setEditorFontSize((value) => Math.min(22, value + 1))} className="size-9 text-muted-foreground" aria-label={t("Editör fontunu büyüt", "Increase editor font size")}>+</button></div></SettingRow>
                <SettingRow title="Word wrap" description={t("Uzun satırları editör genişliğine göre sar.", "Wrap long lines to the editor width.")}><Toggle checked={wordWrap} onChange={setWordWrap} label="Word wrap" /></SettingRow>
                <SettingRow title="Minimap" description={t("Kodun yanında kompakt bir doküman görünümü göster.", "Show a compact document overview beside code.")}><Toggle checked={minimap} onChange={setMinimap} label="Editor minimap" /></SettingRow>
                <SettingRow title={t("Kaydederken formatla", "Format on save")} description={t("Desteklenen dilleri solution kaydedildiğinde otomatik formatla.", "Automatically format supported languages when a solution is saved.")}><Toggle checked={formatOnSave} onChange={setFormatOnSave} label={t("Kaydederken formatla", "Format on save")} /></SettingRow>
              </div>
            </Panel>
          ) : section === "AI & models" ? (
            <div className="space-y-5">
              <Panel className="overflow-hidden"><div className="border-b border-border/70 px-5 py-4"><div className="flex items-center justify-between"><div><h2 className="text-sm font-semibold text-foreground">{t("AI provider", "AI provider")}</h2><p className="mt-1 text-xs text-muted-foreground">{t("Değerlendirme, içerik üretimi ve mülakat koçunu yapılandır.", "Configure evaluations, generation, and your interview coach.")}</p></div><StatusPill tone="success">{t("Bağlı", "Connected")}</StatusPill></div></div><div className="px-5">
                <SettingRow title="Provider" description={t("AI özellikleri için kullanılan servis.", "The service used for AI features.")}><button type="button" className="flex h-9 min-w-44 items-center gap-2 rounded-xl border border-border bg-background px-3 text-xs text-foreground"><span className="grid size-5 place-items-center rounded-md bg-foreground text-[8px] font-bold text-background">AI</span>OpenAI <ChevronDown className="ml-auto size-3.5 text-muted-foreground" /></button></SettingRow>
                <SettingRow title={t("Varsayılan model", "Default model")} description={t("Ayrıntılı geri bildirim ve hızlı iteration için dengeli.", "Balanced for detailed feedback and fast iteration.")}><button type="button" className="flex h-9 min-w-44 items-center justify-between rounded-xl border border-border bg-background px-3 text-xs text-foreground">GPT-4.1 <ChevronDown className="size-3.5 text-muted-foreground" /></button></SettingRow>
                <SettingRow title="API key" description={t("Güvenli saklanır ve export dosyalarına eklenmez.", "Stored securely and never included in exports.")}><div className="flex items-center rounded-xl border border-border bg-background px-3"><KeyRound className="size-3.5 text-muted-foreground" /><input type={showKey ? "text" : "password"} placeholder="sk-…" className="h-9 w-44 bg-transparent px-2 font-mono text-[10px] text-foreground outline-none placeholder:text-muted-foreground" aria-label="OpenAI API key" autoComplete="off" /><button type="button" onClick={() => setShowKey((value) => !value)} aria-label={showKey ? t("API key'i gizle", "Hide API key") : t("API key'i göster", "Show API key")} className="text-muted-foreground">{showKey ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}</button></div></SettingRow>
                <SettingRow title={t("AI önerileri", "AI suggestions")} description={t("Proaktif çalışma, yazma ve kod önerilerini göster.", "Show proactive study, writing, and code recommendations.")}><Toggle checked={aiSuggestions} onChange={setAiSuggestions} label={t("AI önerileri", "AI suggestions")} /></SettingRow>
              </div></Panel>
              <Panel className="p-5"><div className="flex gap-3"><div className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary"><Bot className="size-4" /></div><div><p className="text-xs font-semibold text-foreground">{t("Bağlantıyı test et", "Test your connection")}</p><p className="mt-1 text-[11px] text-muted-foreground">{t("Deneme mülakatından önce key ve modeli doğrula.", "Verify the key and model before starting a mock interview.")}</p><ActionButton className="mt-3 h-8 text-[11px]">{t("Bağlantı testini çalıştır", "Run connection test")}</ActionButton></div></div></Panel>
            </div>
          ) : section === "Preferences" ? (
            <Panel className="overflow-hidden"><div className="border-b border-border/70 px-5 py-4"><h2 className="text-sm font-semibold text-foreground">{t("Tercihler", "Preferences")}</h2><p className="mt-1 text-xs text-muted-foreground">{t("Dil, kayıt ve çalışma davranışı.", "Language, saving, and study behavior.")}</p></div><div className="px-5"><SettingRow title={t("Dil", "Language")} description={t("Arayüz ve oluşturulan çalışma içerikleri için kullanılır.", "Used for the interface and generated study material.")}><div className="flex rounded-xl border border-border bg-background p-1"><button type="button" onClick={() => setLanguage("tr")} className={cn("flex h-8 items-center gap-2 rounded-lg px-3 text-xs font-medium transition", language === "tr" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted")}><Globe2 className="size-3.5" />Türkçe</button><button type="button" onClick={() => setLanguage("en")} className={cn("h-8 rounded-lg px-3 text-xs font-medium transition", language === "en" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted")}>English</button></div></SettingRow><SettingRow title={t("Otomatik kayıt", "Auto-save")} description={t("Notları, kodu ve tasarım çalışmalarını sürekli kaydet.", "Continuously save notes, code, and design work.")}><Toggle checked={autoSave} onChange={setAutoSave} label={t("Otomatik kayıt", "Auto-save")} /></SettingRow><SettingRow title={t("Cloud sync", "Cloud sync")} description={t("Çalışma verilerini cihazların arasında eşitle.", "Keep study data synchronized across your devices.")}><Toggle checked={cloudSync} onChange={setCloudSync} label={t("Cloud sync", "Cloud sync")} /></SettingRow></div></Panel>
          ) : section === "Shortcuts" ? (
            <Panel className="overflow-hidden"><div className="border-b border-border/70 px-5 py-4"><h2 className="text-sm font-semibold text-foreground">{t("Keyboard kısayolları", "Keyboard shortcuts")}</h2><p className="mt-1 text-xs text-muted-foreground">{t("Klavyeden ayrılmadan hızlı hareket et.", "Move quickly without leaving the keyboard.")}</p></div><div className="divide-y divide-border/60 px-5">{[{ name: t("Global aramayı aç", "Open global search"), keys: ["⌘", "K"] }, { name: t("Yeni not oluştur", "Create a new note"), keys: ["⌘", "N"] }, { name: t("Mevcut çalışmayı kaydet", "Save current work"), keys: ["⌘", "S"] }, { name: t("Coding solution'ı gönder", "Submit coding solution"), keys: ["⌘", "↵"] }, { name: t("Kenar çubuğunu değiştir", "Toggle sidebar"), keys: ["⌘", "\\"] }].map((shortcut) => <div key={shortcut.name} className="flex items-center justify-between py-4"><p className="text-xs font-medium text-foreground">{shortcut.name}</p><div className="flex gap-1">{shortcut.keys.map((key) => <kbd key={key} className="min-w-7 rounded-lg border border-border bg-muted/50 px-2 py-1.5 text-center font-mono text-[10px] text-muted-foreground shadow-sm">{key}</kbd>)}</div></div>)}</div></Panel>
          ) : (
            <div className="space-y-5">
              <Panel className="overflow-hidden"><div className="border-b border-border/70 px-5 py-4"><h2 className="text-sm font-semibold text-foreground">{t("Veri ve gizlilik", "Data & privacy")}</h2><p className="mt-1 text-xs text-muted-foreground">{t("Çalışma verilerinin kontrolü sende kalır.", "Your study data stays under your control.")}</p></div><div className="px-5"><SettingRow title={t("Çalışma alanını export et", "Export workspace")} description={t("Notları, kartları, ilerlemeyi ve attempt'ları taşınabilir bir arşiv olarak indir.", "Download notes, cards, progress, and attempts as a portable archive.")}><ActionButton icon={Download}>{t("Veriyi export et", "Export data")}</ActionButton></SettingRow><SettingRow title={t("Çalışma alanını import et", "Import workspace")} description={t("Interview Studio arşivinden veya JSON dosyasından geri yükle.", "Restore from an Interview Studio archive or JSON file.")}><ActionButton icon={Upload}>{t("Dosya seç", "Choose file")}</ActionButton></SettingRow><SettingRow title={t("Yerel veritabanı", "Local database")} description={t("Yerel SQLite veritabanını optimize et ve doğrula.", "Compact and verify the local SQLite store.")}><ActionButton icon={Database}>{t("Veritabanını yönet", "Manage database")}</ActionButton></SettingRow></div></Panel>
              <Panel className="border-rose-500/20 p-5"><div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-sm font-semibold text-foreground">{t("Tüm çalışma verilerini sil", "Delete all study data")}</p><p className="mt-1 text-xs text-muted-foreground">{t("Notları, soruları, tekrarları ve ilerleme geçmişini kalıcı olarak kaldır.", "Permanently remove notes, questions, reviews, and progress history.")}</p></div><ActionButton className="border-rose-500/30 text-rose-600 hover:bg-rose-500/10 dark:text-rose-400">{t("Veriyi sil", "Delete data")}</ActionButton></div></Panel>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export { SettingsPage };
