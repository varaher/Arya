import React from "react";
import {
  PanelLeftOpen,
  PanelLeftClose,
  Plus,
  Moon,
  Sun,
  Download,
  LogIn,
} from "lucide-react";
import { getTranslation, getStoredUiLanguage } from "@/lib/i18n";

interface TopBarProps {
  showSidebar: boolean;
  conversationCount: number;
  activeTitle: string;
  theme: "light" | "dark";
  installPrompt: any;
  updateAvailable: boolean;
  onToggleSidebar: () => void;
  onNewChat: () => void;
  onToggleTheme: () => void;
  onInstallApp: () => void;
  rightSlot?: React.ReactNode;
}

export default function TopBar({
  showSidebar,
  conversationCount,
  activeTitle,
  theme,
  installPrompt,
  updateAvailable,
  onToggleSidebar,
  onNewChat,
  onToggleTheme,
  onInstallApp,
  rightSlot,
}: TopBarProps) {
  const lang = getStoredUiLanguage();
  const t = (key: string) => getTranslation(lang, key as any);

  return (
    <div className="flex items-center justify-between px-3 py-2 md:hidden border-b border-gray-200 dark:border-slate-700">
      {/* Left — history / sidebar toggle */}
      <button
        data-testid="button-toggle-conversations"
        onClick={onToggleSidebar}
        className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-white/80 dark:bg-slate-900/80 border border-gray-200 dark:border-slate-700 hover:bg-white/90 dark:hover:bg-slate-900/90 transition-all"
      >
        {showSidebar ? (
          <PanelLeftClose className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
        ) : (
          <PanelLeftOpen className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
        )}
        <span className="text-xs font-medium text-gray-700 dark:text-gray-200">
          {t("chat_history") || "History"}
        </span>
        {conversationCount > 0 && (
          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 font-medium">
            {conversationCount}
          </span>
        )}
      </button>

      {/* Centre — active conversation title */}
      <span className="text-sm text-muted-foreground truncate max-w-[30%]">
        {activeTitle}
      </span>

      {/* Right — actions */}
      <div className="flex items-center gap-1">
        {/* New chat */}
        <button
          data-testid="button-new-chat-mobile"
          onClick={onNewChat}
          className="p-1.5 rounded-lg bg-primary/20 border border-primary/30 hover:bg-primary/30 transition-all"
          title={t("new_chat") || "New chat"}
        >
          <Plus className="w-4 h-4 text-primary" />
        </button>

        {/* Install (conditional) */}
        {installPrompt && (
          <button
            data-testid="button-install-app-topbar"
            onClick={onInstallApp}
            title="Install ARYA on your device"
            className="p-1.5 rounded-lg text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-all"
          >
            <Download className="w-4 h-4" />
          </button>
        )}

        {/* Dark / light toggle */}
        <button
          data-testid="button-toggle-theme"
          onClick={onToggleTheme}
          className="p-1.5 rounded-lg transition-all text-gray-400 dark:text-gray-500 hover:text-gray-500 dark:hover:text-gray-300"
          title={
            theme === "light" ? "Switch to dark mode" : "Switch to light mode"
          }
        >
          {theme === "light" ? (
            <Moon className="w-4 h-4" />
          ) : (
            <Sun className="w-4 h-4" />
          )}
        </button>

        {/* Notification bell + user avatar/login — injected from parent */}
        {rightSlot}
      </div>
    </div>
  );
}
