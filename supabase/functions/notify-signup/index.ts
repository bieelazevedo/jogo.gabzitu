import {createClient} from 'npm:@supabase/supabase-js@2.118.0';

// This endpoint is called by a server-side schedule. The browser cannot request an email.
async function matchesSecret(actual:string,expected:string){
 const digest=async(s:string)=>new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s)));
 const [a,b]=await Promise.all([digest(actual),digest(expected)]);let delta=0;for(let i=0;i<a.length;i++)delta|=a[i]^b[i];return delta===0;
}
Deno.serve(async request=>{
 if(request.method!=='POST')return new Response('Method not allowed',{status:405});
 const secret=Deno.env.get('SIGNUP_NOTIFY_SECRET'),apiKey=Deno.env.get('RESEND_API_KEY'),from=Deno.env.get('SIGNUP_NOTIFY_FROM');
 if(!secret||!apiKey||!from)return Response.json({error:'Notification service not configured'},{status:503});
 if(!await matchesSecret(request.headers.get('x-notify-secret')||'',secret))return new Response('Unauthorized',{status:401});
 const admin=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,{auth:{persistSession:false,autoRefreshToken:false}});
 const {data:items,error}=await admin.rpc('claim_signup_notifications');
 if(error)return Response.json({error:'Cannot reserve notifications'},{status:500});
 let sent=0,failed=0;
 for(const item of items||[]){
  let success=false,reason='Provider unavailable';
  try{
   const response=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:'Bearer '+apiKey,'Content-Type':'application/json','Idempotency-Key':'signup-'+item.id},body:JSON.stringify({from,to:['azevedo-biel@live.com'],subject:'Dungeon Nightreign · novo utilizador',text:'Foi criada uma nova conta no Dungeon Nightreign.\n\nNome: '+(item.display_name||'Não indicado')+'\nEmail: '+item.email+'\nRegisto: '+item.created_at+'\n\nAviso administrativo automático. Não inclui palavras-passe.'}),signal:AbortSignal.timeout(12000)});
   success=response.ok;if(!success)reason='Email provider HTTP '+response.status;
  }catch{reason='Email provider timeout or network error';}
  const {error:finishError}=await admin.rpc('finish_signup_notification',{p_id:item.id,p_success:success,p_error:success?null:reason});
  if(finishError)return Response.json({error:'Cannot acknowledge notification'},{status:500});
  if(success)sent++;else failed++;
 }
 return Response.json({sent,failed},{status:failed?502:200});
});
