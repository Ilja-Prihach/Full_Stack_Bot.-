import styles from "./dashboard-hero.module.css";

type DashboardHeroProps = {
  totalMessages: number;
  totalChats: number;
  theme: "light" | "dark";
  onToggleTheme: () => void;
  onLogout: () => void;
  isLoggingOut: boolean;
};

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
  totalMessages,
  totalChats,
  theme,
  onToggleTheme,
  onLogout,
  isLoggingOut,
}: DashboardHeroProps) {
  return (
    <section
      className={`${styles.heroSection} overflow-hidden rounded-[28px] border px-4 py-5 shadow-[var(--shadow)] sm:px-6 sm:py-6 lg:rounded-[32px] lg:px-8`}
    >
      <div className="flex flex-col gap-3 text-white sm:gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-2xl">
          <h1 className="mt-2 text-2xl font-semibold tracking-tight sm:mt-3 sm:text-3xl lg:text-4xl">
            SupportBot — Сообщения
          </h1>
        </div>

        <div className={`${styles.statsGrid} grid grid-cols-2 gap-2 text-sm sm:gap-3`}>
          <div className={`${styles.statCard} min-w-0 rounded-2xl p-3 sm:p-4`}>
            <div className="text-white/68">Всего сообщений</div>
            <div className="mt-2 text-xl font-semibold sm:text-2xl">{totalMessages}</div>
          </div>
          <div className={`${styles.statCard} min-w-0 rounded-2xl p-3 sm:p-4`}>
            <div className="text-white/68">Чатов</div>
            <div className="mt-2 text-xl font-semibold sm:text-2xl">{totalChats}</div>
          </div>
        </div>

        <div className="flex items-center gap-2 lg:self-start">
          <button
            type="button"
            onClick={onLogout}
            disabled={isLoggingOut}
            className={`${styles.logoutButton} rounded-full px-4 py-2 text-sm font-medium text-white transition-opacity disabled:cursor-wait disabled:opacity-70`}
          >
            {isLoggingOut ? "Выход..." : "Выйти"}
          </button>

          <button
            type="button"
            onClick={onToggleTheme}
            className={`${styles.themeToggle} flex h-11 w-11 items-center justify-center rounded-full text-white transition sm:h-12 sm:w-12`}
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
