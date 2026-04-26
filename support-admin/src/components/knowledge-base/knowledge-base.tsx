"use client";

import { useDeferredValue, useEffect, useMemo, useState, useTransition } from "react";

type KbCategory = {
  id: number;
  name: string;
  description: string | null;
  created_at: string;
};

type KbEntry = {
  id: number;
  category_id: number | null;
  question: string;
  answer: string;
  keywords: string[];
  status: string;
  is_active: boolean;
  created_by_manager_id: number | null;
  created_at: string;
  updated_at: string;
};

type CategoriesResponse = {
  ok?: boolean;
  categories?: KbCategory[];
  error?: string;
};

type EntriesResponse = {
  ok?: boolean;
  entries?: KbEntry[];
  error?: string;
};

function parseKeywords(value: string) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("ru-RU", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function truncateText(value: string, maxLength: number) {
  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, maxLength).trim()}...`;
}

export function KnowledgeBase() {
  const [categories, setCategories] = useState<KbCategory[]>([]);
  const [entries, setEntries] = useState<KbEntry[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [selectedEntryId, setSelectedEntryId] = useState<number | null>(null);

  const [categoryName, setCategoryName] = useState("");
  const [categoryDescription, setCategoryDescription] = useState("");

  const [createCategoryId, setCreateCategoryId] = useState("");
  const [createQuestion, setCreateQuestion] = useState("");
  const [createAnswer, setCreateAnswer] = useState("");
  const [createKeywords, setCreateKeywords] = useState("");

  const [editingCategoryId, setEditingCategoryId] = useState<number | null>(null);
  const [editingCategoryName, setEditingCategoryName] = useState("");
  const [editingCategoryDescription, setEditingCategoryDescription] = useState("");

  const [isEditingEntry, setIsEditingEntry] = useState(false);
  const [editingEntryCategoryId, setEditingEntryCategoryId] = useState("");
  const [editingQuestion, setEditingQuestion] = useState("");
  const [editingAnswer, setEditingAnswer] = useState("");
  const [editingKeywords, setEditingKeywords] = useState("");
  const [editingIsActive, setEditingIsActive] = useState(true);

  const [isLoading, startLoading] = useTransition();
  const [isSavingCategory, startSavingCategory] = useTransition();
  const [isSavingEntry, startSavingEntry] = useTransition();
  const [isUpdatingCategory, startUpdatingCategory] = useTransition();
  const [isDeletingCategory, startDeletingCategory] = useTransition();
  const [isUpdatingEntry, startUpdatingEntry] = useTransition();
  const [isDeletingEntry, startDeletingEntry] = useTransition();

  const deferredSearchQuery = useDeferredValue(searchQuery);
  const normalizedSearchQuery = deferredSearchQuery.trim().toLowerCase();

  useEffect(() => {
    startLoading(async () => {
      try {
        const [categoriesResponse, entriesResponse] = await Promise.all([
          fetch("/api/kb/categories"),
          fetch("/api/kb/entries"),
        ]);

        const categoriesPayload = (await categoriesResponse.json()) as CategoriesResponse;
        const entriesPayload = (await entriesResponse.json()) as EntriesResponse;

        if (!categoriesResponse.ok || categoriesPayload.ok === false) {
          throw new Error(categoriesPayload.error ?? "Не удалось загрузить категории");
        }

        if (!entriesResponse.ok || entriesPayload.ok === false) {
          throw new Error(entriesPayload.error ?? "Не удалось загрузить статьи");
        }

        const nextCategories = categoriesPayload.categories ?? [];
        const nextEntries = entriesPayload.entries ?? [];

        setCategories(nextCategories);
        setEntries(nextEntries);
        setSelectedEntryId(nextEntries[0]?.id ?? null);
        setErrorMessage(null);
      } catch (error) {
        setErrorMessage(error instanceof Error ? error.message : "Не удалось загрузить базу знаний");
      }
    });
  }, []);

  const categoryNameById = useMemo(
    () => new Map(categories.map((category) => [category.id, category.name])),
    [categories],
  );

  const filteredEntries = useMemo(() => {
    return entries.filter((entry) => {
      if (categoryFilter && entry.category_id !== Number(categoryFilter)) {
        return false;
      }

      if (!normalizedSearchQuery) {
        return true;
      }

      const categoryName =
        entry.category_id != null ? (categoryNameById.get(entry.category_id) ?? "") : "";

      return (
        entry.question.toLowerCase().includes(normalizedSearchQuery) ||
        entry.answer.toLowerCase().includes(normalizedSearchQuery) ||
        entry.keywords.some((keyword) => keyword.toLowerCase().includes(normalizedSearchQuery)) ||
        categoryName.toLowerCase().includes(normalizedSearchQuery)
      );
    });
  }, [categoryFilter, categoryNameById, entries, normalizedSearchQuery]);

  const selectedEntry =
    filteredEntries.find((entry) => entry.id === selectedEntryId) ??
    entries.find((entry) => entry.id === selectedEntryId) ??
    null;

  useEffect(() => {
    if (!selectedEntryId && filteredEntries.length > 0) {
      setSelectedEntryId(filteredEntries[0].id);
      return;
    }

    if (selectedEntryId && filteredEntries.length > 0) {
      const existsInFiltered = filteredEntries.some((entry) => entry.id === selectedEntryId);

      if (!existsInFiltered) {
        setSelectedEntryId(filteredEntries[0].id);
      }
    }
  }, [filteredEntries, selectedEntryId]);

  function resetCategoryEdit() {
    setEditingCategoryId(null);
    setEditingCategoryName("");
    setEditingCategoryDescription("");
  }

  function startCategoryEdit(category: KbCategory) {
    setEditingCategoryId(category.id);
    setEditingCategoryName(category.name);
    setEditingCategoryDescription(category.description ?? "");
  }

  function startEntryEdit(entry: KbEntry) {
    setIsEditingEntry(true);
    setEditingEntryCategoryId(entry.category_id ? String(entry.category_id) : "");
    setEditingQuestion(entry.question);
    setEditingAnswer(entry.answer);
    setEditingKeywords(entry.keywords.join(", "));
    setEditingIsActive(entry.is_active);
  }

  function resetEntryEdit() {
    setIsEditingEntry(false);
    setEditingEntryCategoryId("");
    setEditingQuestion("");
    setEditingAnswer("");
    setEditingKeywords("");
    setEditingIsActive(true);
  }

  function syncEntryEditor(entry: KbEntry) {
    setEditingEntryCategoryId(entry.category_id ? String(entry.category_id) : "");
    setEditingQuestion(entry.question);
    setEditingAnswer(entry.answer);
    setEditingKeywords(entry.keywords.join(", "));
    setEditingIsActive(entry.is_active);
  }

  async function submitCategoryUpdate() {
    if (!editingCategoryId || !editingCategoryName.trim()) {
      return;
    }

    const response = await fetch(`/api/kb/categories/${editingCategoryId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: editingCategoryName,
        description: editingCategoryDescription || null,
      }),
    });

    const payload = (await response.json()) as {
      ok?: boolean;
      category?: KbCategory;
      error?: string;
    };

    if (!response.ok || payload.ok === false || !payload.category) {
      setErrorMessage(payload.error ?? "Не удалось обновить категорию");
      return;
    }

    setCategories((current) =>
      current
        .map((item) => (item.id === payload.category!.id ? payload.category! : item))
        .sort((left, right) => left.name.localeCompare(right.name)),
    );
    resetCategoryEdit();
    setErrorMessage(null);
  }

  async function submitEntryUpdate() {
    if (!selectedEntry || !editingQuestion.trim() || !editingAnswer.trim()) {
      return;
    }

    const response = await fetch(`/api/kb/entries/${selectedEntry.id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        categoryId: editingEntryCategoryId ? Number(editingEntryCategoryId) : null,
        question: editingQuestion,
        answer: editingAnswer,
        keywords: parseKeywords(editingKeywords),
        isActive: editingIsActive,
      }),
    });

    const payload = (await response.json()) as {
      ok?: boolean;
      entry?: KbEntry;
      error?: string;
    };

    if (!response.ok || payload.ok === false || !payload.entry) {
      setErrorMessage(payload.error ?? "Не удалось обновить статью");
      return;
    }

    setEntries((current) =>
      current.map((item) => (item.id === payload.entry!.id ? payload.entry! : item)),
    );
    setSelectedEntryId(payload.entry.id);
    syncEntryEditor(payload.entry);
    setIsEditingEntry(false);
    setErrorMessage(null);
  }

  function handleCreateCategory(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    startSavingCategory(async () => {
      const response = await fetch("/api/kb/categories", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: categoryName,
          description: categoryDescription || null,
        }),
      });

      const payload = (await response.json()) as {
        ok?: boolean;
        category?: KbCategory;
        error?: string;
      };

      if (!response.ok || payload.ok === false || !payload.category) {
        setErrorMessage(payload.error ?? "Не удалось создать категорию");
        return;
      }

      setCategories((current) =>
        [...current, payload.category!].sort((left, right) => left.name.localeCompare(right.name)),
      );
      setCategoryName("");
      setCategoryDescription("");
      setErrorMessage(null);
    });
  }

  function handleCreateEntry(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    startSavingEntry(async () => {
      const response = await fetch("/api/kb/entries", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          categoryId: createCategoryId ? Number(createCategoryId) : null,
          question: createQuestion,
          answer: createAnswer,
          keywords: parseKeywords(createKeywords),
          isActive: true,
        }),
      });

      const payload = (await response.json()) as {
        ok?: boolean;
        entry?: KbEntry;
        error?: string;
      };

      if (!response.ok || payload.ok === false || !payload.entry) {
        setErrorMessage(payload.error ?? "Не удалось создать статью");
        return;
      }

      setEntries((current) => [payload.entry!, ...current]);
      setSelectedEntryId(payload.entry.id);
      setCreateCategoryId("");
      setCreateQuestion("");
      setCreateAnswer("");
      setCreateKeywords("");
      setErrorMessage(null);
    });
  }

  function handleDeleteCategory(categoryId: number) {
    if (!window.confirm("Удалить категорию?")) {
      return;
    }

    startDeletingCategory(async () => {
      const response = await fetch(`/api/kb/categories/${categoryId}`, {
        method: "DELETE",
      });

      const payload = (await response.json()) as { ok?: boolean; error?: string };

      if (!response.ok || payload.ok === false) {
        setErrorMessage(payload.error ?? "Не удалось удалить категорию");
        return;
      }

      setCategories((current) => current.filter((item) => item.id !== categoryId));
      setEntries((current) =>
        current.map((entry) =>
          entry.category_id === categoryId ? { ...entry, category_id: null } : entry,
        ),
      );

      if (editingCategoryId === categoryId) {
        resetCategoryEdit();
      }

      if (categoryFilter === String(categoryId)) {
        setCategoryFilter("");
      }

      setErrorMessage(null);
    });
  }

  function handleDeleteEntry(entryId: number) {
    if (!window.confirm("Удалить статью?")) {
      return;
    }

    startDeletingEntry(async () => {
      const response = await fetch(`/api/kb/entries/${entryId}`, {
        method: "DELETE",
      });

      const payload = (await response.json()) as { ok?: boolean; error?: string };

      if (!response.ok || payload.ok === false) {
        setErrorMessage(payload.error ?? "Не удалось удалить статью");
        return;
      }

      const nextEntries = entries.filter((item) => item.id !== entryId);
      setEntries(nextEntries);
      setSelectedEntryId(nextEntries[0]?.id ?? null);
      resetEntryEdit();
      setErrorMessage(null);
    });
  }

  return (
    <div className="grid gap-4 lg:h-full lg:min-h-0 lg:grid-cols-[360px_minmax(0,1fr)]">
      <aside
        className="flex min-h-0 flex-col rounded-[24px] border p-4"
        style={{ background: "var(--panel)", borderColor: "var(--line)" }}
      >
        <div className="shrink-0">
          <div className="text-base font-semibold">База знаний</div>
          <div className="mt-1 text-sm text-slate-500">
            {isLoading ? "Загрузка..." : `${filteredEntries.length} статей`}
          </div>
        </div>

        <div className="mt-4 grid gap-3 shrink-0">
          <input
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Поиск по базе знаний"
            className="w-full rounded-2xl border px-3 py-2 text-sm outline-none"
            style={{ borderColor: "var(--line)", background: "var(--input)" }}
          />

          <select
            value={categoryFilter}
            onChange={(event) => setCategoryFilter(event.target.value)}
            className="rounded-2xl border px-3 py-2 text-sm outline-none"
            style={{ borderColor: "var(--line)", background: "var(--input)" }}
          >
            <option value="">Все категории</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </div>

        <div className="mt-4 min-h-0 flex-1 overflow-y-auto pr-1">
          <div className="space-y-2">
            {filteredEntries.length === 0 ? (
              <div
                className="rounded-[24px] border px-4 py-8 text-center text-sm text-slate-500"
                style={{ borderColor: "var(--line)" }}
              >
                Ничего не найдено
              </div>
            ) : (
              filteredEntries.map((entry) => {
                const categoryName =
                  entry.category_id != null
                    ? (categoryNameById.get(entry.category_id) ?? "Без категории")
                    : "Без категории";
                const isSelected = entry.id === selectedEntryId;

                return (
                  <button
                    key={entry.id}
                    type="button"
                    onClick={() => {
                      setSelectedEntryId(entry.id);
                      setIsEditingEntry(false);
                    }}
                    className={`block w-full rounded-[24px] border px-4 py-3 text-left transition ${
                      isSelected ? "border-slate-900 bg-slate-50" : ""
                    }`}
                    style={{ borderColor: isSelected ? undefined : "var(--line)" }}
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-700">
                        {categoryName}
                      </span>
                      <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-700">
                        {entry.status}
                      </span>
                      <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-700">
                        {entry.is_active ? "active" : "inactive"}
                      </span>
                    </div>

                    <div className="mt-3 text-sm font-semibold text-slate-900">
                      {entry.question}
                    </div>
                    <div className="mt-2 text-sm text-slate-600">
                      {truncateText(entry.answer, 110)}
                    </div>
                    <div className="mt-3 text-xs text-slate-500">
                      Обновлено: {formatDate(entry.updated_at)}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        <details className="mt-4 shrink-0 border-t pt-4" style={{ borderColor: "var(--line)" }}>
          <summary className="cursor-pointer text-sm font-semibold">Категории</summary>

          <div className="mt-3 space-y-2">
            {categories.length === 0 ? (
              <div className="text-sm text-slate-500">Категорий пока нет</div>
            ) : (
              categories.map((category) => (
                <div
                  key={category.id}
                  className="rounded-2xl border px-3 py-3"
                  style={{ borderColor: "var(--line)" }}
                >
                  {editingCategoryId === category.id ? (
                    <form onSubmit={(event) => {
                      event.preventDefault();
                      startUpdatingCategory(async () => {
                        await submitCategoryUpdate();
                      });
                    }} className="space-y-2">
                      <input
                        value={editingCategoryName}
                        onChange={(event) => setEditingCategoryName(event.target.value)}
                        className="w-full rounded-2xl border px-3 py-2 text-sm outline-none"
                        style={{ borderColor: "var(--line)", background: "var(--input)" }}
                      />
                      <textarea
                        value={editingCategoryDescription}
                        onChange={(event) => setEditingCategoryDescription(event.target.value)}
                        rows={2}
                        className="w-full rounded-2xl border px-3 py-2 text-sm outline-none"
                        style={{ borderColor: "var(--line)", background: "var(--input)" }}
                      />
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="submit"
                          disabled={!editingCategoryName.trim() || isUpdatingCategory}
                          className="rounded-full bg-slate-900 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-60"
                        >
                          {isUpdatingCategory ? "Сохранение..." : "Сохранить"}
                        </button>
                        <button
                          type="button"
                          onClick={resetCategoryEdit}
                          className="rounded-full border px-3 py-1.5 text-xs"
                          style={{ borderColor: "var(--line)" }}
                        >
                          Отмена
                        </button>
                      </div>
                    </form>
                  ) : (
                    <>
                      <div className="text-sm font-medium">{category.name}</div>
                      {category.description ? (
                        <div className="mt-1 text-xs text-slate-500">{category.description}</div>
                      ) : null}
                      <div className="mt-3 flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => startCategoryEdit(category)}
                          className="rounded-full border px-3 py-1.5 text-xs"
                          style={{ borderColor: "var(--line)" }}
                        >
                          Редактировать
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteCategory(category.id)}
                          disabled={isDeletingCategory}
                          className="rounded-full border border-red-200 px-3 py-1.5 text-xs text-red-600 disabled:opacity-60"
                        >
                          Удалить
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ))
            )}

            <form onSubmit={handleCreateCategory} className="space-y-2 rounded-2xl border p-3" style={{ borderColor: "var(--line)" }}>
              <div className="text-sm font-semibold">Новая категория</div>
              <input
                value={categoryName}
                onChange={(event) => setCategoryName(event.target.value)}
                placeholder="Название категории"
                className="w-full rounded-2xl border px-3 py-2 text-sm outline-none"
                style={{ borderColor: "var(--line)", background: "var(--input)" }}
              />
              <textarea
                value={categoryDescription}
                onChange={(event) => setCategoryDescription(event.target.value)}
                placeholder="Описание категории"
                rows={2}
                className="w-full rounded-2xl border px-3 py-2 text-sm outline-none"
                style={{ borderColor: "var(--line)", background: "var(--input)" }}
              />
              <button
                type="submit"
                disabled={!categoryName.trim() || isSavingCategory}
                className="rounded-full bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
              >
                {isSavingCategory ? "Создание..." : "Добавить"}
              </button>
            </form>
          </div>
        </details>
      </aside>

      <section
        className="flex min-h-0 flex-col rounded-[24px] border p-4"
        style={{ background: "var(--panel)", borderColor: "var(--line)" }}
      >
        {errorMessage ? (
          <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {errorMessage}
          </div>
        ) : null}

        <details className="shrink-0 rounded-[24px] border p-4" style={{ borderColor: "var(--line)" }}>
          <summary className="cursor-pointer text-sm font-semibold">Новая статья</summary>

          <form onSubmit={handleCreateEntry} className="mt-3 grid gap-2">
            <select
              value={createCategoryId}
              onChange={(event) => setCreateCategoryId(event.target.value)}
              className="rounded-2xl border px-3 py-2 text-sm outline-none"
              style={{ borderColor: "var(--line)", background: "var(--input)" }}
            >
              <option value="">Без категории</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>

            <input
              value={createQuestion}
              onChange={(event) => setCreateQuestion(event.target.value)}
              placeholder="Вопрос"
              className="w-full rounded-2xl border px-3 py-2 text-sm outline-none"
              style={{ borderColor: "var(--line)", background: "var(--input)" }}
            />

            <textarea
              value={createAnswer}
              onChange={(event) => setCreateAnswer(event.target.value)}
              placeholder="Ответ"
              rows={3}
              className="w-full rounded-2xl border px-3 py-2 text-sm outline-none"
              style={{ borderColor: "var(--line)", background: "var(--input)" }}
            />

            <input
              value={createKeywords}
              onChange={(event) => setCreateKeywords(event.target.value)}
              placeholder="Ключевые слова через запятую"
              className="w-full rounded-2xl border px-3 py-2 text-sm outline-none"
              style={{ borderColor: "var(--line)", background: "var(--input)" }}
            />

            <button
              type="submit"
              disabled={!createQuestion.trim() || !createAnswer.trim() || isSavingEntry}
              className="w-fit rounded-full bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
            >
              {isSavingEntry ? "Сохранение..." : "Добавить статью"}
            </button>
          </form>
        </details>

        <div className="mt-4 min-h-0 flex-1 overflow-y-auto pr-1">
          {!selectedEntry ? (
            <div
              className="flex h-full items-center justify-center rounded-[24px] border px-6 py-12 text-center"
              style={{ borderColor: "var(--line)" }}
            >
              <div>
                <div className="text-lg font-semibold">Выберите статью слева</div>
                <div className="mt-2 text-sm text-slate-500">
                  Здесь будет полный просмотр и редактирование выбранной записи.
                </div>
              </div>
            </div>
          ) : isEditingEntry ? (
            <form
              onSubmit={(event) => {
                event.preventDefault();
                startUpdatingEntry(async () => {
                  await submitEntryUpdate();
                });
              }}
              className="space-y-4 rounded-[24px] border p-5"
              style={{ borderColor: "var(--line)" }}
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-lg font-semibold">Редактирование статьи</div>
                  <div className="mt-1 text-sm text-slate-500">ID {selectedEntry.id}</div>
                </div>
              </div>

              <select
                value={editingEntryCategoryId}
                onChange={(event) => setEditingEntryCategoryId(event.target.value)}
                className="rounded-2xl border px-3 py-2 text-sm outline-none"
                style={{ borderColor: "var(--line)", background: "var(--input)" }}
              >
                <option value="">Без категории</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>

              <input
                value={editingQuestion}
                onChange={(event) => setEditingQuestion(event.target.value)}
                className="w-full rounded-2xl border px-3 py-2 text-sm outline-none"
                style={{ borderColor: "var(--line)", background: "var(--input)" }}
              />

              <textarea
                value={editingAnswer}
                onChange={(event) => setEditingAnswer(event.target.value)}
                rows={10}
                className="w-full rounded-2xl border px-3 py-2 text-sm outline-none"
                style={{ borderColor: "var(--line)", background: "var(--input)" }}
              />

              <input
                value={editingKeywords}
                onChange={(event) => setEditingKeywords(event.target.value)}
                className="w-full rounded-2xl border px-3 py-2 text-sm outline-none"
                style={{ borderColor: "var(--line)", background: "var(--input)" }}
              />

              <label className="flex items-center gap-2 text-sm text-slate-600">
                <input
                  type="checkbox"
                  checked={editingIsActive}
                  onChange={(event) => setEditingIsActive(event.target.checked)}
                />
                Активна
              </label>

              <div className="flex flex-wrap gap-2">
                <button
                  type="submit"
                  disabled={!editingQuestion.trim() || !editingAnswer.trim() || isUpdatingEntry}
                  className="rounded-full bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
                >
                  {isUpdatingEntry ? "Сохранение..." : "Сохранить"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    resetEntryEdit();
                  }}
                  className="rounded-full border px-4 py-2 text-sm"
                  style={{ borderColor: "var(--line)" }}
                >
                  Отмена
                </button>
              </div>
            </form>
          ) : (
            <div className="space-y-4 rounded-[24px] border p-5" style={{ borderColor: "var(--line)" }}>
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
                  {selectedEntry.category_id != null
                    ? (categoryNameById.get(selectedEntry.category_id) ?? "Без категории")
                    : "Без категории"}
                </span>
                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
                  {selectedEntry.status}
                </span>
                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
                  {selectedEntry.is_active ? "active" : "inactive"}
                </span>
              </div>

              <div>
                <div className="text-xl font-semibold">{selectedEntry.question}</div>
                <div className="mt-2 text-sm text-slate-500">
                  Обновлено: {formatDate(selectedEntry.updated_at)}
                </div>
              </div>

              <div className="rounded-2xl bg-slate-50 px-4 py-4 text-sm leading-6 text-slate-700">
                {selectedEntry.answer}
              </div>

              {selectedEntry.keywords.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {selectedEntry.keywords.map((keyword) => (
                    <span
                      key={keyword}
                      className="rounded-full border px-2.5 py-1 text-xs text-slate-600"
                      style={{ borderColor: "var(--line)" }}
                    >
                      {keyword}
                    </span>
                  ))}
                </div>
              ) : null}

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => startEntryEdit(selectedEntry)}
                  className="rounded-full bg-slate-900 px-4 py-2 text-sm font-medium text-white"
                >
                  Редактировать
                </button>
                <button
                  type="button"
                  onClick={() => handleDeleteEntry(selectedEntry.id)}
                  disabled={isDeletingEntry}
                  className="rounded-full border border-red-200 px-4 py-2 text-sm text-red-600 disabled:opacity-60"
                >
                  Удалить
                </button>
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
