/* ---------- Список «КП» и избранное: общее для главной и остальных страниц макета ----------
   Позиция списка: { id, name, kind, note, price (число или null, если цену уточнит менеджер), img, url, qty }.
   Хранится в браузере посетителя (localStorage), без регистрации. На Битриксе это корзина модуля «Интернет-магазин». */
(function () {
  const mem = {};
  const KEYS = { kp: 'ym-kp', fav: 'ym-fav', sent: 'ym-sent' };
  const read = k => { try { const v = localStorage.getItem(KEYS[k]); if (v) return JSON.parse(v); } catch (e) {} return mem[k] || (k === 'sent' ? null : []); };
  const write = (k, v) => { mem[k] = v; try { localStorage.setItem(KEYS[k], JSON.stringify(v)); } catch (e) {} dispatchEvent(new CustomEvent('ymstore', { detail: k })); };
  const rub = n => Math.round(n).toLocaleString('ru-RU').replace(/\s/g, ' ') + ' ₽';
  /* тот же пример расчёта, что на главной: аванс 10 %, 36 месяцев */
  const lease = (price, n = 36, adv = 0.1, rate = 0.18) => { const s = price * (1 - adv), r = rate / 12; return Math.round(s * r / (1 - Math.pow(1 + r, -n)) / 100) * 100; };
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const word = (n, one, few, many) => { const a = n % 10, b = n % 100; return n + ' ' + (a === 1 && b !== 11 ? one : a >= 2 && a <= 4 && (b < 12 || b > 14) ? few : many); };

  const YM = window.YM = {
    rub, lease, esc, word,
    kp: () => read('kp'),
    fav: () => read('fav'),
    inKp: id => read('kp').some(x => x.id === id),
    inFav: id => read('fav').some(x => x.id === id),
    /* добавить позиции; уже лежащие в списке не дублируются. Возвращает, сколько добавилось новых */
    addKp(items) {
      const list = read('kp'); let added = 0;
      items.forEach(it => { if (!list.some(x => x.id === it.id)) { list.push(Object.assign({ qty: 1 }, it)); added++; } });
      write('kp', list); return added;
    },
    removeKp(id) { write('kp', read('kp').filter(x => x.id !== id)); },
    setQty(id, q) { write('kp', read('kp').map(x => x.id === id ? Object.assign({}, x, { qty: Math.max(1, Math.min(99, q)) }) : x)); },
    clearKp() { write('kp', []); },
    toggleFav(it) {
      const list = read('fav'), on = list.some(x => x.id === it.id);
      write('fav', on ? list.filter(x => x.id !== it.id) : list.concat([it])); return !on;
    },
    setFav(list) { write('fav', list); },
    sum: list => list.reduce((a, x) => a + (x.price || 0) * (x.qty || 1), 0),
    unpriced: list => list.filter(x => !x.price).length,
    /* отправленный запрос: страница «Запрос отправлен» показывает его номер и состав */
    send(req) {
      const no = 'ЯМ-' + String(Date.now()).slice(-6);
      write('sent', Object.assign({ no, at: new Date().toISOString() }, req));
      return no;
    },
    sent: () => read('sent'),
    /* счётчики в шапке и нижней панели: любой элемент с data-cnt="kp" или data-cnt="fav" */
    paint() {
      const n = { kp: read('kp').length, fav: read('fav').length };
      document.querySelectorAll('[data-cnt]').forEach(c => { const v = n[c.dataset.cnt] || 0; c.textContent = v; c.hidden = !v; });
    }
  };
  addEventListener('ymstore', () => YM.paint());
  /* другая вкладка поменяла список: обновляем счётчики и здесь */
  addEventListener('storage', e => { if (Object.values(KEYS).includes(e.key)) dispatchEvent(new CustomEvent('ymstore', { detail: 'other' })); });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => YM.paint()); else YM.paint();
})();
/* ---------- Страницы макета: КП, избранное, «Запрос отправлен», заглушки разделов ---------- */
(function () {
  const YM = window.YM, P = window.PRODUCTS || [], $ = (s, r) => (r || document).querySelector(s), $$ = (s, r) => [...(r || document).querySelectorAll(s)];
  const byId = id => P.find(p => p.id === id);
  const item = p => ({ id: p.id, name: p.brand + ' ' + p.model, kind: p.kind || '', price: p.price || null, img: p.img, url: p.url });
  const ext = u => /^https?:/.test(u || '') ? ' target="_blank" rel="noopener"' : '';
  const page = document.body.dataset.page;

  /* общее: лист «Связаться», всплывающая подсказка, кнопки «в КП» на заглушках */
  const cs = $('#contactSheet');
  document.addEventListener('click', e => {
    if (e.target.closest('[data-contact]')) { e.preventDefault(); cs.showModal(); }
    if (cs.open && (e.target === cs || e.target.closest('[data-close]'))) cs.close();
    const k = e.target.closest('[data-ids]');
    if (k) { const t = k.dataset.kit || '', list = k.dataset.ids.split(',').map(byId).filter(Boolean).map(p => Object.assign(item(p), t ? { kind: (p.kind || '') + ' · ' + t } : {})); const n = YM.addKp(list); toast(n ? 'В КП добавлено: ' + YM.word(n, 'позиция', 'позиции', 'позиций') : 'Комплект уже в списке КП'); }
    const a = e.target.closest('[data-add]');
    if (a) { const v = JSON.parse(a.dataset.add), list = [].concat(v); const n = YM.addKp(list); toast(n ? (list.length > 1 ? 'В КП добавлено: ' + YM.word(n, 'позиция', 'позиции', 'позиций') : 'Добавлено в КП') : 'Уже в списке КП'); }
  });
  let tt;
  function toast(text) {
    let t = $('.toast'); if (!t) { t = document.createElement('div'); t.className = 'toast'; t.setAttribute('role', 'status'); document.body.appendChild(t); }
    t.innerHTML = `<span>${YM.esc(text)}</span><a href="kp.html">Открыть список КП</a>`;
    t.classList.add('on'); clearTimeout(tt); tt = setTimeout(() => t.classList.remove('on'), 3200);
  }

  /* ---------- КП ---------- */
  if (page === 'kp') {
    const list = $('#kpList'), empty = $('#kpEmpty'), withBox = $('#kpWith'), form = $('#kpForm');
    const WITH = {
      ustanovka: ['kompressor-lifedent-sa075', 'nakonechnik-nsk-s-max-m600l', 'avtoklav-anthos-a22', 'rentgen-myray-zen-x-hd'],
      avtoklav: ['avtoklav-melag-melatherm-10', 'kompressor-lifedent-sa075'],
      rentgen: ['rentgen-vatech-ezsensor-hd', 'rentgen-myray-zen-x-hd'],
      any: ['kompressor-lifedent-sa075', 'avtoklav-anthos-a22', 'nakonechnik-nsk-s-max-m600l', 'rentgen-vatech-ezsensor-hd']
    };
    if (location.hash === '#lease') form.lease.checked = true;
    function draw() {
      const items = YM.kp(), sum = YM.sum(items), un = YM.unpriced(items);
      empty.hidden = !!items.length;
      list.innerHTML = items.map(x => `<article class="kpi" data-id="${YM.esc(x.id)}">
        <a class="kpi-im" href="${YM.esc(x.url)}"${ext(x.url)}><img src="${YM.esc(x.img)}" alt=""></a>
        <div class="kpi-tx"><a class="kpi-nm" href="${YM.esc(x.url)}"${ext(x.url)}>${YM.esc(x.name)}</a><small>${YM.esc(x.kind)}</small></div>
        <div class="kpi-q" aria-label="Количество"><button type="button" data-q="-1" aria-label="Меньше">−</button><span>${x.qty || 1}</span><button type="button" data-q="1" aria-label="Больше">+</button></div>
        <div class="kpi-pr">${x.price ? `<b>${YM.rub(x.price * (x.qty || 1))}</b><small>${(x.qty || 1) > 1 ? YM.rub(x.price) + ' за шт.' : 'в лизинг от ' + YM.rub(YM.lease(x.price)) + '/мес'}</small>` : '<span class="ask">Цену уточнит менеджер</span>'}</div>
        <button class="kpi-x" type="button" data-rm aria-label="Убрать из списка">✕</button></article>`).join('');
      $('#kpN').textContent = items.length ? 'В списке ' + YM.word(items.length, 'позиция', 'позиции', 'позиций') : 'Список пуст';
      $('#kpSum').textContent = sum ? YM.rub(sum) : items.length ? 'по запросу' : '—';
      $('#kpLease').textContent = sum ? 'в лизинг от ' + YM.rub(YM.lease(sum)) + '/мес, пример: аванс 10 %, 36 месяцев' : '';
      $('#kpUn').textContent = un && sum ? 'Без цены ' + YM.word(un, 'позиция', 'позиции', 'позиций') + ': её уточнит менеджер' : '';
      /* счёт только когда у всех позиций есть цена */
      const inv = $('#optInv'), canInv = items.length && !un;
      inv.classList.toggle('off', !canInv); inv.querySelector('input').disabled = !canInv;
      if (!canInv && inv.querySelector('input').checked) form.type.value = 'КП';
      $('#invHint').textContent = !items.length ? 'Сначала добавьте оборудование в список' : un ? 'Недоступен: цену части позиций уточнит менеджер' : 'Для юрлица по ценам сайта, без переписки';
      $('#whatL').firstChild.textContent = items.length ? 'Комментарий к запросу' : 'Что нужно подобрать';
      /* «С этим берут»: из того, чего ещё нет в списке */
      const has = new Set(items.map(x => x.id)), kinds = new Set(items.map(x => String(x.id).split('-')[0]));
      const ids = [...new Set([].concat(...['ustanovka', 'avtoklav', 'rentgen'].filter(k => kinds.has(k)).map(k => WITH[k]), items.length ? [] : WITH.any))].filter(id => !has.has(id));
      const sug = (ids.length ? ids : WITH.any.filter(id => !has.has(id))).map(byId).filter(Boolean).slice(0, 4);
      withBox.hidden = !sug.length;
      $('.kp-with-row', withBox).innerHTML = sug.map(p => `<div class="sug"><img src="${YM.esc(p.img)}" alt="" loading="lazy"><b>${YM.esc(p.brand + ' ' + p.model)}</b><small>${YM.esc(p.kind || '')}</small><span>${YM.rub(p.price)}</span><button type="button" data-sug="${p.id}">+ В КП</button></div>`).join('');
      $('#kpWithT').textContent = items.length ? 'С этим берут' : 'Чаще всего берут';
    }
    list.addEventListener('click', e => {
      const row = e.target.closest('.kpi'); if (!row) return;
      const id = row.dataset.id, x = YM.kp().find(i => i.id === id); if (!x) return;
      const q = e.target.closest('[data-q]'); if (q) YM.setQty(id, (x.qty || 1) + Number(q.dataset.q));
      if (e.target.closest('[data-rm]')) YM.removeKp(id);
    });
    withBox.addEventListener('click', e => { const b = e.target.closest('[data-sug]'); if (b) { const p = byId(b.dataset.sug); if (p) YM.addKp([item(p)]); } });
    form.addEventListener('submit', e => {
      e.preventDefault();
      const st = $('.status', form);
      if (!YM.kp().length && form.what.value.trim().length < 3) { st.textContent = 'Добавьте оборудование в список или опишите, что нужно подобрать.'; return; }
      if (form.contact.value.trim().length < 5) { st.textContent = 'Укажите телефон или почту, чтобы мы могли ответить.'; return; }
      if (!form.ok.checked) { st.textContent = 'Отметьте согласие на обработку данных.'; return; }
      YM.send({ type: form.type.value, items: YM.kp(), what: form.what.value.trim(), clinic: form.clinic.value.trim(), contact: form.contact.value.trim(), lease: form.lease.checked, from: 'страница КП' });
      YM.clearKp(); location.href = 'sent.html';
    });
    addEventListener('ymstore', draw); draw();
  }

  /* ---------- Избранное ---------- */
  if (page === 'fav') {
    const grid = $('#favGrid'), empty = $('#favEmpty'), bar = $('#favBar'), msg = $('#favMsg');
    const HEART = '<svg class="ico" style="width:20px;height:20px"><use href="#i-heart"/></svg>';
    /* ссылка от коллеги: ?ids=… показывает его список и предлагает сохранить */
    const shared = (new URLSearchParams(location.search).get('ids') || '').split(',').map(byId).filter(Boolean).map(item);
    if (shared.length) {
      const box = $('#favShared'); box.hidden = false;
      $('b', box).textContent = 'Список от коллеги: ' + YM.word(shared.length, 'позиция', 'позиции', 'позиций');
      $('[data-save]', box).addEventListener('click', () => {
        const mine = YM.fav(); YM.setFav(mine.concat(shared.filter(s => !mine.some(m => m.id === s.id))));
        history.replaceState(null, '', location.pathname); box.hidden = true; msg.textContent = 'Список сохранён в вашем избранном';
      });
    }
    function draw() {
      const items = YM.fav();
      empty.hidden = !!items.length; bar.hidden = !items.length;
      grid.innerHTML = items.map(x => { const on = YM.inKp(x.id); return `<article class="fc" data-id="${YM.esc(x.id)}">
        <button class="fav-x" type="button" data-unfav aria-label="Убрать из избранного">${HEART}</button>
        <a href="${YM.esc(x.url)}"${ext(x.url)}><img src="${YM.esc(x.img)}" alt="" loading="lazy"></a>
        <a class="fc-nm" href="${YM.esc(x.url)}"${ext(x.url)}>${YM.esc(x.name)}</a><small>${YM.esc(x.kind)}</small>
        <span class="fc-pr">${x.price ? YM.rub(x.price) : 'цена по запросу'}</span>${x.price ? `<span class="fc-lz">в лизинг от ${YM.rub(YM.lease(x.price))}/мес</span>` : ''}
        <div class="fc-acts"><button class="btn ${on ? 'line on' : 'grad'}" type="button" data-tokp>${on ? 'В КП ✓' : 'В КП'}</button><button class="hrt" type="button" data-unfav aria-label="Убрать из избранного">${HEART}</button></div></article>`; }).join('');
    }
    grid.addEventListener('click', e => {
      const c = e.target.closest('.fc'); if (!c) return;
      const x = YM.fav().find(i => i.id === c.dataset.id); if (!x) return;
      if (e.target.closest('[data-unfav]')) YM.toggleFav(x);
      if (e.target.closest('[data-tokp]')) { YM.inKp(x.id) ? YM.removeKp(x.id) : YM.addKp([x]); }
    });
    $('#favAll').addEventListener('click', () => { const n = YM.addKp(YM.fav()); toast(n ? 'В КП добавлено: ' + YM.word(n, 'позиция', 'позиции', 'позиций') : 'Всё избранное уже в списке КП'); });
    $('#favShare').addEventListener('click', () => {
      const ids = YM.fav().map(x => x.id).filter(byId);
      const url = location.href.split(/[?#]/)[0] + '?ids=' + ids.join(',');
      const done = () => { msg.textContent = 'Ссылка скопирована. Её можно отправить владельцу клиники или врачу.'; };
      if (navigator.share) navigator.share({ title: 'Оборудование ЯрМед', url }).catch(() => {});
      else if (navigator.clipboard) navigator.clipboard.writeText(url).then(done, () => { msg.textContent = url; });
      else msg.textContent = url;
    });
    addEventListener('ymstore', draw); draw();
  }

  /* ---------- Запрос отправлен ---------- */
  if (page === 'sent') {
    const r = YM.sent();
    if (!r) { $('#sentNo').closest('p').textContent = 'Здесь появится подтверждение, когда вы отправите запрос.'; $('#sentCard').hidden = true; }
    else {
      $('#sentNo').textContent = r.no;
      $('#sentH').textContent = r.type === 'Звонок' ? 'Заявка на звонок принята' : r.type === 'Расчёт проекта' ? 'Запрос на расчёт отправлен' : 'Запрос отправлен';
      const rows = [['Что прислать', r.type === 'Счёт' ? 'Счёт на оплату' : r.type === 'КП' ? 'Коммерческое предложение' : r.type], ['Клиника или ИНН', r.clinic], ['Контакт', r.contact], ['Запрос', r.what], ['Расчёт лизинга', r.lease ? 'нужен' : ''], ['Проект', r.project]].filter(x => x[1]);
      const items = r.items || [], sum = YM.sum(items);
      $('#sentCard').innerHTML = `<dl>${rows.map(x => `<dt>${x[0]}</dt><dd>${YM.esc(x[1])}</dd>`).join('')}</dl>` + items.map(x => `<div class="sent-it"><img src="${YM.esc(x.img)}" alt=""><span>${YM.esc(x.name)}${(x.qty || 1) > 1 ? ' × ' + x.qty : ''}</span><em>${x.price ? YM.rub(x.price * (x.qty || 1)) : 'по запросу'}</em></div>`).join('')
        + (sum ? `<div class="sent-it"><span></span><span><b>Итого</b></span><em>${YM.rub(sum)}</em></div>` : '');
    }
  }

  /* ---------- Расчёт проекта (услуга «под ключ»): своя форма, список КП прикладывается ---------- */
  const pf = $('#projForm');
  if (pf) {
    const att = $('#projKp'), n = YM.kp().length;
    if (n) att.textContent = 'К заявке приложим ваш список КП: ' + YM.word(n, 'позиция', 'позиции', 'позиций') + '.';
    pf.addEventListener('submit', e => {
      e.preventDefault();
      const st = $('.status', pf);
      if (pf.contact.value.trim().length < 5) { st.textContent = 'Укажите телефон или почту, чтобы мы могли ответить.'; return; }
      if (!pf.ok.checked) { st.textContent = 'Отметьте согласие на обработку данных.'; return; }
      const project = [pf.city.value.trim(), pf.area.value ? pf.area.value + ' м²' : '', pf.stage.value].filter(Boolean).join(', ');
      YM.send({ type: 'Расчёт проекта', items: YM.kp(), project, contact: pf.contact.value.trim(), from: 'страница «Стоматология под ключ»' });
      location.href = 'sent.html';
    });
  }

  /* ---------- Лизинг: примеры платежа ---------- */
  $$('[data-lease]').forEach(el => { el.textContent = 'от ' + YM.rub(YM.lease(Number(el.dataset.lease))) + '/мес'; });
})();
/* ---------- Шаблоны каталога: фильтр раздела, избранное, галерея и исполнения карточки ----------
   На Битриксе фильтр делает компонент bitrix:catalog.smart.filter, здесь та же логика в браузере. */
(function () {
  const YM = window.YM, $ = (s, r) => (r || document).querySelector(s), $$ = (s, r) => [...(r || document).querySelectorAll(s)];

  /* избранное: кнопки с data-fav на списке и в карточке */
  function paintFav() { $$('[data-fav]').forEach(b => { const it = JSON.parse(b.dataset.fav); b.setAttribute('aria-pressed', YM.inFav(it.id) ? 'true' : 'false'); }); }
  function paintKp() { $$('[data-add]').forEach(b => { const it = JSON.parse(b.dataset.add); const on = YM.inKp(it.id); b.classList.toggle('on', on); if (b.dataset.l) b.lastChild.textContent = on ? 'В списке КП ✓' : b.dataset.l; }); }
  document.addEventListener('click', e => {
    const f = e.target.closest('[data-fav]');
    if (f) { e.preventDefault(); YM.toggleFav(JSON.parse(f.dataset.fav)); }
  });
  $$('[data-add]').forEach(b => { b.dataset.l = b.textContent; b.textContent = ''; b.append(document.createTextNode(b.dataset.l)); });
  addEventListener('ymstore', () => { paintFav(); paintKp(); });
  paintFav(); paintKp();

  /* ---------- раздел и подборки: фильтр ---------- */
  const grid = $('#grid');
  if (grid) {
    const cards = $$('.kc', grid), form = $('#flt'), cnt = $('#cntT'), more = $('#more'), chosen = $('#chosen'), sort = $('#sort');
    const PAGE = +grid.dataset.page || 18; let shown = PAGE;
    const PR = {}; $$('input[name=price]', form).forEach(i => (PR[i.value] = [+i.dataset.min, +i.dataset.max]));
    const get = () => { const v = {}; $$('input:checked', form).forEach(i => (v[i.name] = v[i.name] || []).push(i.value)); return v; };
    const fits = (c, v, skip) => Object.keys(v).every(k => {
      if (k === skip) return true;
      const d = c.dataset;
      if (k === 'price') return v[k].some(r => +d.pr > 0 && +d.pr >= PR[r][0] && +d.pr < PR[r][1]);
      return v[k].some(x => (d[k] || '').split(' ').includes(x));
    });
    function run(keep) {
      const v = get();
      if (!keep) shown = PAGE;
      /* сортировка */
      const s = sort.value, arr = cards.slice().sort((a, b) => s === 'asc' ? a.dataset.pr - b.dataset.pr : s === 'desc' ? b.dataset.pr - a.dataset.pr : a.dataset.rank - b.dataset.rank);
      arr.forEach(c => grid.appendChild(c));
      const help = $('.help', grid); if (help) grid.insertBefore(help, arr.filter(c => fits(c, v))[6] || null);
      let n = 0;
      arr.forEach(c => { const ok = fits(c, v); if (ok) n++; c.hidden = !ok || n > shown; });
      $('.empty-f', grid).hidden = !!n;
      cnt.textContent = YM.word(n, 'модель', 'модели', 'моделей');
      more.hidden = n <= shown; more.querySelector('span').textContent = Math.min(PAGE, n - shown);
      /* счётчики у пунктов: сколько будет, если отметить */
      $$('.fo', form).forEach(l => { const i = $('input', l), k = i.name; const m = cards.filter(c => fits(c, Object.assign({}, v, { [k]: [i.value] }), null) ).length; l.querySelector('small').textContent = m; l.classList.toggle('off', !m && !i.checked); });
      chosen.innerHTML = $$('input:checked', form).map(i => `<button type="button" data-un="${i.name}:${i.value}">${YM.esc(i.closest('.fo').dataset.t)} ✕</button>`).join('');
      $('#fgo span').textContent = n;
    }
    form.addEventListener('change', () => run());
    sort.addEventListener('change', () => run(true));
    chosen.addEventListener('click', e => { const b = e.target.closest('[data-un]'); if (!b) return; const [k, val] = b.dataset.un.split(':'); const i = $(`input[name="${k}"][value="${val}"]`, form); if (i) { i.checked = false; run(); } });
    $('#freset').addEventListener('click', () => { $$('input:checked', form).forEach(i => (i.checked = false)); run(); });
    more.addEventListener('click', () => { shown += PAGE; run(true); });
    /* телефон: фильтр во весь экран */
    const fb = $('#fbtn'); if (!$('fieldset', form)) fb.hidden = true;
    fb.addEventListener('click', () => { form.classList.add('open'); document.body.style.overflow = 'hidden'; });
    $$('[data-fclose]').forEach(b => b.addEventListener('click', () => { form.classList.remove('open'); document.body.style.overflow = ''; grid.scrollIntoView({ block: 'start' }); }));
    run();
  }

  /* ---------- карточка: галерея ---------- */
  const main = $('#pdMain');
  if (main) {
    $$('.pd-th [data-src]').forEach(b => b.addEventListener('click', () => { main.src = b.dataset.src; $$('.pd-th [aria-current]').forEach(x => x.removeAttribute('aria-current')); b.setAttribute('aria-current', 'true'); }));
  }

  /* ---------- карточка: исполнение меняет цену, лизинг и то, что кладём в КП ---------- */
  const vf = $('#pdVar');
  if (vf) {
    const buy = $$('[data-buy]');
    const set = () => {
      const i = $('input:checked', vf), it = JSON.parse(i.dataset.item);
      $$('[data-price]').forEach(el => (el.textContent = it.price ? YM.rub(it.price) : 'Цена по запросу'));
      $$('[data-lz]').forEach(el => (el.textContent = it.price ? 'в лизинг от ' + YM.rub(YM.lease(it.price)) + '/мес' : ''));
      buy.forEach(b => { b.dataset.add = JSON.stringify(it); });
      $$('[data-fav].pd-fav').forEach(b => { b.dataset.fav = JSON.stringify(it); });
      paintFav(); paintKp();
    };
    vf.addEventListener('change', set); set();
  }

  /* ---------- карточка: подсветка пункта меню разделов и нижняя панель покупки ---------- */
  const nav = $('.pd-nav');
  if (nav && 'IntersectionObserver' in window) {
    const links = $$('a', nav), io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) links.forEach(a => a.classList.toggle('on', a.getAttribute('href') === '#' + e.target.id)); }), { rootMargin: '-40% 0px -55% 0px' });
    $$('.pd-sec').forEach(s => io.observe(s));
    const bb = $('.buybar'), box = $('.pd-buy');
    if (bb && box) new IntersectionObserver(es => bb.classList.toggle('hide', es[0].isIntersecting)).observe(box);
  }
})();
/* ---------- Новый сайт: меню каталога, поиск, сцена раздела, фильтр брендов по стране ----------
   На Битриксе: меню каталога — bitrix:menu (шаблон yarmed_mega), поиск — bitrix:search.title. */
