/** Valores públicos do projeto; nunca colocar service_role, SMTP ou segredos neste ficheiro. */
export const publicConfig={
 supabaseUrl:'https://ubijdcdrfwyebwtfoeyv.supabase.co',
 supabaseKey:'sb_publishable_WiOAcg7mpgu4B3yFsxzTow_IC0bq5Ki',
 controller:'Gabriel Azevedo',
 contact:'azevedo-biel@live.com',
 // Email confirmations and invite links point at wherever the game is hosted (Netlify, Cloudflare, ...).
 // Add that address under Supabase → Authentication → URL Configuration.
 origin:typeof location!=='undefined'&&/^https?:/.test(location.origin)?location.origin:'https://muralhasebigodes.pages.dev',
 privacyVersion:'2026-10-25',
};
