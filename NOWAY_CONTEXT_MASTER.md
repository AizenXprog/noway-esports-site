# NOWAY ESPORTS — CONTEXTO MESTRE

**Documento canônico de continuidade / Handoff técnico e de produto**
**Snapshot verificado:** 16/10/2026 (Brasil)
**Objetivo:** permitir que um novo chat, assistente, desenvolvedor ou agente continue o projeto SEM repetir erros, reinventar decisões, trocar o escopo ou confundir funcionalidades prontas com pendências.

> ESTE ARQUIVO NÃO É UMA ORDEM PARA PROGRAMAR. No pedido mais recente, o usuário interrompeu a expansão do GRI/Tracker e pediu para preservar o contexto. Só implementar uma etapa após novo pedido explícito.

---

## 0. LEIA PRIMEIRO: REGRAS QUE NUNCA DEVEM SER ESQUECIDAS

1. **Cumprir somente o que o usuário pediu.** Ele detesta adições não autorizadas e atualizações que alteram outra coisa. Se uma dimensão não está clara, perguntar UMA vez antes de modificar.
2. **Troca de foto é troca de arquivo, NÃO geração de imagem.** Usar EXATAMENTE a foto original anexada, sem IA, retoques, estilização, embelezamento, alteração de pose, roupa, luz ou enquadramento, salvo instrução explícita. Especialmente para Ace.
3. **Foto do elenco público ≠ avatar pessoal NOWAY ID.** Imagens do elenco são assets do GitHub apontados por site-data.js. Avatar pessoal fica associado à conta no Supabase. Editar um NÃO modifica o outro.
4. **Visual aprovado é vinculante.** Preto/grafite, amarelo elétrico, branco, estética esports premium, títulos fortes, cards bem feitos, boa hierarquia, animações suaves, responsividade, sem textos soltos, sem rolagem infinita e sem redesign não solicitado.
5. **Privacidade no banco, não só no frontend.** Recrutamento é conversa individual; dados e pareceres de candidato devem ter RLS/RPC apropriados. GRI não é administrador global.
6. **Nunca inventar estatísticas, resultados ou dados de Tracker.** Distinguir fonte externa de registro verificado da NOWAY; indicadores só com dados disponíveis.
7. **Não afirmar publicação sem prova.** Commit GitHub, deploy Vercel READY, configuração de RPC, teste JS e teste real de interface são evidências diferentes. Reportar cada uma separadamente.
8. **Não revelar informações pessoais dos candidatos, e-mails de testes, mensagens privadas, identificadores de usuários ou chaves em documentação pública.**
9. **Proceder uma etapa por vez.** Primeiro diagnosticar, depois alterar, testar e publicar. Não fazer mudanças paralelas fora da tarefa.
10. **O pedido mais recente foi SALVAR TODO O CONTEXTO.** O usuário disse antes "não começa com isso" em relação à implementação continuada do cargo GRI/Tracker. A continuidade de programação precisa de nova instrução.

## 1. RESUMO DE PRODUTO E IDENTIDADE

NOWAY Esports é uma organização brasileira de esports, centrada em Rainbow Six Siege, desenvolvida a partir da evolução do projeto MORI. Tem site institucional, elenco, equipe de gestão, comunidade Discord, recrutamento e ferramentas internas NOWAY ID. Objetivo: uma organização competitiva séria, com processos de seleção, treino, comunicação, registro de confrontos e desempenho.

**Identidade pública e pessoas mencionadas no projeto:**
- Niel / Nielss Uno: Founder / Owner; associado ao elenco como entry/roamer.
- Prado: Team Manager e jogador âncora/suporte.
- Jhonny: jogador 2-Entry/Lurker; existe link de Instagram.
- Imperador: jogador âncora/suporte.
- Ace: jogador Flex; biografia pública também menciona Player Scout.
- GRI: Gestor de Recrutamento e Indicação; função especial de triagem/revisão, não Founder/TM.

