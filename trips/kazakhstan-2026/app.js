const VALID_CITIES = new Set(['astana', 'almaty']);
const DEFAULT_DAYS = { astana: '4', almaty: '9' };

let activeCity = 'astana';
let dayObserver = null;
let suppressDayObserver = false;
let scrollEndFallback = null;

function parseHash() {
  const hash = location.hash.slice(1);
  if (!hash) return { city: 'astana', day: null };

  const dayMatch = hash.match(/^(astana|almaty)-day-(\d+)$/);
  if (dayMatch) return { city: dayMatch[1], day: dayMatch[2] };

  if (VALID_CITIES.has(hash)) return { city: hash, day: null };

  return { city: 'astana', day: null };
}

function setGuideState(city, day) {
  document.documentElement.dataset.city = city;
  document.documentElement.dataset.day = day;
}

function getFirstDay(city) {
  return document.querySelector(`[data-city-panel="${city}"] .day`)?.dataset.daySection
    || DEFAULT_DAYS[city];
}

function highlightDayTab(day) {
  if (suppressDayObserver) return;
  document.documentElement.dataset.day = day;
}

function pauseDayObserverUntilScrollEnd() {
  suppressDayObserver = true;
  clearTimeout(scrollEndFallback);

  const resume = () => {
    suppressDayObserver = false;
    window.removeEventListener('scrollend', resume);
    clearTimeout(scrollEndFallback);
  };

  window.addEventListener('scrollend', resume, { once: true });
  scrollEndFallback = setTimeout(resume, 1500);
}

function scrollToDay(city, day, smooth = false, { fromTabClick = false } = {}) {
  const target = document.getElementById(`${city}-day-${day}`);
  if (!target) return;

  const currentDay = document.documentElement.dataset.day;
  const dayDiff = Math.abs(Number(day) - Number(currentDay));

  document.documentElement.dataset.day = day;

  if (fromTabClick && smooth && dayDiff > 1) {
    pauseDayObserverUntilScrollEnd();
  }

  target.scrollIntoView({ behavior: smooth ? 'smooth' : 'instant', block: 'start' });
}

function setupDayObserver() {
  if (dayObserver) dayObserver.disconnect();

  const panel = document.querySelector(`[data-city-panel="${activeCity}"]`);
  if (!panel) return;

  dayObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          highlightDayTab(entry.target.dataset.daySection);
        }
      });
    },
    { rootMargin: '-40% 0px -50% 0px' }
  );

  panel.querySelectorAll('.day').forEach((section) => dayObserver.observe(section));
}

function setActiveCity(city, { scroll = false, day = null, smooth = scroll, fromTabClick = false } = {}) {
  activeCity = city;

  const resolvedDay = day
    || document.querySelector(`[data-city-panel="${city}"] .day`)?.dataset.daySection
    || DEFAULT_DAYS[city];

  setGuideState(city, resolvedDay);
  setupDayObserver();

  if (day) {
    scrollToDay(city, day, smooth, { fromTabClick });
  } else if (scroll) {
    if (fromTabClick) pauseDayObserverUntilScrollEnd();
    scrollToDay(city, resolvedDay, smooth);
  }
}

function applyFromHash({ smooth = false } = {}) {
  const { city, day } = parseHash();
  setActiveCity(city, { day, smooth });
}

document.querySelectorAll('[data-city-tab]').forEach((tab) => {
  tab.addEventListener('click', () => {
    const city = tab.dataset.cityTab;
    setActiveCity(city, { scroll: true, fromTabClick: true });
    history.replaceState(null, '', `#${city}`);
  });
});

document.querySelectorAll('[data-day-tab]').forEach((tab) => {
  tab.addEventListener('click', () => {
    const city = tab.closest('[data-day-tabs]')?.dataset.dayTabs;
    if (!city) return;

    const day = tab.dataset.dayTab;
    scrollToDay(city, day, true, { fromTabClick: true });
    history.replaceState(null, '', `#${city}-day-${day}`);
  });
});

document.querySelector('.hero__cta[href="#guide"]')?.addEventListener('click', (e) => {
  e.preventDefault();
  const city = document.documentElement.dataset.city || activeCity;
  setActiveCity(city, { scroll: true, fromTabClick: true });
  history.replaceState(null, '', `#${city}`);
});

document.querySelector('.hero__cta[href="#bonus"]')?.addEventListener('click', (e) => {
  e.preventDefault();
  document.getElementById('bonus')?.scrollIntoView({ behavior: 'smooth' });
});

document.querySelector('.footer__top')?.addEventListener('click', (e) => {
  e.preventDefault();
  const city = document.documentElement.dataset.city || activeCity;
  setGuideState(city, getFirstDay(city));
  pauseDayObserverUntilScrollEnd();
  history.replaceState(null, '', `#${city}`);
  document.getElementById('top')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
});

window.addEventListener('hashchange', () => applyFromHash());

activeCity = document.documentElement.dataset.city || 'astana';
setupDayObserver();

const { city, day } = parseHash();
if (day) {
  requestAnimationFrame(() => scrollToDay(city, day, false));
}
