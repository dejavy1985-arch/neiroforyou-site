(() => {
  const block=document.querySelector('[data-music-testimonial]');
  if(!block)return;
  fetch('/assets/content/music-testimonial.json').then(response=>{
    if(!response.ok)throw new Error('Unavailable testimonial');return response.json();
  }).then(data=>{
    // Account alone is not sufficient attribution. No name or business is invented.
    if(!data.text || !(data.customerName?.trim() || data.cafeName?.trim()))return;
    block.querySelector('blockquote').textContent=data.text;
    block.querySelector('[data-testimonial-attribution]').textContent=[data.customerName,data.cafeName,data.account].filter(Boolean).join(' · ');
    block.hidden=false;
  }).catch(()=>{/* Keep unconfirmed content completely hidden. */});
})();
