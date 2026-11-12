/*
 * Голосовое сопровождение NeiroForYou — Voice v2.
 *
 * Принцип: голос — пассивный слой поверх готового сайта.
 * Этот файл НИКОГДА не вызывает preventDefault, stopPropagation, fetch, DOMParser,
 * history.pushState и не изменяет существующую разметку, классы и стили сайта.
 * Обработчики кликов висят в capture-фазе: они видят клик раньше всех, но, поскольку
 * ничего не отменяют и не останавливают, событие уходит дальше по обычному пути.
 * Даже если код здесь упадёт с ошибкой, ссылка всё равно отработает как обычно.
 *
 * Переходы между страницами — обычные серверные, как и были. Чтобы озвучить страницу
 * агента, при клике по карточке в sessionStorage кладётся отметка "ожидается запись",
 * а сама страница уже после загрузки эту отметку читает и пытается её проиграть.
 *
 * Чтобы полностью отключить голос — удалить строку подключения этого файла со страниц.
 */
(() => {
  "use strict";

  const AUDIO_BASE = "/assets/audio/";

  const VOICE_MAP = {
    intro: "neiro-intro.mp3",
    business: "business-diagnostic.mp3",
    smm: "smm-content.mp3",
    showcase: "agents-showcase.mp3",
    seo: "seo-locked.mp3",
    telegram: "telegram-agent.mp3",
    threads: "threads-agent.mp3",
    finance: "finance-agent.mp3",
    telegram_bot: "telegram-bot.mp3",
    sites: "sites.mp3",
    ai_video: "ai-video.mp3",
    custom: "custom-agent.mp3"
  };

  // Якоря главной страницы -> запись звучит сразу, здесь же, без ухода со страницы.
  const ANCHOR_VOICE = {
    "#business": "business",
    "#solutions": "showcase"
  };

  // Карточки витрины -> запись, которую должна проиграть уже следующая страница.
  const ROUTE_VOICE = {
    "/agents/threads/": "threads",
    "/agents/finance/": "finance",
    "/agents/custom/": "custom",
    "/services/telegram-bot/": "telegram_bot",
    "/services/sites/": "sites",
    "/services/ai-video/": "ai_video"
  };

  const ENABLED_KEY = "nv_enabled";
  const PLAYED_KEY = "nv_played";
  const FIRST_CLICK_KEY = "nv_first_click_done";
  const PENDING_KEY = "nv_pending";
  const VOLUME = 0.85;

  const state = {
    enabled: true,
    played: [],
    firstClickDone: false,
    audio: null,
    control: null
  };

  // ---------- Хранилища (в приватном режиме доступ может бросать исключение) ----------

  function lsGet(key) {
    try {
      return window.localStorage.getItem(key);
    } catch (e) {
      return null;
    }
  }

  function lsSet(key, value) {
    try {
      window.localStorage.setItem(key, value);
    } catch (e) {}
  }

  function ssGet(key) {
    try {
      return window.sessionStorage.getItem(key);
    } catch (e) {
      return null;
    }
  }

  function ssSet(key, value) {
    try {
      window.sessionStorage.setItem(key, value);
    } catch (e) {}
  }

  function ssRemove(key) {
    try {
      window.sessionStorage.removeItem(key);
    } catch (e) {}
  }

  function readPlayed() {
    try {
      const raw = ssGet(PLAYED_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      return [];
    }
  }

  function markPlayed(id) {
    if (state.played.indexOf(id) !== -1) return;
    state.played.push(id);
    ssSet(PLAYED_KEY, JSON.stringify(state.played));
  }

  function alreadyPlayed(id) {
    return state.played.indexOf(id) !== -1;
  }

  // ---------- Отметка "следующая страница должна озвучиться" ----------

  function setPending(path, id) {
    ssSet(PENDING_KEY, JSON.stringify({ path: path, id: id }));
  }

  function readPending() {
    try {
      const raw = ssGet(PENDING_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (!parsed || !parsed.path || !parsed.id) return null;
      return parsed;
    } catch (e) {
      return null;
    }
  }

  function clearPending() {
    ssRemove(PENDING_KEY);
  }

  // ---------- Единственный audio-элемент на весь документ ----------

  function getAudio() {
    if (state.audio) return state.audio;
    const el = document.createElement("audio");
    el.id = "nv-player";
    el.preload = "none";
    el.volume = VOLUME;
    el.setAttribute("aria-hidden", "true");
    el.style.display = "none";
    document.body.appendChild(el);
    state.audio = el;
    return el;
  }

  function stopVoice() {
    const el = state.audio;
    if (!el) return;
    try {
      el.pause();
      el.currentTime = 0;
    } catch (e) {}
  }

  /*
   * Попытка воспроизведения. Всегда best effort: браузер вправе отказать
   * (Safari и iPhone так и делают, пока пользователь ничего не нажал).
   * Отказ — это только предупреждение в консоли; интерфейс и ссылки не затрагиваются.
   * Возвращает промис с true при успешном старте и false при любом отказе.
   */
  function attemptPlay(id) {
    if (!state.enabled) return Promise.resolve(false);
    // Фоновые muted-видео не мешают голосу, но ролик со звуком имеет приоритет.
    if (Array.from(document.querySelectorAll("video")).some((video) =>
      !video.paused && !video.ended && !video.muted && video.volume > 0
    )) return Promise.resolve(false);
    const file = VOICE_MAP[id];
    if (!file) return Promise.resolve(false);

    try {
      const el = getAudio();
      el.pause();
      el.src = AUDIO_BASE + file;
      el.currentTime = 0;
      el.volume = VOLUME;
      const started = el.play();
      if (started && typeof started.then === "function") {
        return started.then(
          () => true,
          (err) => {
            console.warn("[neiro-voice] запись не запустилась (" + id + "):", err && err.name);
            return false;
          }
        );
      }
      return Promise.resolve(true);
    } catch (e) {
      console.warn("[neiro-voice] ошибка воспроизведения (" + id + "):", e);
      return Promise.resolve(false);
    }
  }

  // Записи главной страницы: звучат один раз за сессию, повторный клик по той же
  // ссылке звук не дублирует, но саму ссылку, разумеется, не трогает.
  function playOnce(id) {
    if (!state.enabled) return;
    if (!VOICE_MAP[id]) return;
    if (alreadyPlayed(id)) return;
    markPlayed(id);
    attemptPlay(id);
  }

  // ---------- Кнопка включения и выключения звука ----------

  // Стили создаются здесь же и относятся только к .nv-control — элементу,
  // которого до подключения этого файла на странице не существовало.
  // Ни один селектор не совпадает с существующей разметкой сайта.
  function injectStyles() {
    const css = [
      // Кнопка держит зону нажатия 44x44, а видимый кружок внутри меньше —
      // так палец попадает уверенно, но глазу элемент остаётся малозаметным.
      ".nv-control{",
      "position:fixed;",
      "right:14px;",
      "bottom:calc(14px + var(--cookie-offset, 0px));",
      "z-index:40;",
      "display:inline-flex;",
      "align-items:center;",
      "justify-content:center;",
      "width:44px;height:44px;",
      "padding:0;",
      "border:0;",
      "background:transparent;",
      "color:rgba(0,0,0,.72);",
      "cursor:pointer;",
      "-webkit-tap-highlight-color:transparent;",
      "}",
      ".nv-face{",
      "display:inline-flex;",
      "align-items:center;",
      "justify-content:center;",
      "width:38px;height:38px;",
      "border:1px solid rgba(0,0,0,.12);",
      "border-radius:50%;",
      "background:rgba(255,255,255,.9);",
      "transition:border-color .18s ease, background-color .18s ease;",
      "}",
      ".nv-control svg{width:17px;height:17px;display:block;}",
      ".nv-control:hover .nv-face{border-color:rgba(0,0,0,.22);background:#fff;}",
      ".nv-control:focus{outline:none;}",
      ".nv-control:focus-visible .nv-face{outline:2px solid rgba(0,0,0,.5);outline-offset:2px;}",
      ".nv-control[data-enabled='false']{color:rgba(0,0,0,.5);}",
      ".nv-control[data-enabled='false'] .nv-face{opacity:.75;}",
      ".nv-control[data-enabled='true'] .nv-slash{display:none;}",
      ".nv-control[data-enabled='false'] .nv-wave{display:none;}",
      "@media (max-width:480px){",
      ".nv-control{right:12px;bottom:calc(12px + var(--cookie-offset, 0px));}",
      ".nv-face{width:36px;height:36px;}",
      "}",
      "@media (prefers-reduced-motion: reduce){.nv-face{transition:none;}}"
    ].join("");

    const style = document.createElement("style");
    style.id = "nv-styles";
    style.textContent = css;
    document.head.appendChild(style);
  }

  function renderControl() {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "nv-control";
    // Обе иконки лежат в разметке сразу; какая видна — решает CSS
    // по атрибуту data-enabled, поэтому перерисовывать SVG не нужно.
    btn.innerHTML =
      '<span class="nv-face">' +
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"' +
      ' stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">' +
      '<path d="M4 9.3h3.3L11.6 6v12L7.3 14.7H4z"/>' +
      '<path class="nv-wave" d="M15.2 9.9a3.2 3.2 0 0 1 0 4.2"/>' +
      '<path class="nv-slash" d="M19.5 5.2 5.2 19.5"/>' +
      "</svg>" +
      "</span>";
    btn.addEventListener("click", toggleVoice);
    document.body.appendChild(btn);
    state.control = btn;
    updateControl();
  }

  function updateControl() {
    const btn = state.control;
    if (!btn) return;
    btn.dataset.enabled = state.enabled ? "true" : "false";
    btn.setAttribute("aria-pressed", state.enabled ? "true" : "false");
    btn.setAttribute("aria-label", state.enabled ? "Выключить голос" : "Включить голос");
  }

  // Только два состояния. Включение обратно ничего не произносит —
  // голос зазвучит на следующем обычном триггере.
  function toggleVoice() {
    state.enabled = !state.enabled;
    lsSet(ENABLED_KEY, state.enabled ? "true" : "false");
    if (!state.enabled) stopVoice();
    updateControl();
  }

  // ---------- Наблюдение за кликами ----------

  function isOwnControl(target) {
    return !!(target && typeof target.closest === "function" && target.closest(".nv-control"));
  }

  function isHomepage() {
    const p = window.location.pathname;
    return p === "/" || p === "/index.html";
  }

  // Обычный левый клик без модификаторов: только такой ведёт к переходу
  // в этой же вкладке. Ctrl/Cmd-клик и target="_blank" открывают новую вкладку,
  // текущая страница при этом остаётся — отметку ставить не нужно.
  function isPlainNavigation(event, link) {
    return (
      event.button === 0 &&
      !event.metaKey &&
      !event.ctrlKey &&
      !event.shiftKey &&
      !event.altKey &&
      link.target !== "_blank"
    );
  }

  /*
   * Что означает клик. Только чтение DOM, никаких побочных эффектов.
   * "play"    — запись звучит немедленно, здесь же.
   * "pending" — со страницы уходим; запись должна прозвучать уже на следующей.
   */
  function resolveClick(event) {
    const target = event.target;
    if (!target || typeof target.closest !== "function") return null;

    if (target.closest('[data-voice="seo"]')) return { kind: "play", id: "seo" };
    if (target.closest(".custom-solution .custom-solution-cta")) {
      return { kind: "play", id: "custom" };
    }

    const link = target.closest("a");
    if (!link) return null;

    const href = link.getAttribute("href");
    if (!href) return null;

    if (Object.prototype.hasOwnProperty.call(ANCHOR_VOICE, href)) {
      return { kind: "play", id: ANCHOR_VOICE[href] };
    }

    if (Object.prototype.hasOwnProperty.call(ROUTE_VOICE, href) && isPlainNavigation(event, link)) {
      return { kind: "pending", id: ROUTE_VOICE[href], path: href };
    }

    return null;
  }

  /*
   * Capture-фаза: обработчик срабатывает раньше остальных, но ничего не отменяет
   * и не останавливает, поэтому клик продолжает свой обычный путь к ссылке.
   * Весь код обёрнут в try/catch — сбой здесь не должен мешать работе сайта.
   */
  function onDocumentClick(event) {
    try {
      if (isOwnControl(event.target)) return;

      const isFirstClick = !state.firstClickDone;
      if (isFirstClick) {
        state.firstClickDone = true;
        ssSet(FIRST_CLICK_KEY, "true");
      }

      const action = resolveClick(event);

      if (action) {
        if (action.kind === "play") {
          playOnce(action.id);
        } else {
          // Отметка ставится, и клик спокойно уходит дальше — переход
          // выполняет браузер сам, как и раньше.
          setPending(action.path, action.id);
        }
        // У первого клика свой голосовой сценарий есть — приветствие уже не звучит,
        // чтобы не получилось две записи подряд.
        if (isFirstClick) markPlayed("intro");
        return;
      }

      // Приветствие — только на главной и только если самое первое действие
      // пользователя не имело собственного голосового сценария.
      if (isFirstClick && isHomepage()) playOnce("intro");
    } catch (e) {
      console.warn("[neiro-voice]", e);
    }
  }

  // ---------- Озвучивание страницы, на которую только что перешли ----------

  /*
   * Если браузер отказал в автозапуске (Safari, iPhone), никакой кнопки не появляется
   * и ничего не ломается: запись просто ждёт первого обычного касания страницы
   * и стартует уже этим жестом.
   */
  function armFirstGesture(id) {
    let attemptsLeft = 3;
    const handler = (event) => {
      // Нажатие на саму кнопку звука жестом-запуском не считается:
      // если человек только что включил звук, запись должна ждать обычного действия.
      if (isOwnControl(event.target)) return;
      attemptsLeft -= 1;
      if (attemptsLeft <= 0) document.removeEventListener("click", handler, true);
      attemptPlay(id).then((started) => {
        if (!started) return;
        clearPending();
        document.removeEventListener("click", handler, true);
      });
    };
    document.addEventListener("click", handler, true);
  }

  function initPendingVoice() {
    const pending = readPending();
    if (!pending) return;
    // Отметка адресная: она относится только к той странице, ради которой её ставили.
    if (pending.path !== window.location.pathname) return;
    if (!VOICE_MAP[pending.id]) return;

    attemptPlay(pending.id).then((started) => {
      if (started) {
        clearPending();
        return;
      }
      armFirstGesture(pending.id);
    });
  }

  // ---------- Инициализация ----------

  function init() {
    try {
      const stored = lsGet(ENABLED_KEY);
      state.enabled = stored === null ? true : stored === "true";
      state.played = readPlayed();
      state.firstClickDone = ssGet(FIRST_CLICK_KEY) === "true";

      injectStyles();
      renderControl();

      document.addEventListener("click", onDocumentClick, true);
      // play не всплывает: capture охватывает также видео, добавленные позже.
      document.addEventListener("play", (event) => {
        if (event.target instanceof HTMLVideoElement) stopVoice();
      }, true);
      document.addEventListener("volumechange", (event) => {
        const video = event.target;
        if (video instanceof HTMLVideoElement && !video.paused && !video.muted && video.volume > 0) stopVoice();
      }, true);

      initPendingVoice();
    } catch (e) {
      console.warn("[neiro-voice] инициализация не удалась:", e);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
