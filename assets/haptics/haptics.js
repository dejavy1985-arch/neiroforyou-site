/*
 * Тактильная отдача NeiroForYou — Haptics v1 (только главная страница).
 *
 * Слой чисто пассивный. Файл НИКОГДА не вызывает preventDefault, stopPropagation,
 * stopImmediatePropagation, fetch, DOMParser, history.pushState/replaceState,
 * location.href и не меняет разметку, классы и стили сайта.
 * Слушатель висит в capture-фазе и помечен как passive: он видит нажатие раньше всех,
 * но не может ни отменить его, ни остановить. Что произойдёт после нажатия — решает
 * сам сайт, ровно как и до подключения этого файла.
 *
 * С голосовой системой не пересекается: не читает и не пишет её хранилища,
 * не запускает и не останавливает записи. Две системы независимы.
 *
 * Чтобы полностью отключить — удалить строку подключения этого файла из index.html.
 */
(() => {
  "use strict";

  // Длительности в миллисекундах. Короткие намеренно: отдача должна
  // ощущаться подтверждением нажатия, а не уведомлением.
  var PATTERNS = {
    light: 8,
    medium: 12,
    locked: [20, 35, 20]
  };

  // Цели опознаются по тому, что на странице уже есть, — новых атрибутов
  // и классов существующим элементам не добавляется.
  var ANCHOR_HAPTICS = {
    "#business": "light",
    "#leads": "light",
    "#solutions": "medium"
  };

  var supported = false;

  /*
   * Вибрация только на устройствах с сенсорным вводом. На десктопе
   * navigator.vibrate в некоторых браузерах существует, но ничего не делает,
   * поэтому одной проверки наличия метода мало — нужен ещё грубый указатель.
   */
  function detectSupport() {
    try {
      if (typeof navigator.vibrate !== "function") return false;
      if (typeof window.matchMedia !== "function") return false;
      return window.matchMedia("(pointer: coarse)").matches;
    } catch (e) {
      return false;
    }
  }

  function vibrate(pattern) {
    if (!supported) return;
    try {
      navigator.vibrate(pattern);
    } catch (e) {
      console.warn("[neiro-haptics] вибрация недоступна:", e);
    }
  }

  // Только чтение DOM. Возвращает имя паттерна или null.
  function resolveHaptic(target) {
    if (!target || typeof target.closest !== "function") return null;

    if (target.closest(".nv-control")) return "light";
    if (target.closest('[data-voice="seo"]')) return "locked";

    var link = target.closest("a");
    if (!link) return null;

    var href = link.getAttribute("href");
    if (href && Object.prototype.hasOwnProperty.call(ANCHOR_HAPTICS, href)) {
      return ANCHOR_HAPTICS[href];
    }
    return null;
  }

  /*
   * Слушатель на click, а не на pointerdown: pointerdown срабатывает и в начале
   * прокрутки, из-за чего телефон отдавал бы вибрацию на каждое пролистывание.
   * У click такой ложной отдачи нет. Задержки это не добавляет — на странице
   * задан viewport, поэтому старого 300-миллисекундного ожидания браузер не делает.
   */
  function onClick(event) {
    try {
      var name = resolveHaptic(event.target);
      if (!name) return;
      vibrate(PATTERNS[name]);
    } catch (e) {
      console.warn("[neiro-haptics]", e);
    }
  }

  function init() {
    try {
      supported = detectSupport();
      if (!supported) return; // десктоп и всё, где вибрации нет, — тихо ничего не делаем
      document.addEventListener("click", onClick, { capture: true, passive: true });
    } catch (e) {
      console.warn("[neiro-haptics] инициализация не удалась:", e);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
