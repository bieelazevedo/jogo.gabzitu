import {it,expect,vi,afterEach} from 'vitest';
import {GameAccount} from '../src/account';
afterEach(()=>vi.unstubAllGlobals());
it('regista sem token de convite e envia apenas a declaração e o nome opcional',async()=>{
 const signUp=vi.fn().mockResolvedValue({data:{session:null},error:null});vi.stubGlobal('sessionStorage',{removeItem:vi.fn()});
 const account={client:{auth:{signUp}}} as unknown as GameAccount;
 expect(await GameAccount.prototype.register.call(account,' novo@example.com ','123456',true,'  Pessoa  ')).toBe(false);
 const request=signUp.mock.calls[0][0];expect(request.email).toBe('novo@example.com');expect(request.options.data.display_name).toBe('Pessoa');expect(request.options.data.adult_attested).toBe(true);expect(request.options.data).not.toHaveProperty('invite_token');expect(request.options.data).not.toHaveProperty('birth');
});
it('recusa dados inválidos antes de contactar a autenticação',async()=>{
 const signUp=vi.fn(),account={client:{auth:{signUp}}} as unknown as GameAccount;
 await expect(GameAccount.prototype.register.call(account,'novo@example.com','123456',false)).rejects.toThrow('18 anos');
 await expect(GameAccount.prototype.register.call(account,'inválido','123456',true)).rejects.toThrow('email válido');expect(signUp).not.toHaveBeenCalled();
});

it('reenvia a confirmação para o endereço do jogo sem recriar o utilizador',async()=>{const resend=vi.fn().mockResolvedValue({error:null});const account={client:{auth:{resend}}} as unknown as GameAccount;await GameAccount.prototype.resendConfirmation.call(account,' pessoa@example.com ');expect(resend).toHaveBeenCalledWith({type:'signup',email:'pessoa@example.com',options:{emailRedirectTo:'https://muralhasebigodes.pages.dev/?conta=confirmar'}});});

it('descarta a sincronização de uma sessão que já foi substituída',async()=>{vi.stubGlobal('navigator',{onLine:true});let finish!:(x:unknown)=>void;const from=vi.fn();const account={user:{id:'primeira'},generation:1,client:{rpc:()=>new Promise(r=>finish=r),from}};const pending=GameAccount.prototype.pull.call(account as unknown as GameAccount);account.user={id:'segunda'};account.generation++;finish({data:true,error:null});await expect(pending).rejects.toThrow('sessão mudou');expect(from).not.toHaveBeenCalled();});
