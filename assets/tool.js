(function(){
  const DPI = 300; // нижняя граница требования «не менее 300–450 DPI» — файл компактнее, требованию отвечает
  function mmToPx(mm){ return Math.round(mm / 25.4 * DPI); }

  const RAW_PRESETS = {
    gosuslugi: { label:'Госуслуги', full:'Госуслуги (фото профиля)', mmW:35, mmH:45, minKB:10, maxKB:5120 },
    passport:  { label:'Загранпаспорт', full:'Загранпаспорт (фото для анкеты)', mmW:35, mmH:45, minKB:10, maxKB:5120 },
    ege:       { label:'ЕГЭ / ОГЭ', full:'ЕГЭ / ОГЭ (регистрация)', mmW:35, mmH:45, minKB:10, maxKB:5120 },
    driver:    { label:'Права', full:'Водительское удостоверение', mmW:30, mmH:40, minKB:10, maxKB:5120 },
    military:  { label:'Военный билет', full:'Военный билет', mmW:30, mmH:40, minKB:10, maxKB:5120 }
  };

  const PRESETS = {};
  Object.keys(RAW_PRESETS).forEach(key=>{
    const p = RAW_PRESETS[key];
    PRESETS[key] = { label:p.label, full:p.full, mmW:p.mmW, mmH:p.mmH, w:mmToPx(p.mmW), h:mmToPx(p.mmH), minKB:p.minKB, maxKB:p.maxKB };
  });
  PRESETS.custom = { label:'Свой размер', full:'свои параметры', w:300, h:400, minKB:10, maxKB:200 };

  const COPY = {
    gosuslugi: {
      eyebrow:'ГОСУСЛУГИ',
      h1:'Фото на Госуслуги за 10 секунд',
      intro:'По официальным требованиям портала фото должно быть <strong>35×45 мм</strong>, разрешением не менее 300–450 DPI, весом от 10 КБ до 5 МБ. Загрузите фото — подгоним автоматически.'
    },
    passport: {
      eyebrow:'ЗАГРАНПАСПОРТ',
      h1:'Фото на загранпаспорт за 10 секунд',
      intro:'Для заявления на загранпаспорт нового образца через Госуслуги фото должно быть <strong>35×45 мм</strong>, разрешением не менее 300 DPI, весом до 5 МБ. Загрузите фото — получите готовый файл.'
    },
    ege: {
      eyebrow:'ЕГЭ / ОГЭ',
      h1:'Фото для регистрации на ЕГЭ и ОГЭ',
      intro:'Для регистрации на ЕГЭ и ОГЭ часто используется тот же формат, что и для других документов через Госуслуги — <strong>35×45 мм</strong>. Загрузите фото — получите готовый файл нужного размера.'
    },
    driver: {
      eyebrow:'ВОДИТЕЛЬСКОЕ УДОСТОВЕРЕНИЕ',
      h1:'Фото на права за 10 секунд',
      intro:'Для водительского удостоверения обычно требуется фото <strong>30×40 мм</strong>. Загрузите фото — подгоним размер и вес файла автоматически.'
    },
    military: {
      eyebrow:'ВОЕННЫЙ БИЛЕТ',
      h1:'Фото на военный билет за 10 секунд',
      intro:'Для военного билета обычно требуется фото <strong>30×40 мм</strong>, как и для водительского удостоверения. Загрузите фото — получите готовый файл.'
    },
    custom: {
      eyebrow:'СВОЙ РАЗМЕР',
      h1:'Задайте свой размер фото',
      intro:'Укажите нужные ширину, высоту и допустимый вес файла — подгоним фото под ваши параметры.'
    }
  };

  const pageEyebrow = document.getElementById('pageEyebrow');
  const pageH1 = document.getElementById('pageH1');
  const pageIntro = document.getElementById('pageIntro');

  function updatePageCopy(key){
    const c = COPY[key];
    if(!c || !pageH1) return;
    pageEyebrow.textContent = c.eyebrow;
    pageH1.textContent = c.h1;
    pageIntro.innerHTML = c.intro;
  }

  let currentKey = (window.TOCHNO_DEFAULT_PRESET && PRESETS[window.TOCHNO_DEFAULT_PRESET]) ? window.TOCHNO_DEFAULT_PRESET : 'gosuslugi';
  const presetsEl = document.getElementById('presets');
  const customFields = document.getElementById('customFields');
  const presetNote = document.getElementById('presetNote');
  const dropzone = document.getElementById('dropzone');
  const fileInput = document.getElementById('fileInput');
  const result = document.getElementById('result');
  const previewThumb = document.getElementById('previewThumb');
  const gaugeValue = document.getElementById('gaugeValue');
  const targetLabel = document.getElementById('targetLabel');
  const diffLine = document.getElementById('diffLine');
  const stampBadge = document.getElementById('stampBadge');
  const downloadBtn = document.getElementById('downloadBtn');
  const needleGroup = document.getElementById('needleGroup');
  const targetTick = document.getElementById('targetTick');
  const workCanvas = document.getElementById('workCanvas');
  const customW = document.getElementById('customW');
  const customH = document.getElementById('customH');
  const customMinKB = document.getElementById('customMinKB');
  const customMaxKB = document.getElementById('customMaxKB');
  let lastImg = null;
  let lastFileName = 'photo';

  function renderChips(){
    presetsEl.innerHTML = '';
    Object.keys(PRESETS).forEach(key=>{
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'chip' + (key===currentKey ? ' active' : '');
      btn.textContent = PRESETS[key].label;
      btn.addEventListener('click', ()=>{
        currentKey = key;
        renderChips();
        customFields.hidden = key !== 'custom';
        updateNote();
        updatePageCopy(key);
        if(lastImg) processImage();
      });
      presetsEl.appendChild(btn);
    });
  }

  function updateNote(){
    if(currentKey === 'custom'){
      presetNote.textContent = 'Укажите нужные ширину, высоту и допустимый вес файла.';
    } else {
      const p = PRESETS[currentKey];
      const mmPart = p.mmW ? ` (${p.mmW}×${p.mmH} мм при ${DPI} DPI)` : '';
      presetNote.textContent = `${p.full}: ${p.w}×${p.h} px${mmPart}, от ${p.minKB.toLocaleString('ru-RU')} КБ до ${(p.maxKB/1024).toLocaleString('ru-RU', {maximumFractionDigits:1})} МБ.`;
    }
  }

  function getTarget(){
    if(currentKey === 'custom'){
      return {
        w: Math.max(20, parseInt(customW.value,10) || 300),
        h: Math.max(20, parseInt(customH.value,10) || 400),
        minKB: Math.max(1, parseInt(customMinKB.value,10) || 10),
        maxKB: Math.max(5, parseInt(customMaxKB.value,10) || 200)
      };
    }
    const p = PRESETS[currentKey];
    return { w:p.w, h:p.h, minKB:p.minKB, maxKB:p.maxKB };
  }

  renderChips();
  updateNote();

  // --- drag & drop / file selection ---
  dropzone.addEventListener('click', ()=> fileInput.click());
  dropzone.addEventListener('keydown', e=>{
    if(e.key==='Enter' || e.key===' '){ e.preventDefault(); fileInput.click(); }
  });
  ['dragenter','dragover'].forEach(evt=>{
    dropzone.addEventListener(evt, e=>{ e.preventDefault(); dropzone.classList.add('drag'); });
  });
  ['dragleave','drop'].forEach(evt=>{
    dropzone.addEventListener(evt, e=>{ e.preventDefault(); dropzone.classList.remove('drag'); });
  });
  dropzone.addEventListener('drop', e=>{
    const f = e.dataTransfer.files && e.dataTransfer.files[0];
    if(f) handleFile(f);
  });
  fileInput.addEventListener('change', e=>{
    const f = e.target.files && e.target.files[0];
    if(f) handleFile(f);
  });

  let customDebounce = null;
  [customW, customH, customMinKB, customMaxKB].forEach(input=>{
    input.addEventListener('input', ()=>{
      if(currentKey !== 'custom' || !lastImg) return;
      clearTimeout(customDebounce);
      customDebounce = setTimeout(processImage, 350);
    });
  });

  function loadImage(file){
    return new Promise((resolve, reject)=>{
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = ()=>{ resolve(img); };
      img.onerror = reject;
      img.src = url;
    });
  }

  // cover-crop draw: fills target w×h, cropping centered, no distortion
  function drawCover(img, targetW, targetH){
    const canvas = workCanvas;
    canvas.width = targetW;
    canvas.height = targetH;
    const ctx = canvas.getContext('2d');
    const scale = Math.max(targetW / img.naturalWidth, targetH / img.naturalHeight);
    const srcW = targetW / scale;
    const srcH = targetH / scale;
    const srcX = (img.naturalWidth - srcW) / 2;
    const srcY = (img.naturalHeight - srcH) / 2;
    ctx.fillStyle = '#fff';
    ctx.fillRect(0,0,targetW,targetH);
    ctx.drawImage(img, srcX, srcY, srcW, srcH, 0, 0, targetW, targetH);
    return canvas;
  }

  function canvasToBlob(canvas, quality){
    return new Promise(resolve=> canvas.toBlob(b=>resolve(b), 'image/jpeg', quality));
  }

  async function compressToTarget(canvas, targetBytes){
    let low = 0.05, high = 0.95, best = null;
    for(let i=0;i<8;i++){
      const q = (low+high)/2;
      const blob = await canvasToBlob(canvas, q);
      if(blob.size > targetBytes){ high = q; } else { best = blob; low = q; }
    }
    if(!best){ best = await canvasToBlob(canvas, low); }
    return best;
  }

  function setGauge(valueKB, maxKB, targetKB){
    const angle = -90 + 180 * Math.min(Math.max(valueKB / maxKB, 0), 1);
    needleGroup.style.transform = `rotate(${angle}deg)`;
    const tAngle = -90 + 180 * Math.min(Math.max(targetKB / maxKB, 0), 1);
    const rad = tAngle * Math.PI / 180;
    const cx = 110, cy = 110, rOuter = 90, rInner = 76;
    const x1 = cx + rInner * Math.sin(rad), y1 = cy - rInner * Math.cos(rad);
    const x2 = cx + rOuter * Math.sin(rad), y2 = cy - rOuter * Math.cos(rad);
    targetTick.setAttribute('x1', x1); targetTick.setAttribute('y1', y1);
    targetTick.setAttribute('x2', x2); targetTick.setAttribute('y2', y2);
  }

  async function handleFile(file){
    if(!file.type.startsWith('image/')){ return; }
    lastFileName = file.name ? file.name.replace(/\.[^.]+$/, '') : 'photo';
    lastImg = await loadImage(file);
    await processImage();
  }

  async function processImage(){
    if(!lastImg) return;
    const target = getTarget();
    const canvas = drawCover(lastImg, target.w, target.h);
    const targetBytes = target.maxKB * 1024;
    const blob = await compressToTarget(canvas, targetBytes);
    const actualKB = Math.round(blob.size / 1024 * 10) / 10;
    const inRange = actualKB >= target.minKB && actualKB <= target.maxKB;

    previewThumb.src = canvas.toDataURL('image/jpeg', 0.85);
    previewThumb.classList.add('show');

    result.hidden = false;
    stampBadge.classList.remove('show');
    diffLine.classList.remove('show');
    downloadBtn.classList.remove('show');

    const maxScale = Math.max(actualKB, target.maxKB) * 1.15;
    setGauge(0, maxScale, target.maxKB);
    // force reflow so the transition plays from 0
    void needleGroup.offsetWidth;

    requestAnimationFrame(()=>{
      setGauge(actualKB, maxScale, target.maxKB);
      gaugeValue.textContent = actualKB.toLocaleString('ru-RU');
      const maxLabel = target.maxKB >= 1024
        ? `${(target.maxKB/1024).toLocaleString('ru-RU',{maximumFractionDigits:1})} МБ`
        : `${target.maxKB.toLocaleString('ru-RU')} КБ`;
      targetLabel.textContent = `${target.w}×${target.h} px, от ${target.minKB.toLocaleString('ru-RU')} КБ до ${maxLabel}`;
    });

    setTimeout(()=>{
      let diffText;
      if(actualKB < target.minKB){
        diffText = `Ниже минимума на ${(target.minKB - actualKB).toLocaleString('ru-RU',{maximumFractionDigits:1})} КБ`;
      } else if(actualKB > target.maxKB){
        diffText = `Превышает максимум на ${(actualKB - target.maxKB).toLocaleString('ru-RU',{maximumFractionDigits:1})} КБ`;
      } else {
        const headroom = target.maxKB - actualKB;
        diffText = headroom < 0.1
          ? 'Ровно на верхней границе допустимого веса'
          : `В пределах диапазона — до потолка ещё ${headroom.toLocaleString('ru-RU',{maximumFractionDigits:1})} КБ`;
      }
      diffLine.textContent = diffText;
      diffLine.classList.add('show');

      stampBadge.textContent = inRange ? '✓ Точно в требования' : '⚠ Проверьте вес файла';
      stampBadge.classList.toggle('warn', !inRange);
      stampBadge.classList.add('show');
      const url = URL.createObjectURL(blob);
      downloadBtn.href = url;
      downloadBtn.download = `${lastFileName}-${target.w}x${target.h}.jpg`;
      downloadBtn.classList.add('show');
    }, 1150);
  }
})();
