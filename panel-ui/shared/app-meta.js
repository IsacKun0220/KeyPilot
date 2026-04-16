export const APP_IDS = ['word', 'excel', 'powerpoint', 'docs', 'sheets', 'slides'];

export const APP_LABELS = {
  word: 'Word',
  excel: 'Excel',
  powerpoint: 'PowerPoint',
  docs: 'Google Docs',
  sheets: 'Google Sheets',
  slides: 'Google Slides'
};

export const APP_NAV_LABELS = {
  word: 'Word',
  excel: 'Excel',
  powerpoint: 'PowerPoint',
  docs: 'Docs',
  sheets: 'Sheets',
  slides: 'Slides'
};

export const APP_LOGOS = {
  word: '/assets/app-logos/word.svg',
  excel: '/assets/app-logos/excel.svg',
  powerpoint: '/assets/app-logos/powerpoint.svg',
  docs: '/assets/app-logos/docs.webp',
  sheets: '/assets/app-logos/sheets.webp',
  slides: '/assets/app-logos/slides.webp'
};

export const APP_ICON_FALLBACKS = {
  word: 'W',
  excel: 'X',
  powerpoint: 'P',
  docs: '',
  sheets: '',
  slides: ''
};

export const APP_GROUPS = {
  Microsoft: ['word', 'excel', 'powerpoint'],
  Google: ['docs', 'sheets', 'slides']
};

export const PLATFORM_IDS = ['mac', 'win'];

export const PLATFORM_LABELS = {
  mac: 'Mac',
  win: 'Windows'
};

export const APP_META = APP_IDS.reduce((meta, appId) => {
  const group = Object.entries(APP_GROUPS).find(([, appIds]) => appIds.includes(appId))?.[0] || 'General';
  meta[appId] = {
    id: appId,
    label: APP_LABELS[appId],
    navLabel: APP_NAV_LABELS[appId],
    logo: APP_LOGOS[appId],
    group
  };
  return meta;
}, {});