As vagas do elenco são móveis e a situação de cada jogador deve ser conferida em site-data.js, nunca presumida. Não listar vitórias, resultados ou torneios fictícios. Comunicação de recrutamento deve ser direta, concreta, profissional e exigente, podendo ser deliberadamente desafiadora quando solicitado.

## 2. LINKS E CONEXÕES PRINCIPAIS

| Item | Local |
| --- | --- |
| Site público | https://noway-esports-site.vercel.app/ |
| Elenco público | https://noway-esports-site.vercel.app/#team |
| NOWAY ID | https://noway-esports-site.vercel.app/painel.html |
| Recrutamento | https://noway-esports-site.vercel.app/recrutamento.html |
| Comunidade | https://noway-esports-site.vercel.app/comunidade.html |
| Tracker | https://noway-esports-site.vercel.app/tracker.html (redireciona para painel.html#tracker) |
| Discord da comunidade | https://discord.gg/USZvdCUAEb |
| GitHub | https://github.com/AizenXprog/noway-esports-site |
| Branch principal | main |
| Vercel projectId | prj_MgepPZqnlOprWtOagrgV0LS9U15t |
| Supabase projectId | vdipsufzlqmnprbjiojb |

**Status verificado ANTES deste commit documental, 16/10/2026:** o HEAD GitHub e o último deploy Vercel Production READY apontavam ambos para o SHA f76e66209a33cdb8b52ce5dd7f25d4464d9496f0. Revalidar após cada commit e publicação. Não confundir com SHAs de respostas anteriores que ficaram ultrapassados.

Tecnologia: site HTML/CSS/JavaScript estático; Supabase Auth + PostgreSQL + RLS + RPCs + Edge Functions; Vercel. Não presumir React, bundler ou pipeline de build.

## 3. MAPA DO REPOSITÓRIO