(function () {
  const $ = (s, r) => (r || document).querySelector(s), $$ = (s, r) => [...(r || document).querySelectorAll(s)];
  const YM = window.YM;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- меню каталога ---------- */
  const mega = $('#mega'), mbtn = $('#megaBtn');
  if (mega && window.YMMEGA && !mega.children.length) mega.innerHTML = window.YMMEGA;
  if (mega) {
    const open = on => { mega.hidden = !on; mbtn && mbtn.setAttribute('aria-expanded', on ? 'true' : 'false'); document.body.classList.toggle('mg-open', on); };
    mbtn && mbtn.addEventListener('click', () => open(mega.hidden));
    $$('[data-mega]').forEach(b => b.addEventListener('click', () => { open(mega.hidden); scrollTo({ top: 0 }); }));
    document.addEventListener('keydown', e => { if (e.key === 'Escape' && !mega.hidden) open(false); });
    document.addEventListener('click', e => { if (!mega.hidden && !e.target.closest('#mega, #megaBtn, [data-mega]')) open(false); });
    const show = i => { $$('.mg-i', mega).forEach(a => a.toggleAttribute('aria-current', a.dataset.pane === i)); $$('.mg-p', mega).forEach(p => (p.hidden = p.dataset.p !== i)); };
    $$('.mg-i', mega).forEach(a => {
      a.addEventListener('mouseenter', () => { if (matchMedia('(min-width: 1024px)').matches) show(a.dataset.pane); });
      a.addEventListener('focus', () => show(a.dataset.pane));
    });
  }

  /* ---------- поиск по каталогу ---------- */
  const dlg = $('#srch'), q = $('#srchQ'), res = $('#srchRes'), hint = $('#srchHint');
  const S = window.YMS || { p: [], s: [], b: [] };
  const norm = s => String(s).toLowerCase().replace(/ё/g, 'е').replace(/[^a-zа-я0-9]+/g, ' ').trim();
  const P = S.p.map(r => ({ r, k: norm(r[0] + ' ' + r[1] + ' ' + r[2]) }));
  function find(text) {
    const words = norm(text).split(' ').filter(Boolean);
    if (!words.length) return null;
    const hit = k => words.every(w => k.includes(w));
    const secs = S.s.filter(r => hit(norm(r[0]))).slice(0, 4), brands = S.b.filter(r => hit(norm(r[0]))).slice(0, 3);
    const prods = P.filter(x => hit(x.k)).slice(0, 8).map(x => x.r);
    return { secs, brands, prods, total: P.filter(x => hit(x.k)).length };
  }
  function draw() {
    const r = find(q.value);
    hint.hidden = !!r;
    if (!r) { res.innerHTML = ''; return; }
    if (!r.secs.length && !r.brands.length && !r.prods.length) { res.innerHTML = `<p class="sr-none">Ничего не нашли по «${YM.esc(q.value)}». Напишите модель иначе или <button type="button" data-contact>спросите менеджера</button>: подберём аналог.</p>`; return; }
    const chips = r.brands.map(b => `<a class="sr-chip b" href="${b[1]}">${YM.esc(b[0])}</a>`).concat(r.secs.map(s => `<a class="sr-chip" href="${s[1]}">${YM.esc(s[0])}</a>`)).join('');
    res.innerHTML = (chips ? `<div class="sr-chips">${chips}</div>` : '') + `<div class="sr-list">` + r.prods.map(p => `<a class="sr-p" href="${p[3]}">${p[4] ? `<img src="${p[4]}" alt="" loading="lazy">` : '<span></span>'}<span><b>${YM.esc(p[0])}</b><small>${YM.esc(p[2] || '')} · ${YM.esc(p[1])}</small></span><em>${p[5] ? YM.rub(p[5]) : 'по запросу'}</em></a>`).join('') + `</div>` + (r.total > 8 ? `<p class="sr-more">Показаны 8 из ${r.total}. Уточните запрос: добавьте модель или бренд.</p>` : '');
  }
  if (dlg) {
    $$('[data-search]').forEach(b => b.addEventListener('click', () => { dlg.showModal(); setTimeout(() => q.focus(), 30); }));
    dlg.addEventListener('click', e => { if (e.target === dlg || e.target.closest('[data-close]')) dlg.close(); if (e.target.closest('[data-contact]')) dlg.close(); });
    q.addEventListener('input', draw);
    $$('button', hint).forEach(b => b.addEventListener('click', () => { q.value = b.textContent; draw(); q.focus(); }));
  }

  /* ---------- сцена на первом экране раздела: передний план сменяется сам, лёгкий параллакс ---------- */
  $$('[data-stage]').forEach(st => {
    const items = $$('.st-i', st); if (items.length < 2) { items.forEach(i => i.classList.add('front')); return; }
    let cur = 0, t;
    const cap = $('.st-tag', st);
    const set = i => {
      cur = i; items.forEach((el, j) => { const pos = (j - i + items.length) % items.length; el.dataset.pos = pos; });
      if (cap && cap.getAttribute('href') !== items[i].getAttribute('href')) {
        cap.classList.add('swap');
        setTimeout(() => { cap.href = items[i].getAttribute('href'); cap.querySelector('b').textContent = items[i].dataset.cap; cap.querySelector('span').textContent = items[i].dataset.pr; cap.classList.remove('swap'); }, 250);
      }
    };
    set(0);
    const go = () => { t = setTimeout(() => { set((cur + 1) % items.length); go(); }, 4200); };
    if (!reduce) go();
    items.forEach((el, j) => el.addEventListener('mouseenter', () => { clearTimeout(t); set(j); }));
    st.addEventListener('mouseleave', () => { if (!reduce) { clearTimeout(t); go(); } });
    if (!reduce) st.addEventListener('pointermove', e => { const r = st.getBoundingClientRect(); st.style.setProperty('--mx', ((e.clientX - r.left) / r.width - 0.5).toFixed(3)); st.style.setProperty('--my', ((e.clientY - r.top) / r.height - 0.5).toFixed(3)); });
  });

  /* ---------- бренды: фильтр по стране ---------- */
  const chips = $('#bchips');
  if (chips) chips.addEventListener('click', e => {
    const b = e.target.closest('[data-c]'); if (!b) return;
    $$('.chip', chips).forEach(x => x.classList.toggle('on', x === b));
    $$('.bgrid .bc').forEach(c => (c.hidden = b.dataset.c && c.dataset.country !== b.dataset.c));
  });

  /* ---------- формы заявок (ремонт, лицензия, вопрос): на Битриксе bitrix:form.result.new, после отправки «Запрос отправлен» ---------- */
  $$('form[data-req]').forEach(f => f.addEventListener('submit', e => {
    e.preventDefault();
    const st = $('.status', f), c = f.contact;
    c.classList.remove('bad');
    if (c.value.trim().length < 5) { c.classList.add('bad'); st.textContent = 'Укажите телефон или почту, чтобы мы могли ответить.'; c.focus(); return; }
    if (!f.ok.checked) { st.textContent = 'Отметьте согласие на обработку данных.'; return; }
    const what = $$('input:not([type=checkbox]):not([name=contact]), select, textarea', f).map(i => i.value.trim()).filter(Boolean).join('; ');
    YM.send({ type: f.dataset.req, items: [], what, contact: c.value.trim(), from: document.title.split(' | ')[0] });
    location.href = 'sent.html';
  }));

  /* ---------- калькулятор лизинга: аннуитет при удорожании ~18 % годовых (как YM.lease) ---------- */
  $$('[data-calc]').forEach(box => {
    const inp = n => $(`input[name=${n}]`, box), put = (n, v) => $$(`[data-o=${n}]`, box).forEach(o => (o.textContent = v));
    const calc = () => {
      const price = +inp('price').value, adv = +inp('adv').value / 100, term = +inp('term').value, r = 0.18 / 12;
      const pay = Math.round(price * (1 - adv) * r / (1 - Math.pow(1 + r, -term)) / 100) * 100;
      put('price', YM.rub(price)); put('adv', Math.round(adv * 100) + ' %'); put('term', term + ' мес.');
      put('pay', YM.rub(pay)); put('advr', YM.rub(price * adv)); put('total', YM.rub(pay * term + price * adv));
      $$('.cl-pick button', box).forEach(b => b.classList.toggle('on', +b.dataset.p === price));
    };
    $$('input', box).forEach(i => i.addEventListener('input', calc));
    $$('.cl-pick button', box).forEach(b => b.addEventListener('click', () => { inp('price').value = b.dataset.p; calc(); }));
    calc();
  });

  /* ---------- ленты: стрелки на компьютере ---------- */
  $$('.hrail, .rail').forEach(r => {
    if (r.scrollWidth <= r.clientWidth + 8) return;
    const w = document.createElement('div'); w.className = 'rail-nav';
    w.innerHTML = '<button type="button" aria-label="Назад">‹</button><button type="button" aria-label="Вперёд">›</button>';
    r.after(w);
    const [a, b] = w.children;
    a.addEventListener('click', () => r.scrollBy({ left: -r.clientWidth * 0.8, behavior: reduce ? 'auto' : 'smooth' }));
    b.addEventListener('click', () => r.scrollBy({ left: r.clientWidth * 0.8, behavior: reduce ? 'auto' : 'smooth' }));
  });
})();
