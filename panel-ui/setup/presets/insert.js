import { TEXT_APPS, cmdCtrl, linkInsertMappings, preset } from './factory.js';

export const INSERT_PRESETS = [
  preset({
    id: 'insert-link',
    label: 'Insert Link',
    iconId: 'link',
    category: 'insert',
    actionType: 'single',
    scope: { apps: TEXT_APPS, platforms: ['mac', 'win'] },
    mappings: cmdCtrl('K', TEXT_APPS)
  }),
  preset({
    id: 'apply-link',
    label: 'Apply Link',
    iconId: 'link',
    category: 'insert',
    actionType: 'sequence',
    scope: { apps: TEXT_APPS, platforms: ['mac', 'win'] },
    mappings: linkInsertMappings(TEXT_APPS, 'https://www.sofascore.com/')
  }),
  preset({
    id: 'source-link',
    label: 'Source Link',
    iconId: 'link',
    category: 'insert',
    actionType: 'sequence',
    scope: { apps: TEXT_APPS, platforms: ['mac', 'win'] },
    mappings: linkInsertMappings(TEXT_APPS, 'https://source.example/')
  }),
  preset({
    id: 'ref-link',
    label: 'Ref Link',
    iconId: 'link',
    category: 'insert',
    actionType: 'sequence',
    scope: { apps: TEXT_APPS, platforms: ['mac', 'win'] },
    mappings: linkInsertMappings(TEXT_APPS, 'https://ref.example/')
  })
];
