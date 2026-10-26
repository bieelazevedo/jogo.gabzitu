const paths:Record<string,string>={
 yarn:'<circle cx="11" cy="11" r="8"/><path d="M5 7c7 0 10 4 12 9M3 12c5-3 12-2 16 2M7 4c-1 7 2 11 7 15M17 17c5 1 1 5 6 5"/>',
 war:'<path d="M6 22V3m0 1c5-4 9 4 15 0v11c-6 4-10-4-15 0"/>',
 heal:'<path d="M9 3h6v6h6v6h-6v6H9v-6H3V9h6Z"/>',
 box:'<path d="m2 8 10-5 10 5-10 5Zm0 0v11l10 4 10-4V8M12 13v10M7 5l10 5"/>',
 sardine:'<path d="M3 12c5-9 12-7 15 0-3 7-10 9-15 0Zm15 0 5-5v10ZM7 10v1"/>',
 uia:'<path d="M5 8a8 8 0 1 1-1 7M2 3l3 5 5-3"/><circle cx="12" cy="12" r="3"/>',
 scout:'<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8S1 12 1 12Z"/><circle cx="12" cy="12" r="3"/>',

 campaign:'<path d="m3 5 6-2 6 2 6-2v16l-6 2-6-2-6 2zM9 3v16M15 5v16"/>',
 coop:'<circle cx="8" cy="7" r="3"/><circle cx="17" cy="8" r="2"/><path d="M2 21v-5a6 6 0 0 1 12 0v5M16 14a5 5 0 0 1 6 5v2"/>',
 account:'<circle cx="12" cy="7" r="4"/><path d="M4 22v-3a8 8 0 0 1 16 0v3"/>',
 settings:'<path d="M4 7h16M4 17h16M8 4v6M16 14v6"/>',
 help:'<circle cx="12" cy="12" r="10"/><path d="M9 8a3 3 0 1 1 5 3c-2 1-2 2-2 3M12 17v1"/>',
 endless:'<path d="M12 12C5-1-4 21 7 17l10-10c11-4 2 18-5 5Z"/>',
 continue:'<path d="m8 4 12 8-12 8Z"/>',
 'resume-checkpoint':'<path d="m8 4 12 8-12 8Z"/>',
 home:'<path d="m3 11 9-8 9 8M5 10v11h14V10M10 21v-7h4v7"/>'
};
export function gameIcon(action:string){const p=paths[action];return p?`<svg class="game-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${p}</svg>`:'';}
export function decorateMenu(root:HTMLElement){for(const button of root.querySelectorAll<HTMLButtonElement>('.main-menu>button')){const icon=gameIcon(button.dataset.action||'');if(icon){button.classList.add('with-game-icon');button.insertAdjacentHTML('afterbegin',icon);}}}
