"use client";

import {
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";

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

export function KnowledgeBase() {
  const [categories, setCategories] = useState<KbCategory[]>([]);
  const [entries, setEntries] = useState<KbEntry[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");

  const [categoryName, setCategoryName] = useState("");
  const [categoryDescription, setCategoryDescription] = useState("");

  const [selectedCategoryId, setSelectedCategoryId] = useState("");
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [keywords, setKeywords] = useState("");

  const [editingCategoryId, setEditingCategoryId] = useState<number | null>(null);
  const [editingCategoryName, setEditingCategoryName] = useState("");
  const [editingCategoryDescription, setEditingCategoryDescription] = useState("");

  const [editingEntryId, setEditingEntryId] = useState<number | null>(null);
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
  const categoryEditFormRef = useRef<HTMLFormElement | null>(null);
  const entryEditFormRef = useRef<HTMLFormElement | null>(null);

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

        setCategories(categoriesPayload.categories ?? []);
        setEntries(entriesPayload.entries ?? []);
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

  function startCategoryEdit(category: KbCategory) {
    setEditingCategoryId(category.id);
    setEditingCategoryName(category.name);
    setEditingCategoryDescription(category.description ?? "");
  }

  function resetCategoryEdit() {
    setEditingCategoryId(null);
    setEditingCategoryName("");
    setEditingCategoryDescription("");
  }

  function startEntryEdit(entry: KbEntry) {
    setEditingEntryId(entry.id);
    setEditingEntryCategoryId(entry.category_id ? String(entry.category_id) : "");
    setEditingQuestion(entry.question);
    setEditingAnswer(entry.answer);
    setEditingKeywords(entry.keywords.join(", "));
    setEditingIsActive(entry.is_active);
  }

  function resetEntryEdit() {
    setEditingEntryId(null);
    setEditingEntryCategoryId("");
    setEditingQuestion("");
    setEditingAnswer("");
    setEditingKeywords("");
    setEditingIsActive(true);
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
    if (!editingEntryId || !editingQuestion.trim() || !editingAnswer.trim()) {
      return;
    }

    const response = await fetch(`/api/kb/entries/${editingEntryId}`, {
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
    resetEntryEdit();
    setErrorMessage(null);
  }

  useEffect(() => {
    function handlePointerDown(event: PointerEvent) {
      const target = event.target;

      if (!(target instanceof Node)) {
        return;
      }

      if (editingCategoryId && categoryEditFormRef.current && !categoryEditFormRef.current.contains(target)) {
        startUpdatingCategory(async () => {
          await submitCategoryUpdate();
        });
      }

      if (editingEntryId && entryEditFormRef.current && !entryEditFormRef.current.contains(target)) {
        startUpdatingEntry(async () => {
          await submitEntryUpdate();
        });
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [
    editingCategoryDescription,
    editingCategoryId,
    editingCategoryName,
    editingEntryCategoryId,
    editingEntryId,
    editingAnswer,
    editingIsActive,
    editingKeywords,
    editingQuestion,
  ]);

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
          categoryId: selectedCategoryId ? Number(selectedCategoryId) : null,
          question,
          answer,
          keywords: parseKeywords(keywords),
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
      setSelectedCategoryId("");
      setQuestion("");
      setAnswer("");
      setKeywords("");
      setErrorMessage(null);
    });
  }

  function handleUpdateCategory(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    startUpdatingCategory(async () => {
      await submitCategoryUpdate();
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

  function handleUpdateEntry(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    startUpdatingEntry(async () => {
      await submitEntryUpdate();
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

      setEntries((current) => current.filter((item) => item.id !== entryId));

      if (editingEntryId === entryId) {
        resetEntryEdit();
      }

      setErrorMessage(null);
    });
  }

  return (
    <div className="grid gap-4 lg:h-full lg:min-h-0 lg:grid-cols-[320px_minmax(0,1fr)]">
      <aside
        className="flex min-h-0 flex-col rounded-[24px] border p-4"
        style={{ background: "var(--panel)", borderColor: "var(--line)" }}
      >
        <div className="shrink-0">
          <div className="text-sm font-semibold">Категории</div>
          <div className="mt-1 text-xs text-slate-500">{categories.length} категорий</div>
        </div>

        <div className="mt-4 min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
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
                  <form ref={categoryEditFormRef} onSubmit={handleUpdateCategory} className="space-y-2">
                    <input
                      value={editingCategoryName}
                      onChange={(event) => setEditingCategoryName(event.target.value)}
                      className="w-full rounded-2xl border px-3 py-2 text-sm outline-none"
                      style={{ borderColor: "var(--line)", background: "var(--input)" }}
                    />
                    <textarea
                      value={editingCategoryDescription}
                      onChange={(event) => setEditingCategoryDescription(event.target.value)}
                      rows={3}
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
        </div>

        <details className="mt-4 shrink-0 border-t pt-4" style={{ borderColor: "var(--line)" }}>
          <summary className="cursor-pointer text-sm font-semibold">Новая категория</summary>

          <form onSubmit={handleCreateCategory} className="mt-3 space-y-2">
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
              {isSavingCategory ? "Создание..." : "Добавить категорию"}
            </button>
          </form>
        </details>
      </aside>

      <section
        className="flex min-h-0 flex-col rounded-[24px] border p-4"
        style={{ background: "var(--panel)", borderColor: "var(--line)" }}
      >
        <div className="shrink-0">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <div className="text-lg font-semibold">База знаний</div>
              <div className="text-sm text-slate-500">
                {isLoading ? "Загрузка..." : `Показано статей: ${filteredEntries.length} из ${entries.length}`}
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_220px] xl:w-[520px]">
              <input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Поиск по вопросам, ответам, ключевым словам"
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
          </div>

          {errorMessage ? (
            <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {errorMessage}
            </div>
          ) : null}

          <details className="mt-4 rounded-[24px] border p-4" style={{ borderColor: "var(--line)" }}>
            <summary className="cursor-pointer text-sm font-semibold">Новая статья</summary>

            <form onSubmit={handleCreateEntry} className="mt-3 grid gap-2">
              <select
                value={selectedCategoryId}
                onChange={(event) => setSelectedCategoryId(event.target.value)}
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
                value={question}
                onChange={(event) => setQuestion(event.target.value)}
                placeholder="Вопрос"
                className="w-full rounded-2xl border px-3 py-2 text-sm outline-none"
                style={{ borderColor: "var(--line)", background: "var(--input)" }}
              />

              <textarea
                value={answer}
                onChange={(event) => setAnswer(event.target.value)}
                placeholder="Ответ"
                rows={3}
                className="w-full rounded-2xl border px-3 py-2 text-sm outline-none"
                style={{ borderColor: "var(--line)", background: "var(--input)" }}
              />

              <input
                value={keywords}
                onChange={(event) => setKeywords(event.target.value)}
                placeholder="Ключевые слова через запятую"
                className="w-full rounded-2xl border px-3 py-2 text-sm outline-none"
                style={{ borderColor: "var(--line)", background: "var(--input)" }}
              />

              <button
                type="submit"
                disabled={!question.trim() || !answer.trim() || isSavingEntry}
                className="w-fit rounded-full bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
              >
                {isSavingEntry ? "Сохранение..." : "Добавить статью"}
              </button>
            </form>
          </details>
        </div>

        <div className="mt-4 min-h-0 flex-1 space-y-3 overflow-y-auto pr-1">
          {filteredEntries.length === 0 ? (
            <div
              className="rounded-[24px] border px-4 py-8 text-center text-sm text-slate-500"
              style={{ borderColor: "var(--line)" }}
            >
              Статей по текущему фильтру нет
            </div>
          ) : (
            filteredEntries.map((entry) => {
              const categoryName =
                entry.category_id != null ? (categoryNameById.get(entry.category_id) ?? "Без категории") : "Без категории";

              return (
                <article
                  key={entry.id}
                  className="rounded-[24px] border p-4"
                  style={{ borderColor: "var(--line)" }}
                >
                  {editingEntryId === entry.id ? (
                    <form ref={entryEditFormRef} onSubmit={handleUpdateEntry} className="grid gap-3">
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
                        rows={5}
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
                          className="rounded-full bg-slate-900 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-60"
                        >
                          {isUpdatingEntry ? "Сохранение..." : "Сохранить"}
                        </button>
                        <button
                          type="button"
                          onClick={resetEntryEdit}
                          className="rounded-full border px-3 py-1.5 text-xs"
                          style={{ borderColor: "var(--line)" }}
                        >
                          Отмена
                        </button>
                      </div>
                    </form>
                  ) : (
                    <>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
                          {categoryName}
                        </span>
                        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
                          {entry.status}
                        </span>
                        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
                          {entry.is_active ? "active" : "inactive"}
                        </span>
                      </div>

                      <h3 className="mt-3 text-sm font-semibold">{entry.question}</h3>
                      <p className="mt-2 whitespace-pre-wrap text-sm text-slate-600">{entry.answer}</p>

                      {entry.keywords.length > 0 ? (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {entry.keywords.map((keyword) => (
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

                      <div className="mt-3 flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => startEntryEdit(entry)}
                          className="rounded-full border px-3 py-1.5 text-xs"
                          style={{ borderColor: "var(--line)" }}
                        >
                          Редактировать
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteEntry(entry.id)}
                          disabled={isDeletingEntry}
                          className="rounded-full border border-red-200 px-3 py-1.5 text-xs text-red-600 disabled:opacity-60"
                        >
                          Удалить
                        </button>
                      </div>
                    </>
                  )}
                </article>
              );
            })
          )}
        </div>
      </section>
    </div>
  );
}
