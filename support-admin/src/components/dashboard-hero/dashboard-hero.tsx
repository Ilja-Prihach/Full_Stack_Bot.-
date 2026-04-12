"use client";

import { useEffect, useRef } from "react";
import type { ManagerProfile } from "../dashboard-shared";
import styles from "./dashboard-hero.module.css";

type DashboardHeroProps = {
  currentManager: ManagerProfile | null;
  managers: ManagerProfile[];
  totalMessages: number;
  totalChats: number;
  theme: "light" | "dark";
  onToggleTheme: () => void;
  onLogout: () => void;
  isLoggingOut: boolean;
};

function formatManagerName(manager: Pick<ManagerProfile, "first_name" | "last_name" | "email">) {
  const fullName = `${manager.first_name} ${manager.last_name}`.trim();

  return fullName || manager.email;
}

function ThemeIcon({ theme }: { theme: "light" | "dark" }) {
  if (theme === "light") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5 fill-current">
        <path d="M20 14.2A8 8 0 0 1 9.8 4 9 9 0 1 0 20 14.2Z" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5 fill-current">
      <circle cx="12" cy="12" r="4" />
      <path
        d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M19.1 4.9 17 7M7 17l-2.1 2.1"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  );
}

export function DashboardHero({
  currentManager = null,
  managers = [],
  totalMessages,
  totalChats,
  theme,
  onToggleTheme,
  onLogout,
  isLoggingOut,
}: DashboardHeroProps) {
  const managerMenuRef = useRef<HTMLDetailsElement | null>(null);

  useEffect(() => {
    function handlePointerDown(event: PointerEvent) {
      const managerMenu = managerMenuRef.current;

      if (!managerMenu?.open) {
        return;
      }

      if (event.target instanceof Node && !managerMenu.contains(event.target)) {
        managerMenu.open = false;
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && managerMenuRef.current?.open) {
        managerMenuRef.current.open = false;
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  return (
    <section
      className={`${styles.heroSection} rounded-[24px] border px-4 py-4 shadow-[var(--shadow)] sm:px-5 sm:py-4 lg:rounded-[28px] lg:px-6`}
    >
      <div className="flex flex-col gap-3 text-white lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 flex-col gap-2">
          <h1 className="text-xl font-semibold tracking-tight sm:text-2xl lg:text-[1.9rem]">
            SupportBot — Сообщения
          </h1>
          <div className={`${styles.statsGrid} flex flex-wrap gap-2 text-xs sm:text-sm`}>
            <div className={`${styles.statCard} rounded-full px-3 py-1.5`}>
              <span className="text-white/68">Сообщений</span>
              <span className="ml-2 font-semibold text-white">{totalMessages}</span>
            </div>
            <div className={`${styles.statCard} rounded-full px-3 py-1.5`}>
              <span className="text-white/68">Чатов</span>
              <span className="ml-2 font-semibold text-white">{totalChats}</span>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2">
          <details ref={managerMenuRef} className={`${styles.managerMenu} min-w-0`}>
            <summary
              className={`${styles.managerSummary} flex list-none items-center gap-2 rounded-full px-3 py-1.5 text-left text-white transition`}
            >
              <span className={`${styles.managerAvatar} flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold`}>
                {currentManager
                  ? `${currentManager.first_name[0] ?? ""}${currentManager.last_name[0] ?? ""}`.trim() || "M"
                  : "?"}
              </span>
              <span className="min-w-0">
                <span className="block truncate text-sm font-medium leading-5">
                  {currentManager ? formatManagerName(currentManager) : "Менеджер"}
                </span>
                <span className="block truncate text-[11px] leading-4 text-white/72">
                  {currentManager?.position ?? "Профиль не найден"}
                </span>
              </span>
            </summary>

            <div className={`${styles.managerPopover} absolute right-0 top-[calc(100%+0.75rem)] z-20 w-[min(24rem,calc(100vw-2rem))] rounded-[24px] p-4 text-slate-900 shadow-2xl`}>
              <div className={`${styles.managerSection} rounded-2xl p-4`}>
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Вы вошли как
                </div>
                <div className="mt-3 text-base font-semibold text-slate-950">
                  {currentManager ? formatManagerName(currentManager) : "Профиль менеджера не найден"}
                </div>
                <div className="mt-1 text-sm text-slate-600">
                  {currentManager?.position ?? "Добавьте запись в public.managers"}
                </div>
                <div className="mt-3 text-sm text-slate-500">
                  {currentManager?.email ?? "Email недоступен"}
                </div>
              </div>

              <div className="mt-3">
                <div className="flex items-center justify-between px-1">
                  <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Команда
                  </div>
                  <div className="text-xs text-slate-500">{managers.length} менеджеров</div>
                </div>

                <div className="mt-2 max-h-56 space-y-2 overflow-y-auto pr-1">
                  {managers.map((manager) => {
                    const isCurrent = currentManager?.id === manager.id;

                    return (
                      <div
                        key={manager.id}
                        className={`${styles.teamMember} rounded-2xl px-3 py-3 ${isCurrent ? styles.teamMemberCurrent : ""}`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="truncate text-sm font-medium text-slate-950">
                              {formatManagerName(manager)}
                            </div>
                            <div className="mt-1 truncate text-xs text-slate-600">{manager.position}</div>
                            <div className="mt-2 truncate text-xs text-slate-500">{manager.email}</div>
                          </div>
                          {isCurrent ? (
                            <span className={`${styles.currentBadge} shrink-0 rounded-full px-2 py-1 text-[11px] font-medium`}>
                              Вы
                            </span>
                          ) : null}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </details>

          <button
            type="button"
            onClick={onLogout}
            disabled={isLoggingOut}
            className={`${styles.logoutButton} rounded-full px-3 py-1.5 text-sm font-medium text-white transition-opacity disabled:cursor-wait disabled:opacity-70`}
          >
            {isLoggingOut ? "Выход..." : "Выйти"}
          </button>

          <button
            type="button"
            onClick={onToggleTheme}
            className={`${styles.themeToggle} flex h-9 w-9 items-center justify-center rounded-full text-white transition`}
            aria-label={theme === "light" ? "Включить темную тему" : "Включить светлую тему"}
            title={theme === "light" ? "Темная тема" : "Светлая тема"}
          >
            <ThemeIcon theme={theme} />
          </button>
        </div>
      </div>
    </section>
  );
}
