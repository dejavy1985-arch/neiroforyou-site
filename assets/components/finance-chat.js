/* Progressive enhancement: all five messages are readable in the static HTML. */
(() => {
  const chat = document.querySelector("[data-agent-chat]");
  if (!chat) return;
  const messages = [...chat.querySelectorAll("[data-chat-message]")];
  const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
  let started = false;
  let finished = false;
  let watchdog;
  let observer;
  const wait = ms => new Promise(resolve => window.setTimeout(resolve, ms));
  const finish = () => {
    finished = true;
    window.clearTimeout(watchdog);
    observer?.disconnect();
    messages.forEach(message => {
      message.querySelector(".chat-bubble").textContent = message.dataset.text;
      message.querySelector(".typing-dots")?.classList.remove("is-visible");
      message.classList.add("is-visible");
      message.style.minHeight = "";
      message.querySelector(".chat-bubble").style.minHeight = "";
    });
    chat.classList.remove("is-animating");
    chat.dataset.chatState = "complete";
  };
  const typeText = async (bubble, text) => {
    bubble.textContent = "";
    for (const char of text) {
      if (finished) return;
      bubble.textContent += char;
      await wait(22);
    }
  };
  const play = async () => {
    if (started || finished) return;
    started = true;
    try {
      messages.forEach(message => {
        message.style.minHeight = message.getBoundingClientRect().height + "px";
        const bubble = message.querySelector(".chat-bubble");
        bubble.style.minHeight = bubble.getBoundingClientRect().height + "px";
      });
      chat.classList.add("is-animating");
      chat.dataset.chatState = "running";
      watchdog = window.setTimeout(finish, 12000);
      for (const message of messages) {
        if (finished) break;
        message.classList.add("is-visible");
        const typing = message.querySelector(".typing-dots");
        if (typing) {
          typing.classList.add("is-visible");
          await wait(760);
          if (finished) break;
          typing.classList.remove("is-visible");
        }
        await typeText(message.querySelector(".chat-bubble"), message.dataset.text);
        await wait(260);
      }
    } finally {
      finish();
    }
  };
  try {
    if (motion.matches || !("IntersectionObserver" in window)) {
      finish();
      return;
    }
    motion.addEventListener("change", event => { if (event.matches) finish(); });
    observer = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) {
        observer.disconnect();
        play().catch(finish);
      }
    }, { threshold: 0.2 });
    observer.observe(chat);
  } catch (_) {
    finish();
  }
})();