### Conteúdo público
- **index.html**: lobby, seções públicas, elenco, história, competições, mídia, gestão e atalhos.
- **site-data.js**: roster, biografias, imagens editoriais e conteúdo estático do time.
- **script.js**: rendering do elenco e modal de perfil, Twitch AO VIVO.
- **styles.css**: identidade visual base.
- **noway-clarity.css**: ajustes de hierarquia visual/navegação.
- **noway-home-access.css** + CSS crítico incorporado ao index.html: card Google login e navegação por cards na hero. Historicamente o CSS separado não carregou e tudo virou texto solto; conferir sincronização.
- **noway-home-access.js**: estado de sessão do card Google e link para painel.
- **noway-results.js / noway-results.css**: resultados públicos finalizados.
- **ace-celebration.js**: homenagem temporária à paternidade do Ace (foi pedida por uma semana; conferir expiração, não ressuscitar).
- **api/live.js**: integração de status de live Twitch.
- **mouse-interactions.js**: detalhes e animações.
- **assets/**: fotos oficiais, artes e logos.

### Páginas independentes
- **recrutamento.html / noway-recruitment.js / noway-recruitment.css**: inscrição e chat privado do candidato.
- **comunidade.html / noway-community.css**: página da comunidade Discord separada da home.
- **tracker.html**: somente redireciona para painel.html#tracker.

### NOWAY ID
- **painel.html**: autenticação e navegação da área interna.
- **noway-id.js**: login, identidade, mensagens, chat da equipe e avatares pessoais.
- **noway-console.js / noway-console.css**: hierarquia, dashboard, permissões, agenda, partidas, contas.
- **noway-console-clarity.css**: cards da navegação, notificações, chat expandido e área com rolagem própria.
- **noway-competitive.css**: recursos competitivos.
- **noway-panel-tracker.js / noway-panel-tracker.css**: Tracker integrado à conta.
- **noway-recruitment-desk.js / noway-recruitment-desk.css**: caixa de entrada e pareceres internos da seleção.

### Documentação e infraestrutura
- **README.md** é antigo; não supor que descreve toda a arquitetura.
- **NOWAY_ID_SETUP.md** traz configuração histórica do login Google/e-mail; parte da documentação inicial está desatualizada.
- **supabase/migrations/** contém migração inicial versionada, porém várias migrações posteriores foram aplicadas diretamente no Supabase: o banco atual é a fonte para esquema/permissões.
- **vercel.json** controla configuração estática e headers.

## 4. LINGUAGEM VISUAL E UX APROVADAS

**Home pública:** foco na NOWAY e no time, sem seções gigantes de login ou Discord. Primeira tela com hero, marca, chamada ao elenco e card compacto NOWAY ID. Abaixo da fita animada: QUATRO CARDS separados do marquee com espaçamento perceptível e estilo do elenco — Elenco, Recrutamento, Discord, NOWAY ID. Não reconstruir segunda barra de links espremidos abaixo da fita.

**Estado de autenticação na home:**
- Desconectado: G preto, clean, texto **LOGIN E REGISTRO COM GOOGLE**, link alternativo por e-mail.
- Já conectado: **ABRIR MEU PAINEL**, sem G, sem link de login por e-mail e com texto reconhecendo sessão atual.
- Login é necessário para funções privadas; browsing público e Discord da comunidade não exigem NOWAY ID.
- Login usa Supabase; não tratar condição visual como autorização efetiva.

**Painel:** abas em grupos Principal, Equipe, Competitivo, Atendimento; superfícies claramente clicáveis; pequeno alerta amarelo de novidade não vista com pulsação lenta. Aviso só para mudança verdadeira, não falso positivo.

**Chat interno:** avatares, anexos de imagens, resposta citada, link a evento de agenda, notificação visual/som opcionais, botão para ir ao fim (contador se houver novas), rolagem independente, campo de mensagem no lugar. O usuário rejeitou área de mensagens achatada. Existe botão EXPANDIR com fechamento por Esc; preservar altura útil. Não abrir abas infinitas ao voltar ao site.

**Brasões:** Founder com coroa SVG própria; TM com escudo SVG próprio; sem texto permanente do cargo, com tooltips como Niel - founder e Prado - Team Manager. Não substituir por emoji genérico.

**Minha Conta:** foto pessoal, nome, identidade e contatos. Distinta da foto de elenco. Comunicação e ações extras devem ser intuitivas, com menos texto.

**Ace:** no snapshot atual, o cadastro id ace em site-data.js aponta para **assets/ace-elenco-original.png**, a foto original escolhida pelo usuário. Não trocar por arquivo antigo assets/ace-elenco.webp, não gerar variante, não editar avatar pessoal da conta. Outras imagens atuais do elenco: assets/niel-2026.webp, assets/jhonny.webp, assets/prado.webp; confirmar quem possui arquivo antes de modificar.

## 5. RECRUTAMENTO — REGRAS E FUNCIONALIDADES

Área independente com vagas para **jogador, coach, gerência, staff Discord, analista, designer/editor, criador de conteúdo e outros**. Formulário solicita nick/nome, **Discord preferencial**, contato alternativo, experiência, disponibilidade e apresentação; Ubisoft Connect e link Tracker opcionais para funções competitivas. Precisa de NOWAY ID, não basta mensagem em rede social/Discord.

Toda candidatura gera **conversa individual**, não um chat público. Somente o autor e os revisores de recrutamento autorizados podem ver/responder. Do banco:
- noway_recruitment_applications: ficha, autor, cargo desejado, status, motivo de encerramento etc.
- noway_recruitment_messages: mensagens privadas.
- noway_recruitment_reviews: **pareceres internos invisíveis ao candidato**.
- RPC noway_recruitment_get_messages: verifica acesso e retorna nome/avatar canônico de remetente.
- RPC noway_recruitment_reply: valida autor ou revisor e impede envio após encerramento.
- RPC noway_recruitment_set_status: mudança de estágio conforme cargo.
- RPC noway_recruitment_close: motivo obrigatório, registro de autor/hora, mensagem de encerramento e chat permanentemente em modo somente leitura.
- RPC noway_recruitment_add_review: parecer reservado a revisores.
- Backend usa RLS e SECURITY DEFINER com verificação de auth.uid e cargo.

Histórico de bug: apareceu mensagem de teste "daora" identificada como "Membro" numa conversa individual. Investigação anterior verificou identidade ligada ao próprio candidato; não assumir acesso indevido de uma terceira pessoa. A mensagem foi removida e o fluxo passou a recuperar nome/avatar canônicos. Não publicar mensagem, nome ou contato do candidato em logs/documentos públicos.

**Gestão do recrutamento:** no NOWAY ID existe aba ATENDIMENTO → RECRUTAMENTO com lista, filtros, chat, estágios, fechamento e pareceres. A experiência do candidato continua separada. Não misturar chat de recrutamento com chat geral da equipe.

## 6. CARGOS, ESCOPO DE ACESSO E GRI

Enum PostgreSQL public.noway_role verificado em 16/10/2026:
**membro, jogador, manager, owner, gri**.

- owner = Founder, autoridade de contas e decisões finais.
- manager = Team Manager, gestão de equipe e seleção conforme RPCs.
- jogador = papel competitivo, sem poderes administrativos.
- membro = conta regular, sem acesso a outros candidatos.
- **gri = Gestor de Recrutamento e Indicação**, criado por solicitação explícita para **ajudar a analisar candidatos, SOMENTE no recrutamento**.

Direção implementada no código e banco:
- GRI pode acessar candidatura, conversar com candidato, registrar pareceres privados e indicar análise/testes.
- GRI NÃO é Founder/TM, não possui automaticamente admin de contas, chat geral, edição competitiva nem controle total da organização.
- No fluxo atual, somente Founder/TM devem efetivar aprovação/recusa final, arquivamento e encerramento do processo. O GRI se restringe a em análise/testes.
- Backend criou/usa **noway_can_review_recruitment()** separado de noway_can_manage_team().
- Código do painel reconhece GRI em **noway-console.js**, **noway-recruitment-desk.js** e **noway-recruitment.js**.
- A atribuição de papéis deve ser restrita ao Founder por RPC noway_set_member_role. UI deve refletir a opção GRI e respeitar limites.
- Não confiar no botão visível/oculto como proteção: testar RLS e RPCs com usuário autorizado e não autorizado.
- Verificação de 16/10: noway_can_review_recruitment e noway_recruitment_add_review estão presentes; permissão de anon para executar add_review é negada.

**Atenção:** o usuário interrompeu implementação continuada de GRI/Tracker com a frase "não começa com isso", antes de pedir documento de contexto. Este documento é um handoff, não autorização para continuar programando. Caso o usuário queira retomar, perguntar especificamente qual etapa GRI/Tracker priorizar, em vez de agir unilateralmente.

## 7. COMPETITIVO E NOWAY PLAYER STATS

O usuário pediu registrar confrontos oficiais e exibir **Últimos Confrontos** no site público. Dados coletivos e métricas individuais vêm das tabelas de eventos, confrontos, mapas, escalações e estatísticas.

Tabelas verificadas:
- noway_team_events
- noway_competitive_matches
- noway_competitive_maps
- noway_competitive_roster
- noway_player_match_stats

Métricas/ideias: kills, deaths, assists, K/D, KPR, KOST, sobrevivência, first kills/deaths, evolução por confronto e temporada. Gestão pode lançar/corrigir valores de partidas oficiais pelo fluxo autorizado; visitante só pode consultar resultado coletivo publicado.

**Fato verificado em 16/10/2026:** tabela noway_player_match_stats tem **ZERO registros**. Não inventar performance, média, rank ou histórico. O banco contém função noway_save_player_match_stats. A interface pode existir com estado vazio.

## 8. NOWAY TRACKER — DOIS CONCEITOS QUE NÃO PODEM SER CONFUNDIDOS

**O usuário quer um tracker próprio da NOWAY para analisar jogadores/tryouts.** Atualmente há infraestrutura inicial, não um produto proprietário totalmente alimentado.

### 8.1 Tela e consulta EXTERNA hoje existentes
- Aba do NOWAY ID: Competitivo → MINHAS ESTATÍSTICAS; ID tracker.
- tracker.html apenas redireciona para painel.html#tracker.
- noway-panel-tracker.js apresenta vínculo do nickname e plataforma (PC Ubisoft / Playstation / Xbox) à conta autenticada, salva em noway_tracker_links.
- RPCs noway_tracker_link_account e noway_tracker_unlink_account presentes.
- Consulta de perfil externo pela Supabase Edge Function **noway-r6-tracker**, marcada ACTIVE no momento da verificação; requer autenticação JWT.
- Essa Edge Function chama provedor terceiro, domínio **public-api.arenyze.com**. Pode retornar erro 503 se a chave/configuração do provedor estiver ausente.
- O frontend mostra estatísticas retornadas por terceiro, potencialmente incompletas/desatualizadas.
- **Não declarar fonte oficialmente autorizada, dados sincronizados ou serviço funcional sem testar credencial, resposta, limites e termos do provedor.**
- A RPC hipotética noway_public_tracker_v1 NÃO foi encontrada no banco do snapshot.

### 8.2 Tracker PROPRIETÁRIO NOWAY pretendido
- Fonte: registros reais de partidas, mapas e rounds validados pela organização.
- Indicadores calculados de histórico interno, com proveniência e temporada.
- Futuros recursos possíveis SOMENTE após pedido: página individual, gráficos por temporada, comparação de desempenho, análise de candidatos/tryouts, relatórios e histórico por adversário.
- Separar precisamente "estatística externa consultada", "estatística registrada pela NOWAY" e "métrica derivada".
- Nenhuma importação por scraping não autorizado do Tracker Network.
- Não mostrar informação competitiva privada ao público sem aprovação expressa.
- Antes de nova implementação, definir com o usuário qual é **a primeira entrega** realmente desejada.

## 9. BANCO DE DADOS — INVENTÁRIO 16/10/2026

Tabelas observadas no schema public:
noway_competitive_maps; noway_competitive_matches; noway_competitive_roster; noway_contact_messages; noway_contacts; noway_player_match_stats; noway_profiles; noway_recruitment_applications; noway_recruitment_messages; noway_recruitment_reviews; noway_team_announcements; noway_team_events; noway_team_messages; noway_tracker_links.

RPCs observadas relevantes:
noway_can_review_recruitment; noway_recruitment_add_review; noway_recruitment_close; noway_public_recent_matches; noway_save_player_match_stats; noway_tracker_link_account; noway_tracker_unlink_account; além de funções de equipe e contatos existentes.

Fotografia pessoal: avatars com caminhos da storage Supabase, separados de assets/ editoriais do GitHub.

**Snapshot quantitativo INTERNO (não expor em tela pública):** 5 candidaturas, 26 mensagens de recrutamento, 0 linhas de estatísticas individuais. Contadores mutáveis; consultar de novo no próximo ciclo.

### Matriz mínima de autorização a confirmar com testes reais

| Recurso | Candidato | Founder | TM | GRI | Terceiro comum |
| --- | --- | --- | --- | --- | --- |
| Própria candidatura e chat | Sim | Sim | Sim | Sim | Não |
| Outra candidatura | Não | Sim | Sim | Sim | Não |
| Parecer interno de recrutamento | Não | Sim | Sim | Sim | Não |
| Recomendar testes / análise | Não | Sim | Sim | Sim | Não |
| Aprovar/recusar/encerrar administrativamente | Não, exceto fechamento da própria conversa se previsto | Sim | Sim | Não | Não |
| Gestão global de cargos | Não | Sim | Conforme controle específico | Não | Não |
| Recursos privados de competição | Conforme papel | Sim | Sim | Não apenas por ser GRI | Não |

**Observação:** o candidato possui ação de fechar sua própria conversa no código atual. Revalidar com banco e UX antes de alegar que só gestão pode fechar.

## 10. ERROS HISTÓRICOS QUE JÁ PREJUDICARAM A CONFIANÇA

- Assistente afirmou ter atualizado foto no GitHub sem efetuar upload/deploy; NÃO afirmar ação sem evidência.
- Assistente gerou uma imagem nova quando o usuário queria apenas usar a foto enviada; NUNCA repetir.
- Confusão entre foto editorial do elenco e foto pessoal NOWAY ID.
- Reestilização involuntária e estilos faltando na landing: cards viraram textos sem acabamento.
- Menu do painel anterior parecia palavras espalhadas; cards são preferíveis.
- Chat com área de histórico muito achatada; garantir espaço e botão de fim.
- Acesso ao login/Discord exigia rolar muito; separar páginas e criar CTA claro.
- Recrutamento misturado com atendimento genérico; hoje é área separada e privada.
- Abas infinitas por links que sempre abriam em outra guia; evitar.
- Papel de Founder/TM mostrado como texto comum; ícones SVG e tooltip discretos.
- Mensagem de teste "daora" identificada como "Membro" em candidatura; recuperar identidade canônica.
- Evento do Ace com fogos/confetes era TEMPORÁRIO (uma semana). Não reativar sem solicitação.
- Relatos de deploy bloqueado pelo limite de Vercel foram verdadeiros no passado, mas não supor que ainda existe bloqueio: **último deploy consultado estava READY**.

## 11. ESTADO REAL CONFIRMADO, INFERIDO E A TESTAR

**Confirmado por ferramenta em 16/10/2026:**
- GitHub main no SHA f76e66209a33cdb8b52ce5dd7f25d4464d9496f0 antes da inclusão deste documento.
- Vercel com deployment Production READY do mesmo SHA.
- Arquivos principais do site, painel, Tracker, recrutamento e assets existem.
- Cargo gri existe no enum.
- Funções de revisão privada presentes, com EXECUTE anônimo negado para add_review.
- Edge Function noway-r6-tracker está ACTIVE, provedor Arenyze.
- 0 registros em noway_player_match_stats.
- A imagem pública atual do Ace é assets/ace-elenco-original.png referenciada em site-data.js.

**Não confirmado por testes ponta a ponta nesta tarefa documental:**
- Login Google/e-mail entre contas diferentes.
- Atribuição GRI por Founder e negação efetiva de todo recurso não permitido.
- Leitura/escrita de chats com candidato, Founder, TM, GRI e terceiro sem permissão.
- Criar parecer, indicar teste, encerrar com motivo e refletir encerramento na outra conta.
- Consulta externa R6 com perfil real e chave de provedor configurada/legalidade confirmada.
- Visuais desktop/mobile em navegadores reais; arquivo PNG do Ace efetivamente renderizado em todas as páginas/caches.

**Conclusão:** a existência de código, deploy READY e banco configurado NÃO comprova esses fluxos reais. Não dizer "100% testado".

## 12. CHECKLIST DE RETOMADA EM OUTRA CONVERSA

1. Ler ESTE documento inteiro.
2. Ler o pedido mais recente e obedecer ao escopo.
3. Conferir HEAD GitHub e deploy Vercel, verificar se há commits pendentes.
4. Conferir a estrutura de tabelas, enum, funções e RLS se a tarefa for de backend.
5. Se for foto, encontrar a imagem ORIGINAL exata; alterar somente site-data.js / asset correspondente do elenco, NUNCA avatar NOWAY ID, e confirmar exibição.
6. Se for GRI, testar cargo por conta real, separação de privilégios, revisões privadas e restrições de decisão final.
7. Se for Tracker, distinguir estatística externa de Tracker próprio, checar fonte autorizada e dados reais antes de falar em automação.
8. Rodar validação JS/HTML, conferir assets e IDs, fazer teste funcional por papéis e verificar UX mobile.
9. Publicar apenas se autorizado e confirmar Vercel READY e a URL de produção.
10. Atualizar este documento após mudanças materiais com data, SHA, recursos testados, pendências e decisão do usuário.

## 13. MENSAGEM PARA NOVA CONVERSA — COPIAR E COLAR

Estou continuando o projeto NOWAY Esports. Antes de qualquer alteração, leia NOWAY_CONTEXT_MASTER.md na raiz do repositório GitHub AizenXprog/noway-esports-site (branch main). Confira estado atual do GitHub, Supabase e Vercel. Preserve o visual profissional preto/amarelo aprovado. Fotos do elenco público não são avatares NOWAY ID: não gere nem recrie fotos. Respeite privacidade do recrutamento, cargo GRI restrito e distinção entre Tracker externo e estatísticas próprias. O último pedido foi documentar o contexto e interromper implementação automática. Aguarde minha tarefa específica e execute uma etapa por vez, sem inventar dados ou declarar publicação sem verificar.

---

## 14. MANUTENÇÃO DO CONTEXTO

**Documento canônico:** NOWAY_CONTEXT_MASTER.md, na raiz do repositório.  
**Hierarquia de verdade:** último pedido explícito do usuário > estado atual verificado nos sistemas > este snapshot > histórico antigo.  
**Ao concluir uma alteração futura:** registrar novo SHA, mudança de banco, datas, quem pode acessar, o que foi verificado em produção e qualquer bug pendente. Nunca apagar história sem marcar decisão revogada.  
**Não conter segredos nem dados de candidatos.**  
**Nenhum documento garante perda zero de contexto em todas as condições:** manter GitHub + cópia local e reler no próximo chat reduz substancialmente o risco.

Este arquivo é APENAS documentação. Não constitui autorização de desenvolvimento adicional.

## Estrutura II — Central de Equipe / 16-10-2026

- Pedido do usuário: "membros registrados" = jogadores da organização; administradores Founder e Team Manager são **sempre jogadores** e entram no elenco competitivo. O cargo GRI continua exclusivo do recrutamento, não concede acesso ao hub da equipe. Contas genéricas membro não são promovidas automaticamente.
- Exibir primeiro o elenco, seguido do chat existente. Cards com rank e emblema (se a API fornecer), K/D, win rate e taxa de HS, todos com fallback "—" sem números inventados.
- Expandir jogador: rank e RP, indicadores adicionais, gráfico e tabela de histórico de RP disponibilizado pela Arenyze, mais partidas oficiais finalizadas e confirmadas via noway_team_player_history_v1.
- Limite do provedor: /r6/api/v2/profile expõe estatísticas e evolução de RP, não um feed completo de todas as partidas individuais R6. Não confundir histórico de RP com histórico de partidas.
- Arquivos: painel.html, noway-equipe.js, noway-equipe.css e este registro. Nenhuma foto, cargo, regra do banco ou frontend de outra seção alterados.
- Testes pendentes: contas autenticadas reais, dados reais Arenyze, responsividade no navegador e confirmação de deploy READY.

## Correção Arenyze V2: rank, imagem, win rate e HS — 16/10/2026

- Identificou-se estrutura real documentada do provedor: `history.data.history.data[][1].metadata.rank` e `imageUrl`; rank também pode estar em `segments[].stats.rankPoints.metadata`. Os segmentos atuais têm `type=season` e `attributes.gamemode=pvp_ranked`. Dados numéricos da temporada: `platform_families_full_profiles[].board_ids_full_profiles[].full_profiles[].profile` e `season_statistics.match_outcomes`.
- `noway-r6-model.js`: lê tais estruturas, temporadas, `kdRatio`, rank e imagem, sem estimar quando ausentes. Win rate usa vitórias e derrotas da mesma fonte; HS calculado por soma de headshots/soma de kills se o conjunto de operadores tiver dados completos.
- `api/noway-r6.js`: consulta adicional paralela `GET /r6/api/v2/operators?modes=ranked`, preservando o perfil mesmo se a consulta de operadores falhar; cache existente e credencial segura mantidos.
- `noway-equipe.js`: renderiza imagem de rank fornecida pela Arenyze (domínio e caminho validados), fallback para pacote comunitário. Sem mudanças no banco, cargos, recrutamento ou fotos.
- Ainda deve ser validado com sessão autenticada e conta real; status READY do deploy, isoladamente, não prova disponibilidade de estatísticas.
