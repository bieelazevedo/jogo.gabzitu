# Registo aberto e notificações administrativas

Estado: migração aplicada no Supabase e função notify-signup publicada. Registo sem convite verificado com transação revertida; nenhuma conta de teste ficou guardada. Envio ainda inativo: faltam credencial, remetente e agendamento.

1. Aplicar `supabase/migrations/20261027230232_open_registration_notifications.sql` no projeto `ubijdcdrfwyebwtfoeyv`. Mantém os privilégios de administrador existentes e a proteção RLS; retira apenas a exigência de convite para novas contas com email e declaração de maioridade.
2. Publicar `notify-signup`. Configurar, exclusivamente como segredos da Edge Function, `RESEND_API_KEY`, `SIGNUP_NOTIFY_FROM` (remetente autorizado pelo fornecedor) e `SIGNUP_NOTIFY_SECRET` (valor aleatório forte). Nenhum destes valores pode usar o prefixo `VITE_`.
3. Configurar uma chamada POST do servidor a `/functions/v1/notify-signup` a cada minuto, com `x-notify-secret`. Guardar o segredo no Vault do Supabase e lê-lo no agendamento com pg_cron/pg_net; não o colocar no repositório nem no navegador. O agendamento tem de ser criado e validado no projeto depois de os segredos existirem.
4. Publicar a interface simplificada de registo só depois da migração. As contas existentes continuam a entrar normalmente. A confirmação do email segue a configuração Auth já existente.
5. Testar um novo registo autorizado: conta criada, acesso ao progresso próprio, uma entrada na fila, receção em `azevedo-biel@live.com`, `sent_at` preenchido. Repetir a chamada não deve reenviar entradas já concluídas. Testar falha do fornecedor: permanece pendente para nova tentativa, sem impedir registos.

O aviso contém apenas nome indicado, email e data de registo. O utilizador deve ver essa informação na política de privacidade. Convidados não criam uma conta Supabase, não entram nesta fila e não guardam progresso, nem no dispositivo nem na nuvem. As preferências técnicas e os recursos offline podem continuar armazenados.

A fila fica num schema privado, sem acesso de `anon` ou `authenticated`. Apenas a Edge Function usa as duas RPCs restritas a `service_role`. As chamadas têm lease de dois minutos, tentativas limitadas e chave de idempotência no fornecedor. Após vinte falhas é necessária intervenção do responsável; não prometer entrega infalível de email.

Dependências externas pendentes: ligação ao Supabase, credencial de envio e remetente autorizado. Não foi criado serviço pago nem enviado email de teste.
