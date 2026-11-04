(() => {
  "use strict";

  const STORAGE_KEY = "zvezdnye-privychki.v1";
  const MAX_STARS_PER_HABIT = 5;
  const MAX_REWARD_COST = 999;
  const DAY_MS = 86_400_000;
  const REDUCED_MOTION = window.matchMedia("(prefers-reduced-motion: reduce)");

  const WEEKDAYS = [
    { id: 1, short: "Пн", full: "Понедельник" },
    { id: 2, short: "Вт", full: "Вторник" },
    { id: 3, short: "Ср", full: "Среда" },
    { id: 4, short: "Чт", full: "Четверг" },
    { id: 5, short: "Пт", full: "Пятница" },
    { id: 6, short: "Сб", full: "Суббота" },
    { id: 7, short: "Вс", full: "Воскресенье" },
  ];

  const HABIT_EMOJIS = [
    "🦷", "📚", "🏃", "🧸", "🛏️", "🥕", "💧", "🧹",
    "🎨", "🎹", "🧠", "🤝", "🌱", "🐶", "😴", "🌟",
  ];

  const REWARD_EMOJIS = [
    "🎁", "🎬", "🍦", "🍫", "🎮", "📖", "🧩", "🎡",
    "🏊", "🚲", "🍿", "🎟️", "🦄", "🚀", "⚽", "🧁",
  ];

  const AVATARS = ["🦊", "🐼", "🦄", "🐯", "🐸", "🐙", "🚀", "🌟"];

  const COLORS = [
    { id: "sun", name: "Солнечный" },
    { id: "mint", name: "Мятный" },
    { id: "sky", name: "Небесный" },
    { id: "peach", name: "Персиковый" },
    { id: "lilac", name: "Сиреневый" },
    { id: "pink", name: "Розовый" },
  ];

  const COLOR_IDS = new Set(COLORS.map((color) => color.id));
  const PRAISES = [
    "Так держать!",
    "Ты молодец!",
    "Отличная работа!",
    "Ещё одна победа!",
    "Здорово получается!",
  ];

  const ui = {};
  let state;
  let currentView = "today";
  let editingHabitId = null;
  let editingRewardId = null;
  let confirmResolver = null;
  let storageUnavailable = false;
  let storageWarningShown = false;
  let toastTimer = null;
  let lastDayKey = "";

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));

  /* ------------------------------------------------------------
     Утилиты
     ------------------------------------------------------------ */

  function escapeHTML(value) {
    return String(value).replace(/[&<>"']/g, (character) => {
      const map = {
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;",
      };
      return map[character];
    });
  }

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function pad(value) {
    return String(value).padStart(2, "0");
  }

  function dateOnly(date = new Date()) {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 12, 0, 0, 0);
  }

  function toKey(date = new Date()) {
    const current = dateOnly(date);
    return `${current.getFullYear()}-${pad(current.getMonth() + 1)}-${pad(current.getDate())}`;
  }

  function parseKey(key) {
    const [year, month, day] = String(key).split("-").map(Number);
    return new Date(year, month - 1, day, 12, 0, 0, 0);
  }

  function isValidKey(key) {
    if (typeof key !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(key)) return false;
    const parsed = parseKey(key);
    return !Number.isNaN(parsed.getTime()) && toKey(parsed) === key;
  }

  function addDays(date, amount) {
    const next = dateOnly(date);
    next.setDate(next.getDate() + amount);
    return next;
  }

  function daysBetweenKeys(firstKey, secondKey) {
    return Math.round((parseKey(secondKey) - parseKey(firstKey)) / DAY_MS);
  }

  function isoWeekday(date) {
    return ((date.getDay() + 6) % 7) + 1;
  }

  function startOfWeek(date = new Date()) {
    return addDays(date, -(isoWeekday(date) - 1));
  }

  function capitalize(value) {
    return value.charAt(0).toUpperCase() + value.slice(1);
  }

  function pluralRu(value, one, few, many) {
    const abs = Math.abs(Number(value)) % 100;
    const last = abs % 10;
    if (abs > 10 && abs < 20) return many;
    if (last === 1) return one;
    if (last >= 2 && last <= 4) return few;
    return many;
  }

  const starsWord = (value) => pluralRu(value, "звезда", "звезды", "звёзд");
  const daysWord = (value) => pluralRu(value, "день", "дня", "дней");
  const habitsWord = (value) => pluralRu(value, "привычка", "привычки", "привычек");
  const achievementsWord = (value) => pluralRu(value, "значок", "значка", "значков");
  const timesWord = (value) => pluralRu(value, "раз", "раза", "раз");

  const numberFormatter = new Intl.NumberFormat("ru-RU");
  const longDateFormatter = new Intl.DateTimeFormat("ru-RU", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
  const shortDateFormatter = new Intl.DateTimeFormat("ru-RU", {
    day: "numeric",
    month: "long",
  });
  const timeFormatter = new Intl.DateTimeFormat("ru-RU", {
    hour: "2-digit",
    minute: "2-digit",
  });

  const formatNumber = (value) => numberFormatter.format(Number(value) || 0);
  const formatLongDate = (date) => capitalize(longDateFormatter.format(date));
  const formatShortDate = (date) => shortDateFormatter.format(date);

  function formatDateTime(isoValue, fallbackDateKey) {
    const parsed = isoValue ? new Date(isoValue) : null;
    const validDate = parsed && !Number.isNaN(parsed.getTime());

    if (!validDate && fallbackDateKey && isValidKey(fallbackDateKey)) {
      return formatShortDate(parseKey(fallbackDateKey));
    }
    if (!validDate) return "Ранее";

    const key = toKey(parsed);
    const time = timeFormatter.format(parsed);
    if (key === toKey(new Date())) return `Сегодня, ${time}`;
    if (key === toKey(addDays(new Date(), -1))) return `Вчера, ${time}`;
    return `${formatShortDate(parsed)}, ${time}`;
  }

  function uid(prefix = "id") {
    if (window.crypto && typeof window.crypto.randomUUID === "function") {
      return `${prefix}-${window.crypto.randomUUID()}`;
    }
    return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
  }

  function normalizeEmoji(value, fallback) {
    const text = String(value || "").trim();
    return text ? text.slice(0, 12) : fallback;
  }

  function formatHabitDays(days) {
    const sorted = [...days].sort((a, b) => a - b);
    if (sorted.length === 7) return "Каждый день";
    if (sorted.join(",") === "1,2,3,4,5") return "По будням";
    if (sorted.join(",") === "6,7") return "По выходным";
    return sorted.map((day) => WEEKDAYS[day - 1]?.short || "").filter(Boolean).join(" · ");
  }

  function prefersReducedMotion() {
    return REDUCED_MOTION.matches;
  }

  /* ------------------------------------------------------------
     Данные и хранилище
     ------------------------------------------------------------ */

  function createDefaultState(profileOverride) {
    const createdAt = toKey(addDays(new Date(), -30));
    const profile = profileOverride || { name: "Дружок", avatar: "🦊" };

    const habits = [
      { title: "Почистить зубы", emoji: "🦷", stars: 1, color: "sky" },
      { title: "Прочитать 20 минут", emoji: "📚", stars: 3, color: "sun" },
      { title: "Убрать игрушки", emoji: "🧸", stars: 2, color: "peach" },
      { title: "Сделать зарядку", emoji: "🏃", stars: 2, color: "mint" },
    ].map((habit) => ({
      ...habit,
      id: uid("habit"),
      days: [1, 2, 3, 4, 5, 6, 7],
      createdAt,
    }));

    const rewards = [
      { title: "Мультик на 30 минут", emoji: "📺", cost: 10, color: "sky" },
      { title: "Любимая сладость", emoji: "🍫", cost: 20, color: "peach" },
      { title: "Час игры", emoji: "🎮", cost: 30, color: "lilac" },
      { title: "Поход в кино", emoji: "🎬", cost: 50, color: "pink" },
    ].map((reward) => ({ ...reward, id: uid("reward") }));

    return {
      version: 1,
      profile: { name: profile.name || "Дружок", avatar: profile.avatar || "🦊" },
      habits,
      rewards,
      completions: {},
      redemptions: [],
      createdAt: new Date().toISOString(),
    };
  }

  function normalizeState(raw) {
    if (!raw || typeof raw !== "object" || !Array.isArray(raw.habits)) {
      throw new Error("Некорректная структура данных");
    }

    const rawProfile = raw.profile && typeof raw.profile === "object" ? raw.profile : {};
    const profileName = String(rawProfile.name || "").trim().slice(0, 20) || "Дружок";
    const profileAvatar = AVATARS.includes(rawProfile.avatar) ? rawProfile.avatar : "🦊";

    const habits = raw.habits
      .filter((habit) => habit && typeof habit === "object")
      .map((habit) => {
        const days = Array.isArray(habit.days)
          ? [...new Set(habit.days.map(Number).filter((day) => day >= 1 && day <= 7))].sort((a, b) => a - b)
          : [1, 2, 3, 4, 5, 6, 7];

        return {
          id: typeof habit.id === "string" && habit.id ? habit.id : uid("habit"),
          title: String(habit.title || "").trim().slice(0, 40),
          emoji: normalizeEmoji(habit.emoji, "🌟"),
          stars: clamp(Math.round(Number(habit.stars) || 1), 1, MAX_STARS_PER_HABIT),
          color: COLOR_IDS.has(habit.color) ? habit.color : "mint",
          days: days.length ? days : [1, 2, 3, 4, 5, 6, 7],
          createdAt: isValidKey(habit.createdAt) ? habit.createdAt : toKey(new Date()),
        };
      })
      .filter((habit) => habit.title);

    const rewards = (Array.isArray(raw.rewards) ? raw.rewards : [])
      .filter((reward) => reward && typeof reward === "object")
      .map((reward) => ({
        id: typeof reward.id === "string" && reward.id ? reward.id : uid("reward"),
        title: String(reward.title || "").trim().slice(0, 40),
        emoji: normalizeEmoji(reward.emoji, "🎁"),
        cost: clamp(Math.round(Number(reward.cost) || 1), 1, MAX_REWARD_COST),
        color: COLOR_IDS.has(reward.color) ? reward.color : "pink",
      }))
      .filter((reward) => reward.title);

    const completions = {};
    if (raw.completions && typeof raw.completions === "object") {
      Object.entries(raw.completions).forEach(([key, dayValue]) => {
        if (!isValidKey(key) || !dayValue || typeof dayValue !== "object") return;
        const day = {};
        Object.entries(dayValue).forEach(([habitId, completion]) => {
          if (!habitId) return;
          const stars = typeof completion === "object"
            ? Number(completion.stars)
            : Number(completion);
          if (!Number.isFinite(stars) || stars < 0) return;
          day[habitId] = {
            stars: Math.round(stars),
            at: typeof completion === "object" && completion.at
              ? completion.at
              : new Date(`${key}T12:00:00`).toISOString(),
          };
        });
        if (Object.keys(day).length) completions[key] = day;
      });
    }

    const redemptions = (Array.isArray(raw.redemptions) ? raw.redemptions : [])
      .filter((redemption) => redemption && typeof redemption === "object")
      .map((redemption) => ({
        id: typeof redemption.id === "string" && redemption.id ? redemption.id : uid("redemption"),
        rewardId: typeof redemption.rewardId === "string" ? redemption.rewardId : "",
        title: String(redemption.title || "Награда").slice(0, 40),
        emoji: normalizeEmoji(redemption.emoji, "🎁"),
        cost: clamp(Math.round(Number(redemption.cost) || 0), 0, MAX_REWARD_COST),
        at: typeof redemption.at === "string" ? redemption.at : new Date().toISOString(),
        date: isValidKey(redemption.date) ? redemption.date : toKey(new Date()),
      }));

    return {
      version: 1,
      profile: { name: profileName, avatar: profileAvatar },
      habits,
      rewards,
      completions,
      redemptions,
      createdAt: raw.createdAt || new Date().toISOString(),
    };
  }

  function loadState() {
    let rawValue;
    try {
      rawValue = window.localStorage.getItem(STORAGE_KEY);
    } catch (error) {
      console.warn("localStorage недоступен:", error);
      storageUnavailable = true;
      return createDefaultState();
    }

    if (!rawValue) return createDefaultState();

    try {
      return normalizeState(JSON.parse(rawValue));
    } catch (error) {
      console.warn("Не удалось прочитать сохранённые данные:", error);
      return createDefaultState();
    }
  }

  function saveState() {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (error) {
      console.warn("Не удалось сохранить данные:", error);
      storageUnavailable = true;
      if (!storageWarningShown) {
        storageWarningShown = true;
        showToast("Браузер не сохраняет данные. Изменения могут пропасть после перезагрузки.");
      }
    }
  }

  /* ------------------------------------------------------------
     Расчёты
     ------------------------------------------------------------ */

  function isCompleted(habitId, dayKey) {
    return Boolean(state.completions[dayKey]?.[habitId]);
  }

  function getCompletion(habitId, dayKey) {
    return state.completions[dayKey]?.[habitId] || null;
  }

  function isHabitScheduledOn(habit, date) {
    const key = toKey(date);
    return Array.isArray(habit.days) && habit.days.includes(isoWeekday(date)) && habit.createdAt <= key;
  }

  function getHabitsForDate(date) {
    return state.habits.filter((habit) => isHabitScheduledOn(habit, date));
  }

  function getEarnedStars() {
    let total = 0;
    Object.values(state.completions).forEach((day) => {
      Object.values(day).forEach((completion) => {
        total += Math.max(0, Number(completion?.stars) || 0);
      });
    });
    return total;
  }

  function getSpentStars() {
    return state.redemptions.reduce((total, redemption) => total + (Number(redemption.cost) || 0), 0);
  }

  function getBalance() {
    return Math.max(0, getEarnedStars() - getSpentStars());
  }

  function getTotalCompletions() {
    return Object.values(state.completions).reduce(
      (total, day) => total + Object.keys(day).length,
      0,
    );
  }

  function getDayStats(date) {
    const key = toKey(date);
    const scheduled = getHabitsForDate(date);
    let done = 0;
    let stars = 0;

    scheduled.forEach((habit) => {
      const completion = getCompletion(habit.id, key);
      if (!completion) return;
      done += 1;
      stars += Number(completion.stars) || 0;
    });

    return {
      key,
      date,
      total: scheduled.length,
      done,
      stars,
      percent: scheduled.length ? Math.round((done / scheduled.length) * 100) : 0,
    };
  }

  function getCompletionDaySet() {
    const todayKey = toKey(new Date());
    const result = new Set();
    Object.entries(state.completions).forEach(([key, day]) => {
      if (!isValidKey(key) || key > todayKey) return;
      if (day && Object.keys(day).length) result.add(key);
    });
    return result;
  }

  function getCurrentDayStreak() {
    const completedDays = getCompletionDaySet();
    let cursor = dateOnly(new Date());

    if (!completedDays.has(toKey(cursor))) {
      cursor = addDays(cursor, -1);
    }

    let streak = 0;
    while (completedDays.has(toKey(cursor)) && streak < 3660) {
      streak += 1;
      cursor = addDays(cursor, -1);
    }
    return streak;
  }

  function getBestDayStreak() {
    const keys = [...getCompletionDaySet()].sort();
    let best = 0;
    let current = 0;
    let previousKey = null;

    keys.forEach((key) => {
      if (previousKey && daysBetweenKeys(previousKey, key) === 1) {
        current += 1;
      } else {
        current = 1;
      }
      best = Math.max(best, current);
      previousKey = key;
    });

    return best;
  }

  function getHabitCurrentStreak(habit) {
    let cursor = dateOnly(new Date());
    let streak = 0;
    let guard = 0;

    if (isHabitScheduledOn(habit, cursor) && !isCompleted(habit.id, toKey(cursor))) {
      cursor = addDays(cursor, -1);
    }

    while (guard < 3660) {
      guard += 1;
      const key = toKey(cursor);
      if (key < habit.createdAt) break;

      if (isHabitScheduledOn(habit, cursor)) {
        if (isCompleted(habit.id, key)) {
          streak += 1;
        } else {
          break;
        }
      }
      cursor = addDays(cursor, -1);
    }

    return streak;
  }

  function getHabitBestStreak(habit) {
    let cursor = parseKey(habit.createdAt);
    const today = dateOnly(new Date());
    let best = 0;
    let current = 0;
    let guard = 0;

    while (cursor <= today && guard < 3660) {
      guard += 1;
      if (isHabitScheduledOn(habit, cursor)) {
        if (isCompleted(habit.id, toKey(cursor))) {
          current += 1;
          best = Math.max(best, current);
        } else {
          current = 0;
        }
      }
      cursor = addDays(cursor, 1);
    }

    return best;
  }

  function getHabitStats(habit) {
    const today = dateOnly(new Date());
    let expected = 0;
    let done = 0;
    let completions = 0;

    for (let index = 0; index < 30; index += 1) {
      const date = addDays(today, -index);
      if (!isHabitScheduledOn(habit, date)) continue;
      expected += 1;
      if (isCompleted(habit.id, toKey(date))) done += 1;
    }

    Object.values(state.completions).forEach((day) => {
      if (day[habit.id]) completions += 1;
    });

    return {
      expected,
      done,
      completions,
      percent: expected ? Math.round((done / expected) * 100) : 0,
      currentStreak: getHabitCurrentStreak(habit),
      bestStreak: getHabitBestStreak(habit),
    };
  }

  function getLast30DayStats() {
    const today = dateOnly(new Date());
    let expected = 0;
    let done = 0;

    for (let index = 0; index < 30; index += 1) {
      const stats = getDayStats(addDays(today, -index));
      expected += stats.total;
      done += stats.done;
    }

    return {
      expected,
      done,
      percent: expected ? Math.round((done / expected) * 100) : 0,
    };
  }

  function getPerfectDays() {
    if (!state.habits.length) return 0;
    const today = dateOnly(new Date());
    const startKey = state.habits
      .map((habit) => habit.createdAt)
      .filter(isValidKey)
      .sort()[0];
    let cursor = startKey ? parseKey(startKey) : addDays(today, -30);
    let perfect = 0;
    let guard = 0;

    while (cursor <= today && guard < 3660) {
      guard += 1;
      const stats = getDayStats(cursor);
      if (stats.total > 0 && stats.done === stats.total) perfect += 1;
      cursor = addDays(cursor, 1);
    }

    return perfect;
  }

  function getAchievements() {
    const completions = getTotalCompletions();
    const bestStreak = getBestDayStreak();
    const perfectDays = getPerfectDays();
    const earned = getEarnedStars();
    const redemptions = state.redemptions.length;

    const items = [
      {
        id: "first",
        emoji: "🌱",
        title: "Первый шаг",
        desc: "Выполни первую привычку",
        value: completions,
        target: 1,
      },
      {
        id: "streak3",
        emoji: "🔥",
        title: "Три дня подряд",
        desc: "Занимайся три дня подряд",
        value: bestStreak,
        target: 3,
      },
      {
        id: "perfect",
        emoji: "💯",
        title: "Идеальный день",
        desc: "Выполни все привычки за день",
        value: perfectDays,
        target: 1,
      },
      {
        id: "stars50",
        emoji: "🌟",
        title: "Звёздный охотник",
        desc: "Заработай 50 звёзд",
        value: earned,
        target: 50,
      },
      {
        id: "streak7",
        emoji: "🏆",
        title: "Неделя силы",
        desc: "Продержись семь дней подряд",
        value: bestStreak,
        target: 7,
      },
      {
        id: "reward1",
        emoji: "🎁",
        title: "Первая награда",
        desc: "Обменяй звёзды на награду",
        value: redemptions,
        target: 1,
      },
    ];

    return items.map((item) => ({
      ...item,
      unlocked: item.value >= item.target,
      progress: clamp(Math.round((item.value / item.target) * 100), 0, 100),
    }));
  }

  /* ------------------------------------------------------------
     Отрисовка
     ------------------------------------------------------------ */

  function renderAll(options = {}) {
    renderHeader();
    renderToday();
    renderRewards();
    renderStats();

    if (options.animateBalance) {
      [ui.headerBalance, ui.walletBalance, ui.rewardsBalance].forEach(pulseNumber);
    }
  }

  function renderHeader() {
    const balance = getBalance();
    ui.headerName.textContent = state.profile.name;
    ui.headerAvatar.textContent = state.profile.avatar;
    ui.headerBalance.textContent = formatNumber(balance);
    ui.headerWallet.setAttribute(
      "aria-label",
      `В копилке ${formatNumber(balance)} ${starsWord(balance)}. Открыть награды`,
    );
    ui.profileButton.setAttribute("aria-label", `Настройки профиля: ${state.profile.name}`);
    ui.heroName.textContent = state.profile.name;
  }

  function renderToday() {
    const today = dateOnly(new Date());
    const todayKey = toKey(today);
    const scheduled = getHabitsForDate(today);
    const done = scheduled.filter((habit) => isCompleted(habit.id, todayKey)).length;
    const total = scheduled.length;
    const percent = total ? Math.round((done / total) * 100) : 0;
    const remaining = Math.max(0, total - done);
    const currentStreak = getCurrentDayStreak();
    const earned = getEarnedStars();

    ui.todayDate.textContent = formatLongDate(today);
    ui.heroStreak.textContent = formatNumber(currentStreak);
    ui.heroStreakLabel.textContent = `${daysWord(currentStreak)} подряд`;
    ui.heroEarned.textContent = formatNumber(earned);
    ui.todayRing.style.setProperty("--p", `${percent}%`);
    ui.ringDone.textContent = formatNumber(done);
    ui.ringTotal.textContent = formatNumber(total);

    if (!total) {
      ui.ringCaption.textContent = "Добавь привычку";
      ui.heroMessage.textContent = "Новый день — новые звёзды. Добавь первую привычку и начни путь.";
    } else if (done === total) {
      ui.ringCaption.textContent = "Всё готово!";
      ui.heroMessage.textContent = "Все звёзды дня твои! Отличная работа — ты настоящая звезда.";
    } else if (done === 0) {
      ui.ringCaption.textContent = "Пора начинать!";
      ui.heroMessage.textContent = `Сегодня ждут ${formatNumber(total)} ${habitsWord(total)}. Начни с самой простой — и звёздочка твоя.`;
    } else {
      ui.ringCaption.textContent = `Ещё ${formatNumber(remaining)}`;
      ui.heroMessage.textContent = `Уже ${formatNumber(done)} из ${formatNumber(total)}. Ещё немного — и день станет идеальным!`;
    }

    ui.todaySubtitle.textContent = total
      ? done === total
        ? "Все привычки выполнены — отличный день!"
        : `Выполнено ${formatNumber(done)} из ${formatNumber(total)}. Продолжай!`
      : "Маленькие шаги — большие перемены.";

    ui.habitGrid.hidden = scheduled.length === 0;
    ui.habitEmpty.hidden = scheduled.length > 0;

    if (scheduled.length) {
      ui.habitGrid.innerHTML = scheduled.map(renderHabitCard).join("") + renderAddHabitCard();
      const emptyTitle = ui.habitEmpty.querySelector("h3");
      const emptyText = ui.habitEmpty.querySelector("p");
      if (emptyTitle) emptyTitle.textContent = "Здесь пока пусто";
      if (emptyText) emptyText.textContent = "Добавь первую привычку — и начни собирать звёзды уже сегодня.";
    } else {
      ui.habitGrid.innerHTML = "";
      const emptyTitle = ui.habitEmpty.querySelector("h3");
      const emptyText = ui.habitEmpty.querySelector("p");
      if (state.habits.length) {
        if (emptyTitle) emptyTitle.textContent = "Сегодня без привычек";
        if (emptyText) {
          emptyText.textContent = "На этот день ничего не запланировано. Загляни в статистику или добавь новую привычку.";
        }
      } else {
        if (emptyTitle) emptyTitle.textContent = "Здесь пока пусто";
        if (emptyText) emptyText.textContent = "Добавь первую привычку — и начни собирать звёзды уже сегодня.";
      }
    }

    ui.allDoneBanner.hidden = !(total > 0 && done === total);
    renderWallet();
    renderWeekChart(today);
    renderNextBadge();
  }

  function renderHabitCard(habit) {
    const todayKey = toKey(new Date());
    const completed = isCompleted(habit.id, todayKey);
    const streak = getHabitCurrentStreak(habit);
    const daysLabel = formatHabitDays(habit.days);
    const safeTitle = escapeHTML(habit.title);
    const safeId = escapeHTML(habit.id);
    const safeEmoji = escapeHTML(habit.emoji);
    const streakTitle = `Серия: ${formatNumber(streak)} ${daysWord(streak)}`;

    return `
      <article class="habit-card tone-${habit.color}${completed ? " is-done" : ""}" data-habit-id="${safeId}">
        <div class="habit-top">
          <span class="habit-icon" aria-hidden="true">${safeEmoji}</span>
          <button class="habit-edit" type="button" data-edit-habit="${safeId}" title="Изменить привычку" aria-label="Изменить привычку «${safeTitle}»">
            <svg class="icon" aria-hidden="true"><use href="#i-pencil"></use></svg>
          </button>
        </div>
        <div class="habit-body">
          <h3 class="habit-title">${safeTitle}</h3>
          <div class="habit-meta">
            <span class="habit-reward" title="Награда за выполнение">
              <svg class="icon" aria-hidden="true"><use href="#i-star"></use></svg>
              +${formatNumber(habit.stars)}
            </span>
            ${streak > 0 ? `<span class="habit-streak" title="${streakTitle}"><svg class="icon" aria-hidden="true"><use href="#i-flame"></use></svg>${formatNumber(streak)}</span>` : ""}
            ${completed ? '<span class="habit-done-label">· Готово</span>' : ""}
          </div>
        </div>
        <div class="habit-bottom">
          <span class="habit-days">${escapeHTML(daysLabel)}</span>
          <button class="habit-check" type="button" data-habit-check="${safeId}" aria-pressed="${completed}" aria-label="${completed ? "Снять отметку" : "Отметить выполненной"} привычку «${safeTitle}»">
            <svg class="icon" aria-hidden="true"><use href="#i-${completed ? "check" : "star"}"></use></svg>
          </button>
        </div>
      </article>
    `;
  }

  function renderAddHabitCard() {
    return `
      <button class="habit-add-card" type="button" data-open-habit aria-label="Добавить новую привычку">
        <span class="habit-add-icon" aria-hidden="true"><svg class="icon"><use href="#i-plus"></use></svg></span>
        <span>Добавить привычку</span>
      </button>
    `;
  }

  function renderWallet() {
    const balance = getBalance();
    ui.walletBalance.textContent = formatNumber(balance);
    ui.walletBalanceWord.textContent = starsWord(balance);

    const sortedRewards = [...state.rewards].sort((a, b) => a.cost - b.cost);
    const target = sortedRewards.find((reward) => reward.cost > balance);

    let progress = 0;
    let goalText = "";

    if (target) {
      progress = clamp(Math.round((balance / target.cost) * 100), 0, 100);
      goalText = `До награды «${target.title}» — ${formatNumber(target.cost - balance)} ${starsWord(target.cost - balance)}.`;
    } else if (sortedRewards.length) {
      progress = 100;
      goalText = "Все награды уже по карману! Можно выбирать любую.";
    } else {
      goalText = "Добавь награду, чтобы копить было интереснее.";
    }

    ui.walletGoal.textContent = goalText;
    ui.walletProgressFill.style.width = `${progress}%`;
    ui.walletProgress.setAttribute("aria-valuenow", String(progress));
    ui.walletProgress.setAttribute("aria-valuetext", goalText);
  }

  function renderWeekChart(today) {
    const days = Array.from({ length: 7 }, (_, index) => addDays(today, index - 6));
    const stats = days.map(getDayStats);
    const totalStars = stats.reduce((sum, day) => sum + day.stars, 0);
    const totalDone = stats.reduce((sum, day) => sum + day.done, 0);
    const totalPossible = stats.reduce((sum, day) => sum + day.total, 0);
    const maxStars = Math.max(1, ...stats.map((day) => day.stars));

    ui.weekStars.textContent = `${formatNumber(totalStars)} ${starsWord(totalStars)} за 7 дней`;
    ui.weekNote.textContent = totalPossible
      ? `Выполнено ${formatNumber(totalDone)} из ${formatNumber(totalPossible)} за неделю.`
      : "Заполняй привычки — и столбики будут расти.";

    ui.weekBars.innerHTML = stats.map((day) => {
      const height = day.stars ? Math.max(13, Math.round((day.stars / maxStars) * 100)) : 0;
      const isToday = day.key === toKey(today);
      const dayName = WEEKDAYS[isoWeekday(day.date) - 1].short;
      const label = `${dayName}, ${formatShortDate(day.date)} — ${formatNumber(day.stars)} ${starsWord(day.stars)}`;
      return `
        <div class="week-col${isToday ? " is-today" : ""}${day.stars ? "" : " is-empty"}" role="img" aria-label="${escapeHTML(label)}" title="${escapeHTML(label)}">
          <div class="week-bar-track">
            <span class="week-bar" style="height: ${height}%"></span>
          </div>
          <span class="week-day">${dayName}</span>
        </div>
      `;
    }).join("");
  }

  function renderNextBadge() {
    const achievements = getAchievements();
    const locked = achievements
      .filter((achievement) => !achievement.unlocked)
      .sort((first, second) => second.progress - first.progress || first.target - second.target);

    if (!locked.length) {
      ui.nextBadgeIcon.textContent = "🏆";
      ui.nextBadgeTitle.textContent = "Все значки собраны!";
      ui.nextBadgeDesc.textContent = "Невероятный результат! Продолжай в том же духе.";
      ui.nextBadgeProgressFill.style.width = "100%";
      ui.nextBadgeProgress.setAttribute("aria-valuenow", "100");
      return;
    }

    const next = locked[0];
    const current = Math.min(next.value, next.target);
    ui.nextBadgeIcon.textContent = next.emoji;
    ui.nextBadgeTitle.textContent = next.title;
    ui.nextBadgeDesc.textContent = next.desc;
    ui.nextBadgeProgressFill.style.width = `${next.progress}%`;
    ui.nextBadgeProgress.setAttribute("aria-valuenow", String(next.progress));
    ui.nextBadgeProgress.setAttribute(
      "aria-valuetext",
      `${current} из ${next.target}. ${next.desc}`,
    );
    ui.nextBadgeCard.setAttribute(
      "aria-label",
      `Следующая цель: ${next.title}. Прогресс ${current} из ${next.target}.`,
    );
  }

  function renderRewards() {
    const balance = getBalance();
    const earned = getEarnedStars();
    const spent = getSpentStars();

    ui.rewardsBalance.textContent = formatNumber(balance);
    ui.rewardsBalanceLabel.textContent = starsWord(balance);
    ui.rewardsEarned.textContent = formatNumber(earned);
    ui.rewardsSpent.textContent = formatNumber(spent);

    ui.rewardGrid.hidden = state.rewards.length === 0;
    ui.rewardEmpty.hidden = state.rewards.length > 0;

    ui.rewardGrid.innerHTML = state.rewards.map((reward) => {
      const affordable = balance >= reward.cost;
      const progress = clamp(Math.round((balance / reward.cost) * 100), 0, 100);
      const diff = reward.cost - balance;
      const safeId = escapeHTML(reward.id);
      const safeTitle = escapeHTML(reward.title);
      const safeEmoji = escapeHTML(reward.emoji);
      const accumulated = Math.min(balance, reward.cost);

      return `
        <article class="reward-card tone-${reward.color}${affordable ? " is-affordable" : ""}">
          <div class="reward-top">
            <span class="reward-icon" aria-hidden="true">${safeEmoji}</span>
            <button class="reward-edit" type="button" data-edit-reward="${safeId}" title="Изменить награду" aria-label="Изменить награду «${safeTitle}»">
              <svg class="icon" aria-hidden="true"><use href="#i-pencil"></use></svg>
            </button>
          </div>
          <h3 class="reward-title">${safeTitle}</h3>
          <span class="reward-cost">
            <svg class="icon" aria-hidden="true"><use href="#i-star"></use></svg>
            ${formatNumber(reward.cost)}
          </span>
          <div class="reward-progress">
            <div class="reward-progress-label">
              <span>${affordable ? "Можно обменять" : "Накоплено"}</span>
              <strong>${formatNumber(accumulated)} / ${formatNumber(reward.cost)}</strong>
            </div>
            <div class="progress-track" role="progressbar" aria-label="Накопление на награду «${safeTitle}»" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${progress}">
              <span class="progress-fill" style="width: ${progress}%"></span>
            </div>
          </div>
          <div class="reward-action">
            ${affordable
              ? `<button class="btn btn-primary" type="button" data-redeem="${safeId}" aria-label="Обменять ${formatNumber(reward.cost)} ${starsWord(reward.cost)} на награду «${safeTitle}»">
                   <svg class="icon" aria-hidden="true"><use href="#i-gift"></use></svg>
                   Обменять
                 </button>`
              : `<button class="btn is-not-enough" type="button" disabled aria-label="Не хватает ${formatNumber(diff)} ${starsWord(diff)}">
                   <svg class="icon" aria-hidden="true"><use href="#i-lock"></use></svg>
                   Не хватает ${formatNumber(diff)}
                 </button>`}
          </div>
        </article>
      `;
    }).join("");

    renderRedemptionHistory();
  }

  function renderRedemptionHistory() {
    const redemptions = [...state.redemptions].sort((first, second) => {
      const firstTime = new Date(first.at).getTime() || 0;
      const secondTime = new Date(second.at).getTime() || 0;
      return secondTime - firstTime;
    });

    ui.redemptionCount.textContent = formatNumber(redemptions.length);
    ui.historyEmpty.hidden = redemptions.length > 0;
    ui.redemptionList.hidden = redemptions.length === 0;

    ui.redemptionList.innerHTML = redemptions.map((redemption) => `
      <div class="redemption-item">
        <span class="redemption-emoji" aria-hidden="true">${escapeHTML(redemption.emoji)}</span>
        <div class="redemption-info">
          <strong>${escapeHTML(redemption.title)}</strong>
          <span>${escapeHTML(formatDateTime(redemption.at, redemption.date))}</span>
        </div>
        <span class="redemption-cost">
          <svg class="icon" aria-hidden="true"><use href="#i-star"></use></svg>
          ${formatNumber(redemption.cost)}
        </span>
      </div>
    `).join("");
  }

  function renderStats() {
    const today = dateOnly(new Date());
    const earned = getEarnedStars();
    const bestStreak = getBestDayStreak();
    const last30 = getLast30DayStats();
    const totalCompletions = getTotalCompletions();

    ui.statsDate.textContent = formatShortDate(today);
    ui.statStars.textContent = formatNumber(earned);
    ui.statStreak.textContent = formatNumber(bestStreak);
    ui.statStreakSub.textContent = `${daysWord(bestStreak)} подряд`;
    ui.statRate.textContent = `${formatNumber(last30.percent)}%`;
    ui.statDone.textContent = formatNumber(totalCompletions);
    ui.statDoneSub.textContent = last30.expected
      ? `${formatNumber(last30.done)} из ${formatNumber(last30.expected)} за месяц`
      : "за всё время";

    renderStatsChart(today);
    renderHeatmap(today);
    renderHabitStats();
    renderAchievements();
  }

  function renderStatsChart(today) {
    const days = Array.from({ length: 7 }, (_, index) => addDays(today, index - 6));
    const stats = days.map(getDayStats);
    const done = stats.reduce((sum, day) => sum + day.done, 0);
    const possible = stats.reduce((sum, day) => sum + day.total, 0);
    const percent = possible ? Math.round((done / possible) * 100) : 0;

    ui.weekChartSub.textContent = possible
      ? `Выполнено ${formatNumber(done)} из ${formatNumber(possible)} · ${formatNumber(percent)}%`
      : "Пока нет запланированных привычек";

    ui.statsChart.innerHTML = stats.map((day) => {
      const isToday = day.key === toKey(today);
      const empty = day.total === 0;
      const height = empty ? 0 : Math.max(day.percent, 2);
      const dayName = WEEKDAYS[isoWeekday(day.date) - 1].short;
      const valueText = empty ? "—" : `${formatNumber(day.percent)}%`;
      const label = empty
        ? `${dayName}, ${formatShortDate(day.date)}: нет привычек`
        : `${dayName}, ${formatShortDate(day.date)}: выполнено ${formatNumber(day.done)} из ${formatNumber(day.total)}, ${formatNumber(day.percent)}%`;

      return `
        <div class="bar-column${isToday ? " is-today" : ""}${empty ? " is-empty" : ""}" style="--h: ${height}%" role="img" aria-label="${escapeHTML(label)}" title="${escapeHTML(label)}">
          <div class="bar-track">
            <span class="bar-value">${valueText}</span>
            <span class="bar-fill"></span>
          </div>
          <span class="bar-day">${dayName}</span>
          <span class="bar-date">${day.date.getDate()}</span>
        </div>
      `;
    }).join("");

    ui.statsChart.setAttribute(
      "aria-label",
      `График выполнения привычек за последние семь дней. Выполнено ${done} из ${possible}.`,
    );
  }

  function getHeatLevel(dayStats) {
    if (!dayStats.total || !dayStats.done) return 0;
    const ratio = dayStats.done / dayStats.total;
    if (ratio <= 0.25) return 1;
    if (ratio <= 0.5) return 2;
    if (ratio < 1) return 3;
    return 4;
  }

  function renderHeatmap(today) {
    const start = addDays(startOfWeek(today), -28);
    const todayKey = toKey(today);
    const cells = [];
    let activeDays = 0;

    for (let week = 0; week < 5; week += 1) {
      for (let weekday = 0; weekday < 7; weekday += 1) {
        const date = addDays(start, week * 7 + weekday);
        const key = toKey(date);
        const stats = getDayStats(date);
        const future = key > todayKey;
        const level = future ? 0 : getHeatLevel(stats);
        const classes = [
          "heat-cell",
          `level-${level}`,
          key === todayKey ? "is-today" : "",
          future ? "is-future" : "",
        ].filter(Boolean).join(" ");
        const label = future
          ? `${formatShortDate(date)} — ещё впереди`
          : stats.total
            ? `${formatShortDate(date)} — выполнено ${stats.done} из ${stats.total}`
            : `${formatShortDate(date)} — нет привычек`;
        if (!future && stats.done > 0) activeDays += 1;

        cells.push(`<span class="${classes}" title="${escapeHTML(label)}" aria-hidden="true"></span>`);
      }
    }

    const last30 = getLast30DayStats();
    ui.heatmapContainer.innerHTML = `
      <div class="heatmap-weekdays" aria-hidden="true">
        ${WEEKDAYS.map((day) => `<span>${day.short}</span>`).join("")}
      </div>
      <div class="heatmap-grid">${cells.join("")}</div>
    `;
    ui.heatmapContainer.setAttribute(
      "aria-label",
      last30.expected
        ? `Тепловая карта за пять недель. За последние 30 дней выполнено ${last30.done} из ${last30.expected} привычек и ${activeDays} активных дней.`
        : "Тепловая карта за пять недель. Пока нет данных.",
    );

    ui.heatmapSummary.textContent = last30.expected
      ? `Выполнено ${formatNumber(last30.done)} из ${formatNumber(last30.expected)} привычек за 30 дней.`
      : "Пока нет запланированных привычек.";
  }

  function renderHabitStats() {
    const hasHabits = state.habits.length > 0;
    ui.habitStatsList.hidden = !hasHabits;
    ui.habitStatsEmpty.hidden = hasHabits;

    if (!hasHabits) {
      ui.habitStatsList.innerHTML = "";
      return;
    }

    ui.habitStatsList.innerHTML = state.habits.map((habit) => {
      const stats = getHabitStats(habit);
      return `
        <div class="habit-stat-row">
          <div class="habit-stat-identity">
            <span class="habit-stat-icon tone-${habit.color}" aria-hidden="true">${escapeHTML(habit.emoji)}</span>
            <div>
              <strong>${escapeHTML(habit.title)}</strong>
              <small>${formatNumber(stats.completions)} ${timesWord(stats.completions)} выполнено</small>
            </div>
          </div>
          <div class="habit-stat-progress">
            <div class="progress-track" role="progressbar" aria-label="Успешность привычки «${escapeHTML(habit.title)}» за 30 дней" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${stats.percent}">
              <span class="progress-fill" style="width: ${stats.percent}%"></span>
            </div>
            <span class="habit-stat-percent">${stats.percent}%</span>
          </div>
          <span class="habit-stat-current" title="Текущая серия">
            <svg class="icon" aria-hidden="true"><use href="#i-flame"></use></svg>
            ${formatNumber(stats.currentStreak)}
          </span>
          <span class="habit-stat-best">
            Рекорд
            <strong>${formatNumber(stats.bestStreak)}</strong>
          </span>
        </div>
      `;
    }).join("");
  }

  function renderAchievements() {
    const achievements = getAchievements();
    const unlocked = achievements.filter((achievement) => achievement.unlocked).length;
    ui.achievementsCounter.textContent = `${unlocked} из ${achievements.length}`;

    ui.achievementGrid.innerHTML = achievements.map((achievement) => {
      const safeTitle = escapeHTML(achievement.title);
      const currentValue = Math.min(achievement.value, achievement.target);
      return `
        <article class="achievement-card${achievement.unlocked ? " is-unlocked" : ""}">
          <span class="achievement-icon" aria-hidden="true">${achievement.emoji}</span>
          <div class="achievement-content">
            <h3 class="achievement-title">
              ${safeTitle}
              ${achievement.unlocked ? '<svg class="icon" aria-hidden="true"><use href="#i-check-circle"></use></svg>' : ""}
            </h3>
            <p class="achievement-desc">${escapeHTML(achievement.desc)}</p>
            ${achievement.unlocked
              ? '<span class="achievement-earned"><svg class="icon" aria-hidden="true"><use href="#i-star"></use></svg>Получено</span>'
              : `<div class="achievement-progress">
                   <div class="progress-track" role="progressbar" aria-label="Прогресс достижения «${safeTitle}»" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${achievement.progress}">
                     <span class="progress-fill" style="width: ${achievement.progress}%"></span>
                   </div>
                   <span class="achievement-progress-label">${formatNumber(currentValue)} из ${formatNumber(achievement.target)}</span>
                 </div>`}
          </div>
        </article>
      `;
    }).join("");
  }

  /* ------------------------------------------------------------
     Навигация, тосты и эффекты
     ------------------------------------------------------------ */

  function pulseNumber(element) {
    if (!element) return;
    element.classList.remove("is-bumped");
    void element.offsetWidth;
    element.classList.add("is-bumped");
  }

  function showToast(message) {
    ui.toastText.textContent = message;
    ui.toast.classList.add("is-visible");
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => {
      ui.toast.classList.remove("is-visible");
    }, 3100);
  }

  function updateNavState(viewName) {
    $$(".nav-tab").forEach((tab) => {
      const active = tab.dataset.view === viewName;
      tab.classList.toggle("is-active", active);
      tab.setAttribute("aria-selected", String(active));
      tab.tabIndex = active ? 0 : -1;
    });

    $$(".bottom-nav-item").forEach((item) => {
      const active = item.dataset.view === viewName;
      item.classList.toggle("is-active", active);
      if (active) {
        item.setAttribute("aria-current", "page");
      } else {
        item.removeAttribute("aria-current");
      }
    });
  }

  function switchView(viewName, options = {}) {
    const validViews = ["today", "rewards", "stats"];
    const nextView = validViews.includes(viewName) ? viewName : "today";
    const { scroll = true, focus = false, updateHash = true } = options;

    currentView = nextView;

    Object.entries(ui.views).forEach(([name, view]) => {
      const active = name === nextView;
      view.hidden = !active;
      view.classList.toggle("is-active", active);
    });

    updateNavState(nextView);

    if (updateHash) {
      const hash = `#${nextView}`;
      if (window.location.hash !== hash) {
        try {
          window.history.replaceState(null, "", hash);
        } catch (error) {
          window.location.hash = nextView;
        }
      }
    }

    if (scroll) {
      window.scrollTo({ top: 0, behavior: prefersReducedMotion() ? "auto" : "smooth" });
    }

    if (focus) {
      ui.views[nextView].focus({ preventScroll: true });
    }
  }

  function getViewFromHash() {
    const hash = window.location.hash.replace("#", "").toLowerCase();
    return ["today", "rewards", "stats"].includes(hash) ? hash : "today";
  }

  function launchConfetti(x, y, amount = 22) {
    if (prefersReducedMotion()) return;

    const colors = ["#FFC83D", "#FF7A59", "#37BF95", "#7867E8", "#FF8FBE", "#62A8F4", "#FF9F68"];
    ui.confettiLayer.innerHTML = "";

    for (let index = 0; index < amount; index += 1) {
      const piece = document.createElement("span");
      piece.className = "confetti-piece";
      piece.style.left = `${x}px`;
      piece.style.top = `${y}px`;
      piece.style.background = colors[index % colors.length];
      piece.style.width = `${4 + Math.random() * 7}px`;
      piece.style.height = `${8 + Math.random() * 8}px`;
      if (index % 3 === 0) {
        piece.style.clipPath = "polygon(50% 0%, 62% 36%, 100% 38%, 70% 61%, 82% 100%, 50% 75%, 18% 100%, 30% 61%, 0% 38%, 38% 36%)";
        piece.style.borderRadius = "0";
      }
      ui.confettiLayer.appendChild(piece);

      const angle = Math.random() * Math.PI * 2;
      const distance = 55 + Math.random() * 160;
      const dx = Math.cos(angle) * distance;
      const dy = Math.sin(angle) * distance - 35;
      const rotation = (Math.random() - 0.5) * 900;

      const animation = piece.animate(
        [
          { transform: "translate(-50%, -50%) rotate(0deg) scale(1)", opacity: 1 },
          {
            transform: `translate(calc(-50% + ${dx * 0.65}px), calc(-50% + ${dy * 0.45}px)) rotate(${rotation * 0.55}deg) scale(0.9)`,
            opacity: 1,
            offset: 0.55,
          },
          {
            transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy + 110}px)) rotate(${rotation}deg) scale(0.7)`,
            opacity: 0,
          },
        ],
        {
          duration: 750 + Math.random() * 650,
          easing: "cubic-bezier(0.16, 0.7, 0.3, 1)",
        },
      );

      animation.onfinish = () => piece.remove();
    }

    window.setTimeout(() => {
      if (ui.confettiLayer) ui.confettiLayer.innerHTML = "";
    }, 1800);
  }

  function showRewardCelebration(reward) {
    ui.celebrationEmoji.textContent = reward.emoji;
    ui.celebrationText.textContent = `Награда «${reward.title}» уже ждёт тебя. Отличная работа — ты её заслужил!`;
    if (!ui.celebrationDialog.open) ui.celebrationDialog.showModal();
  }

  /* ------------------------------------------------------------
     Модальные окна и подтверждения
     ------------------------------------------------------------ */

  function showFormError(input, errorElement, message) {
    errorElement.textContent = message;
    errorElement.hidden = false;
    if (input) {
      input.setAttribute("aria-invalid", "true");
      input.focus();
    }
  }

  function clearFormError(input, errorElement) {
    errorElement.hidden = true;
    errorElement.textContent = "";
    if (input) input.removeAttribute("aria-invalid");
  }

  function askConfirm({ title, message, confirmText = "Подтвердить", cancelText = "Отмена", danger = true }) {
    ui.confirmTitle.textContent = title;
    ui.confirmMessage.textContent = message;
    ui.confirmOkButton.textContent = confirmText;
    ui.confirmCancelButton.textContent = cancelText;
    ui.confirmOkButton.className = danger ? "btn btn-danger" : "btn btn-primary";
    ui.confirmDialog.returnValue = "cancel";

    if (!ui.confirmDialog.open) ui.confirmDialog.showModal();

    return new Promise((resolve) => {
      if (confirmResolver) confirmResolver(false);
      confirmResolver = resolve;
    });
  }

  function selectOption(container, value) {
    $$("[data-value]", container).forEach((option) => {
      const selected = option.dataset.value === String(value);
      option.classList.toggle("is-selected", selected);
      if (option.getAttribute("role") === "radio") {
        option.setAttribute("aria-checked", String(selected));
        option.tabIndex = selected ? 0 : -1;
      }
    });
  }

  function getSelectedOption(container, fallback) {
    const selected = $("[data-value].is-selected", container);
    return selected ? selected.dataset.value : fallback;
  }

  function openHabitDialog(habitId = null) {
    const habit = habitId ? state.habits.find((item) => item.id === habitId) : null;
    editingHabitId = habit ? habit.id : null;

    ui.habitForm.reset();
    ui.habitDialogTitle.textContent = habit ? "Изменить привычку" : "Новая привычка";
    ui.habitSubmitButton.textContent = habit ? "Сохранить" : "Добавить";
    ui.deleteHabitButton.hidden = !habit;
    clearFormError(ui.habitTitle, ui.habitError);

    ui.habitTitle.value = habit ? habit.title : "";
    selectOption(ui.habitEmojiPicker, habit ? habit.emoji : "🌱");
    selectOption(ui.habitStarPicker, habit ? habit.stars : 2);
    selectOption(ui.habitColorPicker, habit ? habit.color : "mint");

    const selectedDays = habit ? habit.days : [1, 2, 3, 4, 5, 6, 7];
    $$(".weekday-option", ui.habitDays).forEach((option) => {
      const selected = selectedDays.includes(Number(option.dataset.day));
      option.classList.toggle("is-selected", selected);
      option.setAttribute("aria-pressed", String(selected));
    });

    ui.habitDialog.showModal();
    window.requestAnimationFrame(() => ui.habitTitle.focus());
  }

  function openRewardDialog(rewardId = null) {
    const reward = rewardId ? state.rewards.find((item) => item.id === rewardId) : null;
    editingRewardId = reward ? reward.id : null;

    ui.rewardForm.reset();
    ui.rewardDialogTitle.textContent = reward ? "Изменить награду" : "Новая награда";
    ui.rewardSubmitButton.textContent = reward ? "Сохранить" : "Добавить";
    ui.deleteRewardButton.hidden = !reward;
    clearFormError(ui.rewardCost, ui.rewardError);

    ui.rewardTitle.value = reward ? reward.title : "";
    ui.rewardCost.value = reward ? reward.cost : 10;
    selectOption(ui.rewardEmojiPicker, reward ? reward.emoji : "🎁");
    selectOption(ui.rewardColorPicker, reward ? reward.color : "pink");

    ui.rewardDialog.showModal();
    window.requestAnimationFrame(() => ui.rewardTitle.focus());
  }

  function openProfileDialog() {
    ui.profileName.value = state.profile.name;
    selectOption(ui.profileAvatarPicker, state.profile.avatar);
    clearFormError(ui.profileName, ui.profileError);
    ui.profileDialog.showModal();
    window.requestAnimationFrame(() => ui.profileName.focus());
  }

  async function deleteHabit() {
    const habit = state.habits.find((item) => item.id === editingHabitId);
    if (!habit) return;

    const confirmed = await askConfirm({
      title: "Удалить привычку?",
      message: `Привычка «${habit.title}» исчезнет из списка. Звёзды, заработанные ранее, останутся в копилке.`,
      confirmText: "Удалить",
    });

    if (!confirmed) return;

    state.habits = state.habits.filter((item) => item.id !== habit.id);
    saveState();
    ui.habitDialog.close();
    renderAll();
    showToast("Привычка удалена.");
  }

  async function deleteReward() {
    const reward = state.rewards.find((item) => item.id === editingRewardId);
    if (!reward) return;

    const confirmed = await askConfirm({
      title: "Удалить награду?",
      message: `Награда «${reward.title}» больше не появится в магазине. История уже полученных наград сохранится.`,
      confirmText: "Удалить",
    });

    if (!confirmed) return;

    state.rewards = state.rewards.filter((item) => item.id !== reward.id);
    saveState();
    ui.rewardDialog.close();
    renderAll();
    showToast("Награда удалена.");
  }

  async function redeemReward(rewardId) {
    const reward = state.rewards.find((item) => item.id === rewardId);
    if (!reward) return;

    const balance = getBalance();
    if (balance < reward.cost) {
      showToast("Пока не хватает звёзд. Выполни ещё несколько привычек!");
      return;
    }

    const confirmed = await askConfirm({
      title: "Обменять награду?",
      message: `«${reward.title}» обойдётся в ${formatNumber(reward.cost)} ${starsWord(reward.cost)}. Сейчас в копилке ${formatNumber(balance)}.`,
      confirmText: "Обменять",
      cancelText: "Не сейчас",
      danger: false,
    });

    if (!confirmed) return;

    if (getBalance() < reward.cost) {
      showToast("Звёзд уже не хватает. Нужно ещё немного постараться!");
      return;
    }

    const redemption = {
      id: uid("redemption"),
      rewardId: reward.id,
      title: reward.title,
      emoji: reward.emoji,
      cost: reward.cost,
      at: new Date().toISOString(),
      date: toKey(new Date()),
    };

    state.redemptions.push(redemption);
    saveState();
    renderAll({ animateBalance: true });
    showRewardCelebration(reward);
  }

  function focusHabitButton(habitId) {
    const button = $$("[data-habit-check]").find((item) => item.dataset.habitCheck === habitId);
    if (button) button.focus({ preventScroll: true });
  }

  function toggleHabit(habitId, buttonElement) {
    const habit = state.habits.find((item) => item.id === habitId);
    if (!habit) return;

    const today = dateOnly(new Date());
    const todayKey = toKey(today);
    if (!isHabitScheduledOn(habit, today)) return;

    const completion = getCompletion(habitId, todayKey);
    const buttonRect = buttonElement.getBoundingClientRect();

    if (completion) {
      const completionStars = Number(completion.stars) || 0;
      if (getBalance() < completionStars) {
        showToast("Эти звёзды уже обменяны на награду. Сначала заработай новые!");
        return;
      }

      delete state.completions[todayKey][habitId];
      if (!Object.keys(state.completions[todayKey]).length) {
        delete state.completions[todayKey];
      }
      saveState();
      renderAll({ animateBalance: true });
      focusHabitButton(habitId);
      showToast("Отметка снята.");
      return;
    }

    if (!state.completions[todayKey]) state.completions[todayKey] = {};
    state.completions[todayKey][habitId] = {
      stars: habit.stars,
      at: new Date().toISOString(),
    };

    saveState();
    renderAll({ animateBalance: true });
    focusHabitButton(habitId);

    const todayHabits = getHabitsForDate(today);
    const allDone = todayHabits.length > 0 && todayHabits.every((item) => isCompleted(item.id, todayKey));

    if (allDone) {
      showToast("Идеальный день! Все привычки выполнены. 🎉");
      launchConfetti(buttonRect.left + buttonRect.width / 2, buttonRect.top + buttonRect.height / 2, 42);
    } else {
      const praise = PRAISES[Math.floor(Math.random() * PRAISES.length)];
      showToast(`+${formatNumber(habit.stars)} ${starsWord(habit.stars)} · ${praise}`);
      launchConfetti(buttonRect.left + buttonRect.width / 2, buttonRect.top + buttonRect.height / 2, 20);
    }
  }

  /* ------------------------------------------------------------
     Инициализация интерфейса
     ------------------------------------------------------------ */

  function cacheUI() {
    const ids = [
      "headerWallet", "headerBalance", "headerAvatar", "headerName", "profileButton",
      "heroName", "heroMessage", "heroStreak", "heroStreakLabel", "heroEarned",
      "todayDate", "todaySubtitle", "todayRing", "ringDone", "ringTotal", "ringCaption",
      "habitGrid", "habitEmpty", "allDoneBanner",
      "walletBalance", "walletBalanceWord", "walletGoal", "walletProgress", "walletProgressFill",
      "weekStars", "weekBars", "weekNote",
      "nextBadgeCard", "nextBadgeIcon", "nextBadgeTitle", "nextBadgeDesc", "nextBadgeProgress", "nextBadgeProgressFill",
      "rewardsBalance", "rewardsBalanceLabel", "rewardsEarned", "rewardsSpent",
      "rewardGrid", "rewardEmpty", "redemptionCount", "redemptionList", "historyEmpty",
      "statsDate", "statStars", "statStreak", "statStreakSub", "statRate", "statDone", "statDoneSub",
      "weekChartSub", "statsChart", "heatmapContainer", "heatmapSummary",
      "habitStatsList", "habitStatsEmpty", "achievementsCounter", "achievementGrid",
      "toast", "toastText", "confettiLayer",
      "habitDialog", "habitForm", "habitDialogTitle", "habitEmojiPicker", "habitTitle",
      "habitStarPicker", "habitColorPicker", "habitDays", "habitError",
      "deleteHabitButton", "habitSubmitButton",
      "rewardDialog", "rewardForm", "rewardDialogTitle", "rewardEmojiPicker", "rewardTitle",
      "rewardCost", "rewardColorPicker", "rewardError", "deleteRewardButton", "rewardSubmitButton",
      "profileDialog", "profileForm", "profileAvatarPicker", "profileName", "profileError", "resetButton",
      "confirmDialog", "confirmTitle", "confirmMessage", "confirmOkButton", "confirmCancelButton",
      "celebrationDialog", "celebrationEmoji", "celebrationTitle", "celebrationText",
    ];

    ids.forEach((id) => {
      ui[id] = document.getElementById(id);
    });

    ui.views = {
      today: document.getElementById("view-today"),
      rewards: document.getElementById("view-rewards"),
      stats: document.getElementById("view-stats"),
    };
  }

  function buildPickers() {
    const renderEmojiPicker = (emojis, label) => emojis.map((emoji) => `
      <button class="emoji-option" type="button" role="radio" aria-checked="false" aria-label="${escapeHTML(label)} ${escapeHTML(emoji)}" data-value="${escapeHTML(emoji)}">${escapeHTML(emoji)}</button>
    `).join("");

    ui.habitEmojiPicker.innerHTML = renderEmojiPicker(HABIT_EMOJIS, "Иконка");
    ui.rewardEmojiPicker.innerHTML = renderEmojiPicker(REWARD_EMOJIS, "Иконка");
    ui.profileAvatarPicker.innerHTML = renderEmojiPicker(AVATARS, "Аватар");

    ui.habitStarPicker.innerHTML = Array.from({ length: MAX_STARS_PER_HABIT }, (_, index) => {
      const value = index + 1;
      return `
        <button class="star-option" type="button" role="radio" aria-checked="false" data-value="${value}" aria-label="${value} ${starsWord(value)}">
          <svg class="icon" aria-hidden="true"><use href="#i-star"></use></svg>
          <span>${value}</span>
        </button>
      `;
    }).join("");

    const renderColorPicker = (colors) => colors.map((color) => `
      <button class="color-option tone-${color.id}" type="button" role="radio" aria-checked="false" data-value="${color.id}" aria-label="${color.name} цвет" title="${color.name}"></button>
    `).join("");

    ui.habitColorPicker.innerHTML = renderColorPicker(COLORS);
    ui.rewardColorPicker.innerHTML = renderColorPicker(COLORS);

    ui.habitDays.innerHTML = WEEKDAYS.map((day) => `
      <button class="weekday-option is-selected" type="button" aria-pressed="true" data-day="${day.id}" title="${day.full}">${day.short}</button>
    `).join("");
  }

  function bindPickers() {
    $$(".emoji-picker, .star-picker, .color-picker").forEach((container) => {
      container.addEventListener("click", (event) => {
        const option = event.target.closest("[data-value]");
        if (!option) return;
        selectOption(container, option.dataset.value);
      });
    });

    ui.habitDays.addEventListener("click", (event) => {
      const option = event.target.closest(".weekday-option");
      if (!option) return;
      const selected = !option.classList.contains("is-selected");
      option.classList.toggle("is-selected", selected);
      option.setAttribute("aria-pressed", String(selected));
    });
  }

  function bindNavigationKeys() {
    $$(".main-nav, .bottom-nav").forEach((nav) => {
      nav.addEventListener("keydown", (event) => {
        if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;

        const items = $$("[data-view]", nav);
        const currentIndex = items.indexOf(document.activeElement);
        if (currentIndex === -1) return;

        let nextIndex = currentIndex;
        if (event.key === "ArrowLeft") nextIndex = (currentIndex - 1 + items.length) % items.length;
        if (event.key === "ArrowRight") nextIndex = (currentIndex + 1) % items.length;
        if (event.key === "Home") nextIndex = 0;
        if (event.key === "End") nextIndex = items.length - 1;

        event.preventDefault();
        items[nextIndex].focus();
        items[nextIndex].click();
      });
    });
  }

  function bindEvents() {
    document.addEventListener("click", (event) => {
      const closeTrigger = event.target.closest("[data-close]");
      if (closeTrigger) {
        const dialog = closeTrigger.closest("dialog");
        if (dialog) dialog.close();
        return;
      }

      const viewTrigger = event.target.closest("[data-view]");
      if (viewTrigger) {
        event.preventDefault();
        const isNav = Boolean(viewTrigger.closest(".main-nav, .bottom-nav"));
        switchView(viewTrigger.dataset.view, { focus: !isNav });
        return;
      }

      const habitCheck = event.target.closest("[data-habit-check]");
      if (habitCheck) {
        toggleHabit(habitCheck.dataset.habitCheck, habitCheck);
        return;
      }

      const habitEditor = event.target.closest("[data-edit-habit]");
      if (habitEditor) {
        openHabitDialog(habitEditor.dataset.editHabit);
        return;
      }

      const rewardEditor = event.target.closest("[data-edit-reward]");
      if (rewardEditor) {
        openRewardDialog(rewardEditor.dataset.editReward);
        return;
      }

      const redeemButton = event.target.closest("[data-redeem]");
      if (redeemButton) {
        redeemReward(redeemButton.dataset.redeem);
        return;
      }

      if (event.target.closest("[data-open-habit]")) {
        openHabitDialog();
        return;
      }

      if (event.target.closest("[data-open-reward]")) {
        openRewardDialog();
        return;
      }

      if (event.target.closest("#profileButton")) {
        openProfileDialog();
      }
    });

    $$(".modal").forEach((dialog) => {
      dialog.addEventListener("click", (event) => {
        if (event.target === dialog) dialog.close();
      });
    });

    ui.confirmDialog.addEventListener("close", () => {
      const resolve = confirmResolver;
      confirmResolver = null;
      if (resolve) resolve(ui.confirmDialog.returnValue === "confirm");
    });

    ui.habitForm.addEventListener("submit", (event) => {
      event.preventDefault();
      const title = ui.habitTitle.value.trim();
      clearFormError(ui.habitTitle, ui.habitError);

      if (!title) {
        showFormError(ui.habitTitle, ui.habitError, "Придумай название привычки.");
        return;
      }

      const selectedDays = $$(".weekday-option.is-selected", ui.habitDays)
        .map((option) => Number(option.dataset.day))
        .sort((a, b) => a - b);

      if (!selectedDays.length) {
        showFormError(null, ui.habitError, "Выбери хотя бы один день недели.");
        return;
      }

      const emoji = getSelectedOption(ui.habitEmojiPicker, "🌱");
      const stars = clamp(Number(getSelectedOption(ui.habitStarPicker, 2)), 1, MAX_STARS_PER_HABIT);
      const color = getSelectedOption(ui.habitColorPicker, "mint");

      if (editingHabitId) {
        const habit = state.habits.find((item) => item.id === editingHabitId);
        if (habit) {
          habit.title = title;
          habit.emoji = emoji;
          habit.stars = stars;
          habit.color = color;
          habit.days = selectedDays;
        }
        showToast("Привычка обновлена.");
      } else {
        state.habits.push({
          id: uid("habit"),
          title,
          emoji,
          stars,
          color,
          days: selectedDays,
          createdAt: toKey(new Date()),
        });
        showToast("Привычка добавлена. Вперёд за звёздами!");
      }

      saveState();
      ui.habitDialog.close();
      renderAll();
    });

    ui.rewardForm.addEventListener("submit", (event) => {
      event.preventDefault();
      const title = ui.rewardTitle.value.trim();
      const cost = Math.round(Number(ui.rewardCost.value));
      clearFormError(ui.rewardCost, ui.rewardError);

      if (!title) {
        showFormError(ui.rewardTitle, ui.rewardError, "Придумай название награды.");
        return;
      }

      if (!Number.isFinite(cost) || cost < 1 || cost > MAX_REWARD_COST) {
        showFormError(ui.rewardCost, ui.rewardError, `Стоимость должна быть от 1 до ${MAX_REWARD_COST} звёзд.`);
        return;
      }

      const emoji = getSelectedOption(ui.rewardEmojiPicker, "🎁");
      const color = getSelectedOption(ui.rewardColorPicker, "pink");

      if (editingRewardId) {
        const reward = state.rewards.find((item) => item.id === editingRewardId);
        if (reward) {
          reward.title = title;
          reward.emoji = emoji;
          reward.cost = cost;
          reward.color = color;
        }
        showToast("Награда обновлена.");
      } else {
        state.rewards.push({
          id: uid("reward"),
          title,
          emoji,
          cost,
          color,
        });
        showToast("Награда добавлена в магазин.");
      }

      saveState();
      ui.rewardDialog.close();
      renderAll();
    });

    ui.profileForm.addEventListener("submit", (event) => {
      event.preventDefault();
      const name = ui.profileName.value.trim();
      clearFormError(ui.profileName, ui.profileError);

      if (!name) {
        showFormError(ui.profileName, ui.profileError, "Напиши своё имя.");
        return;
      }

      state.profile.name = name;
      state.profile.avatar = getSelectedOption(ui.profileAvatarPicker, "🦊");
      saveState();
      ui.profileDialog.close();
      renderAll();
      showToast("Профиль обновлён.");
    });

    ui.deleteHabitButton.addEventListener("click", deleteHabit);
    ui.deleteRewardButton.addEventListener("click", deleteReward);

    ui.resetButton.addEventListener("click", async () => {
      const confirmed = await askConfirm({
        title: "Начать заново?",
        message: "Привычки, звёзды и награды будут сброшены. Имя и аватар останутся. Это действие нельзя отменить.",
        confirmText: "Сбросить прогресс",
      });

      if (!confirmed) return;

      const profile = { ...state.profile };
      state = createDefaultState(profile);
      saveState();
      ui.profileDialog.close();
      renderAll();
      switchView("today", { focus: true });
      showToast("Прогресс сброшен. Новое приключение начинается!");
    });

    [ui.habitTitle, ui.rewardCost, ui.profileName].forEach((input) => {
      input.addEventListener("input", () => {
        if (input === ui.habitTitle) clearFormError(input, ui.habitError);
        if (input === ui.rewardCost) clearFormError(input, ui.rewardError);
        if (input === ui.profileName) clearFormError(input, ui.profileError);
      });
    });

    ui.habitDialog.addEventListener("close", () => {
      editingHabitId = null;
      clearFormError(ui.habitTitle, ui.habitError);
    });

    ui.rewardDialog.addEventListener("close", () => {
      editingRewardId = null;
      clearFormError(ui.rewardCost, ui.rewardError);
    });

    ui.profileDialog.addEventListener("close", () => {
      clearFormError(ui.profileName, ui.profileError);
    });

    window.addEventListener("hashchange", () => {
      switchView(getViewFromHash(), { updateHash: false, focus: false });
    });

    bindNavigationKeys();

    window.setInterval(() => {
      const todayKey = toKey(new Date());
      if (todayKey === lastDayKey) return;
      lastDayKey = todayKey;
      renderAll();
      showToast("Новый день! Новые звёзды уже ждут.");
    }, 30_000);
  }

  function init() {
    cacheUI();
    buildPickers();
    bindPickers();
    state = loadState();
    bindEvents();
    renderAll();

    const initialView = getViewFromHash();
    switchView(initialView, { updateHash: false, scroll: false, focus: false });
    lastDayKey = toKey(new Date());

    saveState();

    if (storageUnavailable) {
      window.setTimeout(() => {
        if (!storageWarningShown) {
          storageWarningShown = true;
          showToast("Браузер не сохраняет данные. Изменения могут пропасть после перезагрузки.");
        }
      }, 700);
    }
  }

  init();
})();
