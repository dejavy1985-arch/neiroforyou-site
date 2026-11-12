(() => {
  'use strict';
  const demo = document.querySelector('[data-bot-demo]');
  if (demo) {
    const tabs = [...demo.querySelectorAll('[data-bot-tab]')];
    const modes = [...demo.querySelectorAll('[data-bot-mode]')];
    const select = index => {
      tabs.forEach((tab, i) => { tab.setAttribute('aria-selected', String(i === index)); tab.tabIndex=i===index?0:-1; });
      modes.forEach(mode => { mode.hidden = mode.dataset.botMode !== tabs[index].dataset.botTab; });
      demo.querySelectorAll('[data-demo-local]').forEach(answer => { answer.hidden=true; answer.textContent=''; });
    };
    modes.forEach(mode => { mode.setAttribute('role','tabpanel'); mode.setAttribute('aria-labelledby','tab-'+mode.dataset.botMode); });
    tabs.forEach((tab,i) => {
      tab.addEventListener('click', () => select(i));
      tab.addEventListener('keydown', event => {
        const key=event.key; let index;
        if(key==='ArrowRight'||key==='ArrowDown')index=(i+1)%tabs.length;
        if(key==='ArrowLeft'||key==='ArrowUp')index=(i+tabs.length-1)%tabs.length;
        if(key==='Home')index=0; if(key==='End')index=tabs.length-1;
        if(index!==undefined) { event.preventDefault(); select(index); tabs[index].focus(); }
      });
    });
    demo.querySelectorAll('[data-demo-answer]').forEach(button => button.addEventListener('click', () => {
      const output=button.closest('.demo-conversation').querySelector('[data-demo-local]');
      output.textContent=button.dataset.demoAnswer; output.hidden=false;
    }));
    select(0); demo.classList.add('is-ready'); demo.querySelector('[role="tablist"]').hidden=false;
  }
  const calc = document.querySelector('[data-video-calculator]');
  if (calc) {
    const range=calc.querySelector('input[type="range"]');
    const presets=[...calc.querySelectorAll('[data-duration]')];
    const seconds = value => {const n=value%100, d=value%10;return `${value} ${n>=11&&n<=14?'секунд':d===1?'секунда':d>=2&&d<=4?'секунды':'секунд'}`;};
    const update = () => {
      const value=Number(range.value);
      calc.querySelector('[data-duration-label]').textContent=seconds(value);
      calc.querySelector('[data-video-total]').textContent=(value*500).toLocaleString('ru-RU')+' ₽';
      range.setAttribute('aria-valuetext',seconds(value));
      range.style.setProperty('--range-progress', ((value-5)/55*100)+'%');
      presets.forEach(button => button.setAttribute('aria-pressed',String(Number(button.dataset.duration)===value)));
    };
    range.disabled=false;range.addEventListener('input',update);
    presets.forEach(button => {button.disabled=false;button.addEventListener('click',()=>{range.value=button.dataset.duration;update();});});
    update();
  }
})();
