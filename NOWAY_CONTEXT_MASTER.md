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

## Correção Estrutura II — Cargo GRI também é jogador (16/10/2026)

- Pedido explícito do usuário: **Founder, Team Manager e GRI são sempre jogadores da NOWAY**. O filtro visual da Central de Equipe deve incluir `owner`, `manager`, `gri` e `jogador`, sem confundir cargo de administração com exclusão do elenco.
- O backend `noway_team_hub_v1` já retorna o GRI; a ausência dele era um filtro incorreto em `noway-equipe.js`. Corrigidos `rosterRoles`, `roleLabel` e descrição do contador. O GRI aparece no elenco, mesmo sem vincular R6; indicadores sem fonte continuam `—`.
- A correção **não altera permissões**: GRI continua podendo usar o recrutamento e não ganha acesso à Central, ao chat ou aos módulos competitivos pelo simples fato de aparecer no elenco. Essa distinção só poderá mudar com instrução separada.

## Tendência de estatísticas por atualização (16/10/2026)
- Cartões e perfil expandido exibem pequenas setas verdes para métricas que aumentaram e vermelhas para as que caíram, com "antes" e o valor antigo em tamanho menor. No rank, exibir RANK ANTERIOR quando mudou de classificação, e RP ANTERIOR se mudou o RP sem mudança do rank.
- O comparativo armazena última leitura real e última diferença no `localStorage` da conta NOWAY ID e jogador/plataforma/nick. Primeira consulta cria referência sem seta; valores repetidos por cache não geram variação inventada. A última variação persiste entre recargas até nova mudança.
- Não é um histórico sincronizado entre navegadores ou dispositivos e não modifica os resultados oficiais no Supabase. Falha da API mantém visualmente a última leitura, sem registrá-la como novidade. Atualização manual simultânea é colocada em fila.
- Arquivos: noway-equipe.js e noway-equipe.css; este documento. Nenhuma alteração em cargos, permissões, fotos ou banco.

## Marcação de estatística do R6 no chat — 16/10/2026

- Usuário pode clicar MARCAR ESTATÍSTICA dentro do chat privado, escolher jogador e indicador R6 disponível; ou abrir perfil individual e clicar MARCAR NO CHAT junto de uma métrica.
- O seletor usa a última resposta real da Arenyze armazenada na Central. Insere no campo de comentário a citação textual `▣ NOWAY TRACKER · JOGADOR · INDICADOR: VALOR` com linha separada para escrever normalmente. Após envio pelo RPC já existente `noway_send_team_message_v2`, o chat reconhece a citação e a renderiza em card, preservando o comentário, replies, imagens e eventos. Citado = snapshot compartilhado pelo usuário, não dado atualizado automaticamente; qualquer mensagem escrita manualmente pode conter texto semelhante.
- Frontend só apresenta botão quando existe valor real para o indicador. Não altera backend/RLS/permissões. GRI continua listado no elenco, sem mudar acesso ao chat.
- Na visão coletiva das estatísticas, *somente* o tamanho da fonte dos números foi reduzido para impedir quebra de porcentagens; outros elementos dos cards permaneceram intactos.
- Arquivos modificados: `painel.html`, `noway-equipe.js`, `noway-equipe.css`, `noway-id.js`, e este contexto. Testes de sintaxe/seleção e deploy de produção precisam de confirmação real.

## Central de Desafios para organizações externas — 16/10/2026

- Nova página `desafios.html` (com `noway-desafios.js/css`) registra representantes de organizações externas por NOWAY ID e permite enviar pedidos de scrim ou disputa R6 (BO1/3/5, data e duração, observações). Um NOWAY ID representa uma organização. A gestão precisa aprovar o cadastro antes de liberar desafios. O representante pode atualizar contato e apresentação.
- Painel `#desafios` em `painel.html` com `noway-desafios-admin.js/css` apenas para Founder e Team Manager; aprovar/suspender cadastros, aceitar ou recusar com justificativa, ou enviar contraproposta de horário. Link `DESAFIOS` na navegação pública sem mexer nos cards da Home. Cargo GRI permanece jogador no elenco, mas não ganha poderes de agendamento/gestão por esse cadastro.
- Novas tabelas Supabase `public.noway_guest_teams` e `public.noway_scrim_requests`, ambas com RLS de leitura (capitão próprio ou gestão), SELECT autenticado e sem inserts/updates diretos pelo cliente. 6 RPCs SECURITY DEFINER com `search_path=''`, checks de auth.uid, papel e estado: `noway_guest_register`, `noway_guest_update_contact`, `noway_guest_request`, `noway_guest_team_decide`, `noway_guest_staff_decide` e `noway_guest_request_reply`. A role anon não tem EXECUTE. Requests pendentes sem convite livre ao chat interno.
- Status de equipes `pending/approved/suspended`; pedidos `pending/counter/confirmed/declined/cancelled`. Confirmação administrativa ou aceitação da contraproposta confirmada cria o evento em `noway_team_events` como `treino` (scrim) ou `partida` (disputa), com status confirmado. Existe verificação transacional de conflitos com eventos confirmados e limite de 5 solicitações/dia por organização. Horários exibidos em Brasília e capturados no fuso local do visitante.
- Limitações: aprovação significa apenas validação de cadastro pela NOWAY, sem verificação de propriedade de marca ou integração de Discord. Não há chat de negociação em tempo real; as mensagens de resposta e contrapropostas aparecem no portal. Apenas o capitão controla sua organização. Não gerar jogos/resultados falsos; partida só aparece após confirmação.
- Validações efetuadas: sintaxe dos JS, RLS ativo nas duas tabelas, permissões de RPC por role (auth sim, anon não). Testes reais autenticados (outros times/founder) e navegadores ainda pendentes.
- **Publicação:** o commit da página visitante `9b3e01a` teve deploy Production READY; commits posteriores do painel/entrada pública enfrentaram status Vercel `Deployment rate limited — retry in 24 hours` (16/10/2026). Não afirmar que a integração final já está publicada sem verificar o SHA READY da produção.

### Verificação complementar — ciclo de vida da Agenda (16/10/2026)

- Função privada `noway_guest_event_lifecycle()` e dois gatilhos em `noway_team_events`: `nw_guest_sync_event_cancel` (AFTER UPDATE OF status) e `nw_guest_sync_event_delete` (BEFORE DELETE). Ambos verificados presentes/ativos no banco.
- Quando um confronto originado na Central de Desafios é cancelado ou excluído da Agenda pela gestão, a solicitação externa correspondente passa a `cancelled` sem violar a integridade da FK `event_id`. A função de gatilho não pode ser executada diretamente por `authenticated`/anon; somente triggers.
- Último código GitHub deste bloco antes desta nota: `bc1e257c42fcf173dbb211d315053b78e96e4cf9`. Status GitHub/Vercel explicitamente `failure: Deployment rate limited — retry in 24 hours`; produção READY mais recente recuperada anteriormente `9b3e01aae95fc9c1f78a559b1755b30319da38c0`. Revalidar antes de dizer que o pacote inteiro está no ar.
- QA pendente: sessão real de representante externo (registro, aprovação, solicitação, contraproposta e aceite), Founder/TM, verificação de conflito e responsividade. Testes estáticos JS passam, consultas de metadados RLS e grants confirmadas. Não criar registros fictícios no banco de produção para testar.


## Resultados públicos seletivos e Tracker somente interno — 16/10/2026
- O editor Competitivo do NOWAY ID recebeu controles PUBLICAR EM ÚLTIMOS CONFRONTOS e DESTAQUE PRINCIPAL, ambos desligados por padrão. Founder e Team Manager validam a divulgação depois de registrar placar real.
- Supabase: noway_competitive_matches recebeu publish_public e featured boolean not null default false, e restrição featured implies publish_public. Novo RPC noway_competitive_save_v2 chama o RPC original e persiste a publicação numa transação segura; bloqueia resultados incompletos, eventos futuros, treinos internos e scrims externas não confirmadas.
- noway_public_recent_matches agora aceita scrims externas confirmadas e partidas/disputas finalizadas somente quando publish_public é true, ordena destaques primeiro, retorna match_type e featured, sem expor notas internas.
- Home: reutiliza Últimos Confrontos. Marcador de DESTAQUE e tipo SCRIM / DISPUTA / PARTIDA, com atualizações periódicas enquanto aberta e atualização a cada visita.
- Privacy: Tracker privado preservado no NOWAY ID e removidos TODOS os links para tracker.html da Home pública (desktop, mobile, rodapé e CTA abaixo do histórico). A rota tracker.html não foi apagada.
- Ajuste de escalação: GRI incluído no editor competitivo como jogador, sem aumentar permissões.
- Testes JS sintáticos e HTML de novos controles; SQL de RLS/grants e consulta pública vazio validados. Não houve testes end-to-end com usuários reais. Revalidar publicação Vercel após rate limit.


## YouTube AO VIVO no Elenco — 17/10/2026
- Youtube do Prado já constava em `site-data.js` (`https://www.youtube.com/@uprde`); etiqueta ampliada para `YouTube · @uprde` no modal do Elenco. Não alterada foto ou demais redes do atleta.
- Nova rota backend `api/youtube-live.js` somente GET, com validação de @handles, cache e resposta `configured/streams`. Sem `YOUTUBE_API_KEY`, realiza checagem conservadora da página pública do canal `/live`: só considera ao vivo quando `ytInitialPlayerResponse.microformat.playerMicroformatRenderer.liveBroadcastDetails.isLiveNow===true` e ID de vídeo válido. Falhas de consulta/bloqueio não geram falsos selos. Com YOUTUBE_API_KEY, usa canais e buscas ao vivo da API oficial com TTL maior por restrições de quota (e fallback público em erros de API). Nenhum segredo incluído no frontend.
- Novo `noway-youtube-live.js` amplia o Elenco com badge `AO VIVO · YOUTUBE` e preview no perfil expandido do jogador, utilizando `youtube-nocookie.com` somente após clique, com áudio mudo por padrão; se o vídeo não tiver ID válido, link seguro do canal. Atua sem sobrescrever a Twitch.
- `script.js`: Twitch deixou de remover badges/prévias específicas do YouTube, e atualiza a posição visual dos badges quando muda o estado da Twitch. `styles.css`: CSS restrito ao selo do YouTube. `index.html`: carrega o novo arquivo e usa versão nova de cache em `script.js`/`site-data.js`.
- Teste sintático JS, teste simulado do endpoint (live, offline, handle malicioso) e revisão de injeções de HTML. Verificação com live real do YouTube não realizada por indisponibilidade da plataforma neste ambiente; método de página pública é best-effort, podendo exigir configurar API oficial se houver bloqueio. Não declarar status real do Prado sem confirmação.

## Correção NOWAY ID — Promoção de Jogador e permissões (17/10/2026)
- Sintoma relatado: ao atribuir Jogador em Contas e Permissões, as pessoas não recebiam o cargo.
- Causa raiz **confirmada na RPC** `noway_set_member_role`: promoção `jogador` lançava erro quando não existia linha prévia em `noway_tracker_links`. Contas genéricas ainda não vinculadas não podiam ser promovidas, apesar de o Founder ter autoridade de atribuição.
- Supabase: migração `decouple_player_role_assignment_from_tracker_link_20261017` já aplicada. A RPC agora permite atribuição de `membro`, `jogador`, `manager` e `gri` pelo Founder independente do vínculo prévio. Preservados checagem de `auth.uid()`, permissão somente Founder, proteção do próprio cargo do Founder e restrição de EXECUTE para `authenticated` (anon negado). Nenhuma conta existente foi promovida manualmente.
- O vínculo de R6 Tracker continua como requisito operacional para exibir estatísticas, mas passa a ser uma tarefa posterior em Minha Conta; não bloqueia a escolha de cargo. `noway_tracker_link_account` permanece inalterada.
- Dois formulários de atribuição (`noway-console.js`, `noway-id.js`) agora consultam o papel persistido em `noway_profiles` após a chamada RPC; não exibem sucesso se não confirmarem a gravação. `noway-id.js` verifica o cargo ao retomar a aba e periodicamente; `noway-console.js` reage ao evento de atualização, reconfigurando os acessos no painel sem exigir novo login. `painel.html` documenta o fluxo e evita cache de scripts anteriores.
- Teste SQL dentro de uma transação revertida: Founder promove membro sem Tracker; não-Owner é impedido de promover; tentativa de alterar Founder é recusada; `ROLLBACK` sem persistir a promoção de teste. Testes reais de várias contas conectadas e UI interativa ainda pendentes.

## Correção de detecção YouTube ao vivo — 17/10/2026
- Prado relatado em live real na conta @uprde sem aparecer como AO VIVO no site. A detecção anterior dependia exclusivamente de um único `ytInitialPlayerResponse` em `/@handle/live` com `liveBroadcastDetails.isLiveNow=true`. Como o YouTube pode mostrar a aba do canal em vez do player, essa verificação deixava escapar transmissões.
- `api/youtube-live.js`: agora consulta a página /live e a aba /streams independentemente. Aceita `videoDetails.isLive=true` ou `liveBroadcastDetails.isLiveNow=true` no player, ou marcadores oficiais `BADGE_STYLE_TYPE_LIVE_NOW` / `thumbnailOverlayTimeStatusRenderer.style=LIVE` nos dados da aba, sempre exigindo ID válido. Rejeita eventos agendados/encerrados. As verificações em APIs públicas são best-effort, pois não há `YOUTUBE_API_KEY` configurada; para solução de maior estabilidade, disponibilizar a credencial de API somente no ambiente da Vercel.
- `noway-youtube-live.js`: quando o estado está desconhecido ou a consulta falha, o card do jogador com YouTube mostra link neutro **YOUTUBE ↗** para `/@handle/live` — não um falso selo AO VIVO. A live confirmada continua com o marcador vermelho e player no modal. Refresh a cada 60s; controles de clique sem abrir modal acidentalmente.
- Teste simulado de seis cenários do detector (player live/off, badge live/off, erro HTTP, handle inválido); testes de integração com a transmissão real não puderam ser completados por restrição de logs Vercel e acesso HTTP externo. Não afirmar confirmação de status real do Prado. Código, deploy e confirmação de live são verificações separadas.

## UI de lives unificada nos cards do Elenco — 17/10/2026
- Pedido do Founder: não usar sobreposição com link de YouTube ou botões offline; somente destacar AO VIVO quando realmente houver live na Twitch e/ou YouTube, para qualquer jogador com redes sociais cadastradas.
- Em `noway-roster-live.js`, um banner vermelho premium, com círculo sutilmente pulsante, título amplo `AO VIVO`, subtítulo `TRANSMITINDO AGORA` e selo da(s) plataforma(s), é inserido entre foto e informações do atleta **somente** quando o backend devolve live válida. O card recebe borda/glow discretos. Se nenhuma live for confirmada, nenhum banner/link/selo aparece. O clique existente do card abre o perfil com prévia. As duas plataformas juntas compartilham o mesmo banner.
- `script.js` e `noway-youtube-live.js` expõem estado de live confirmado por jogador ao componente, em vez de injetar selos separados sobre a foto. Removido completamente o link `YOUTUBE ↗` criado quando não havia confirmação. Em falha de consulta o frontend limpa o estado para não exibir um falso AO VIVO. Componente novo só usa redes sociais válidas presentes no elenco, sem hardcode de Prado ou Niel.
- `noway-live-banner.css` mantém styling isolado e compatível com responsive + prefers-reduced-motion. `index.html` carrega os novos scripts e CSS com cache-busting.
- O funcionamento do player/previews no modal e os arquivos de fotos editoriais não foram alterados. Status READY da Vercel e teste com live real devem ser verificados separadamente; ausência de `YOUTUBE_API_KEY` e, possivelmente, de credenciais Twitch na Vercel continua sendo possível limitação da detecção.


## Diagnóstico público controlado de detecção YouTube — 17/10/2026
- Investigação pós-publicação do banner: o usuário informou que a transmissão ativa do Prado continuava sem detecção. Inspeção da Vercel verificou ausência de `YOUTUBE_API_KEY` e de `TWITCH_CLIENT_ID` / `TWITCH_CLIENT_SECRET`. O caminho por HTML público do YouTube não é garantia de disponibilidade; o banner só deve aparecer quando uma consulta confirmar live.
- `api/youtube-live.js` aceita `diagnostic=1` para devolver, além do contrato normal, `diagnostic.apiConfigured` e status por handle (`live`, `not_detected`, `unavailable`), sem mostrar nenhuma credencial ou conteúdo privado. `not_detected` não significa canal comprovadamente offline. HTTP 503 com `unavailable` sinaliza erro de consulta, em vez de falsa ausência de live. Resposta de diagnóstico com `Cache-Control: no-store`.
- A rota de API oficial, já existente, é acionada quando o usuário inserir uma chave válida de YouTube Data API v3 como env `YOUTUBE_API_KEY` no projeto Vercel e redistribuir a produção. A chave NÃO deve ser colocada no JavaScript público nem em mensagens/documentação.
- Testes locais simulados e deploy READY comprovam sintaxe e publicação, não disponibilidade da transmissão real. Não atribuir o status AO VIVO sem prova. Necessária chave oficial configurada pelo proprietário para aumentar confiabilidade.


## Atualização operacional — Twitch Live API (17/10/2026)

- **Pedido autorizado:** conectar a detecção de lives públicas Twitch ao elenco NOWAY. O aplicativo Twitch **NOWAY Esports Live API** foi criado pelo Founder como cliente **Confidencial**, categoria Website Integration.
- **Configuração de produção:** `TWITCH_CLIENT_ID` atualizado para o novo aplicativo; `TWITCH_CLIENT_SECRET` cadastrado como variável criptografada somente na Vercel, sem expor valores no repositório. `YOUTUBE_API_KEY` permanece cadastrado.
- **Backend existente:** `api/live.js` usa Client Credentials Grant e a API Helix `streams`, já estava implementado; nenhuma alteração de código ou visual nesta etapa.
- **Publicação verificada:** deployment Production **READY** `dpl_DisGXrGqAtnHyDf4upkQRJcdTgyd` no commit `dd218f2e41e13f3a83f675c1070965f2b2dfe722`, anterior à inclusão desta nota documental.
- **Limite de validação:** Vercel confirmou presença das duas variáveis e o deploy READY, mas teste HTTP de ponta a ponta de `/api/live` e confirmação de banner com live real não foram possíveis neste ambiente. Não declarar live detectada sem resposta real.
- **Segurança:** o Client Secret apareceu em captura na conversa; recomenda-se substituí-lo por novo segredo no Twitch Developers, atualizar **somente** `TWITCH_CLIENT_SECRET` na Vercel e fazer novo deploy. Não publicar o segredo nem registrá-lo na documentação.

## Últimos postados e Comunidade + Recrutamento — 19/10/2026

- Escopo autorizado: acrescentar área pública 'ÚLTIMOS POSTADOS', com vídeos recentes de quem pertence ao elenco; unificar em uma mesma aba/entrada pública o Discord da comunidade e a área de recrutamento.
- Backend 'api/latest-posts.js': lê os links YouTube/Twitch em 'site-data.js' através de export CommonJS que preserva 'window.NOWAY_DATA' no browser. Não cadastra vídeos imaginários nem aceita handles arbitrários da internet. Busca YouTube por 'channels.list' + 'playlistItems.list' + 'videos.list' (consultas baratas por canal, sem 'search.list'), filtrando vídeos públicos e não ao vivo. Busca vídeos publicados e gravações da Twitch por App Token e Helix, e exibe até nove itens por data, com cache CDN de 30 minutos. Variáveis de ambiente já estavam configuradas; nenhum segredo foi incluído no código.
- Frontend: 'index.html', 'noway-latest-posts.js' e 'noway-latest-posts.css'; cards com thumbnail, título, canal, plataforma, data e abertura no site original. Estados de erro/vazio, tentativa novamente. Área 'MÍDIA' e demais seções preservadas.
- Navegação: tanto na barra superior quanto no menu mobile, Comunidade/Recrutamento vira uma única entrada. Os quatro cards de descoberta ficam: Elenco, Comunidade + Recrutamento, Últimos Postados, NOWAY ID. 'comunidade.html' virou a entrada única com opção de Discord e opção de recrutamento; a inscrição segue na página 'recrutamento.html' e chats privados não foram alterados.
- Validação pós-publicação: syntax check JS; cabe confirmar deploy Vercel READY e que vídeos atuais aparecem com dados reais do YouTube/Twitch em produção. READY e API real são evidências diferentes.

## Destaque semanal de vídeo no Elenco — 19/10/2026

- Pedido autorizado: destacar dentro de Últimos Postados o vídeo com mais visualizações entre os publicados pelo elenco nos últimos sete dias e marcar o respectivo card na grade, se estiver entre os mais recentes. Não altera outra funcionalidade.
- API 'api/latest-posts.js': YouTube 'videos.list' inclui statistics.viewCount e Twitch Helix usa video.view_count. Analisa até 50 vídeos recentes por canal. Ordena por visualizações acumuladas (desempate por publicação mais recente), valida publicação nos últimos 7 dias corridos e considera a coleção completa antes de limitar a grade a 9 itens. Se um canal configurado estiver indisponível, não declara vencedor global. Contagem é TOTAL de views do vídeo, não views GANHAS na semana (isso exigiria snapshots históricos).
- Frontend 'noway-latest-posts.js/css' + 'index.html': card grande acima da grade, thumbnail, plataforma, jogador, título, número de visualizações totais, CTA e selo; borda/selo também no card da lista correspondente; fallback limpo caso não haja vídeo elegível ou dados suficientes. Preservado cache de 30 minutos, redes originais, fotos e permissões.
- Validação: testes com mocks para ordenação, vídeo antigo, falta de métricas e erro de provedor, sintaxe JS, publicação Vercel READY; sem consulta de vídeo real, não anunciar valores atuais específicos.

## YouTube do Niel e atualização frequente dos destaques — 19/10/2026

- Pedido explícito: cadastrar o canal pessoal público https://www.youtube.com/@NIELYSES no perfil de Nielss Uno no elenco, e manter o feed Últimos Postados e o vídeo Mais Visto da Semana atualizados com frequência, sem solicitar lançamentos manuais.
- 'site-data.js': adicionado unicamente o novo link de YouTube a Niel, preservando biografia, imagem, Twitch e demais redes; fonte única alimenta modal, api/latest-posts.js e detecção de lives. Sem mudança de papéis, fotos, layout ou privacidade.
- 'api/latest-posts.js': backend consulta novas publicações e visualizações do YouTube/Twitch sob demanda; cache em memória e cabeçalhos CDN reduzidos de 30 para **5 minutos** em condições saudáveis (em falha parcial, **1 minuto**). Informa 'checkedAt' no retorno para exibir horário efetivo da consulta. Nenhum cron 24/7, nenhuma requisição externa sem tráfego; múltiplos visitantes compartilham CDN. Chaves privadas permanecem em variáveis Vercel.
- 'noway-latest-posts.js': atualização automática a cada 5 minutos enquanto a página estiver aberta e visível, e ao retornar/focar a aba quando o prazo vencer; o botão ATUALIZAR fica disponível. Reexibe horário da última consulta à API e mantém empate/regras do destaque (mais views totais entre uploads dos últimos 7 dias). Não altera demais componentes.
- Observação: com 2 canais de YouTube cadastrados, a detecção de **AO VIVO** usa um mecanismo separado e mais custoso ('search.list', 100 unidades por chamada por canal). A cota do Google pode limitar o status de lives; este pedido NÃO modifica essa integração, apenas o feed de vídeos. Frequência exata e visualizações dependem da API, cache CDN e atividade dos visitantes, não são garantidas minuto a minuto. Validar deploy READY; testes com credenciais reais continuam separados.

## Ajuste de proporções visuais no site — 19/10/2026

- Pedido explícito do Founder: diminuir escalas muito grandes das páginas, **de forma bonita**, preservando a identidade visual premium NOWAY preto/grafite/amarelo; não usar zoom global artificial nem mudar conteúdo/dados.
- Novo stylesheet `noway-visual-balance.css`, carregado como último CSS no `<head>` de `index.html`, `comunidade.html`, `recrutamento.html`, `desafios.html` e `painel.html`. Ajusta a proporção tipográfica, altura do hero, espaçamentos verticais, cards de descoberta e elenco, manifesto, vídeos/mais visto da semana, mídia, gestão, rodapé, páginas públicas e cabeçalho editorial do NOWAY ID. Mantém grades responsivas em desktop/tablet/mobile e resguarda todos os componentes funcionais internos do painel.
- Dados, fotos, papéis, chats privados, APIs e regras de recrutamento não foram modificados nesta etapa. Não declarar QA visual com navegador sem validação visual efetiva.
- Commit funcional esperado `b3d444ba595617cab7d0f6cf7cbfdbe3f21cd24e` com novo CSS e inclusão nas cinco páginas; verificação de Vercel READY deve ser conferida após esta nota. A atualização anterior `aa263b079bc5d2a73e072c8bc5b5c0c374506c88` já havia incluído o YouTube @NIELYSES e ajuste de atualizações dos vídeos a cada 5 min enquanto visíveis.

## Correção solicitada — destaque permanente por audiência, 19/10/2026

- Founder corrigiu a regra: **o último vídeo do YouTube @NIELYSES (~1.200 visualizações, segundo o Founder) é o recordista inicial da organização**, e o destaque não deve vencer a cada sete dias. Deve permanecer enquanto liderar visualizações totais, até um conteúdo de outro membro ou do próprio canal ultrapassá-lo; empate não justifica mudar o líder. O ID/link específico desse vídeo ainda não foi fornecido e a plataforma pública não permitiu verificá-lo na ferramenta; não inventar o ID nem números.
- `api/latest-posts.js`: remove janela `WEEK_MS` e ranking semanal, ordena os conteúdos públicos conhecidos por `viewCount` real do YouTube/Twitch, com desempate preferencial pelo Niel (líder inicial informado) e depois pelo upload mais antigo. Carrega até 100 uploads por canal YouTube, via até 2 páginas de 50 e `videos.list` por lote de 50, além dos 100 VODs mais recentes da Twitch. Mantém CDN 5 min e não proclama vencedor se alguma integração necessária falhar.
- `noway-latest-posts.js/css` e `index.html`: renomeia o destaque para **DESTAQUE PRINCIPAL / MAIS VISTO DA NOWAY**, reforça hierarquia editorial, thumbnail, selo #1, número de visualizações, autoria e CTA, preservando o layout premium compacto. Grids de publicações continuam exibindo lançamentos recentes com selo no recordista quando estiver visível.
- Escopo de validação: teste de ranking com vídeo antigo mais visto e empate, atualização por quantidade, falha parcial, sintaxe JS, commit + Vercel READY. Canais com mais de 100 uploads não têm histórico exaustivo; fixação absoluta de um ID específico exige que o Founder forneça a URL do vídeo ou um armazenamento persistente oficial. Nunca inserir um vídeo fictício ou números estáticos como métrica real.


### Resiliência do destaque confirmado — 19/10/2026
- `noway-latest-posts.js`: grava só dados públicos do último líder autenticado por respostas completas das APIs no localStorage do navegador (videoId, autor, views da última leitura, thumbnail). Se consulta externa falhar ou ficar incompleta, mantém aquele destaque **naquele navegador**, sinalizado como 'ÚLTIMO LÍDER CONFIRMADO / ÚLTIMA LEITURA DISPONÍVEL', sem alegar que ainda é a contagem atual. Com consulta completa, vencedor oficial substitui cache. Não armazena segredo e não se proclama vencedor com dados incompletos. Navegadores novos sem leitura válida não têm esse fallback. O usuário deve fornecer o link exato do vídeo caso seja necessária garantia de pin por ID em todos os navegadores.

## Atualização do elenco público — 20/10/2026

- Pedido do Founder: substituir o Jhonny por **VAGA ABERTA** no elenco público, colocar **Ace na 3ª posição** e deslocar a vaga de Entry para a antiga 4ª posição do Ace, preservando a vaga Âncora/Suporte já existente em 5º.
- Ordem atual de `site-data.js.team`: **1 Nielss Uno, 2 Prado, 3 Ace, 4 Vaga Aberta — 2º Entry / Lurker, 5 Vaga Aberta — Âncora / Suporte**. Jhonny foi removido somente do elenco público; contas NOWAY ID, permissões, jogadores em bancos de dados e mensagens privadas **não** foram alterados. O arquivo da foto de Jhonny não foi apagado.
- `script.js`: modal e acessibilidade das vagas agora utilizam a função definida no próprio registro (`p.role`) em vez de fixar Âncora/Suporte; ambas levam ao recrutamento existente. Preservada sem alteração a foto original do Ace `assets/ace-elenco-original.png`, demais redes e biografias.
- `index.html`: URLs dos dois scripts com cache-busting para que a alteração apareça imediatamente após o deploy. Sintaxe JS e ordem de slots validadas no código; inspecionar publicação Vercel READY separadamente.

## Menções Honrosas — Jhonny pausado, 20/10/2026

- Pedido do Founder: adicionar uma nova seção **MENÇÕES HONROSAS** imediatamente abaixo do elenco competitivo da Home, reconhecendo **Jhonny como Jogador pausado, muito querido pela comunidade**. Jhonny não volta ao conjunto de jogadores ativos nem passa a ocupar vaga do elenco. A ordem atual dos 5 slots (Niel, Prado, Ace, vaga 2º Entry, vaga Âncora) permanece intacta.
- `site-data.js`: nova coleção editorial `honorableMentions` independente de `team`. Recuperado do registro anterior o nome, biografia, Instagram e **foto original `assets/jhonny.webp`**, sem gerar/retocar a imagem; status `Jogador pausado` e homenagem breve. Não altera nem consulta permissões/autenticação do NOWAY ID.
- `index.html` + `noway-honors.css`: faixa editorial responsiva sob o elenco, com foto, status, função antiga, texto de reconhecimento, CTA para o perfil, visual preto/grafite/amarelo sem títulos desproporcionais.
- `script.js`: leitura dinâmica de `honorableMentions`, renderização sem afetar os contadores de jogadores, modal reutilizado com status de homenagem, biografia e link original Instagram. Se coleção vazia, seção oculta. Aria-labels e mouse/teclado através de botões reais.
- QA técnico: validar os 5 slots ativos e 1 honra separados, foto original, sintaxe JS, inexistência de outros dados ou privilégios modificados, Vercel READY. Verificação visual real de navegadores ainda pendente.

## Limpeza de parâmetros externos dos links — 20/10/2026

- Pedido do Founder: impedir que o nome de ferramentas de assistência apareça em links do site ou na barra de endereço. Auditoria do código principal e busca no GitHub não identificaram qualquer referência à ferramenta mencionada nem parâmetros de campanha armazenados nos links existentes.
- Adicionado `noway-clean-url.js` às páginas públicas e NOWAY ID para remover da URL exibida parâmetros conhecidos `utm_source`, `utm_medium`, `utm_campaign`, `utm_term`, `utm_content` e `utm_id` que possam ser acrescentados por canais externos. Preserva query de autenticação, parâmetros funcionais, caminhos e âncoras. Código não contém nomes de fornecedores de assistência.
- A limpeza ocorre ao carregar uma página do próprio domínio. Não controla como aplicativos externos rotulam ou modificam links na interface deles; a URL canônica compartilhável é `https://noway-esports-site.vercel.app/`.
- Nenhuma modificação em páginas, textos comerciais, cargos, foto de elenco ou dados do banco; validação de ausência de nomes e sintaxe JS, commit, deploy READY a confirmar.

## Prévia de compartilhamento NOWAY — 20/10/2026

- Pedido: quando alguém enviar o link do site, mostrar uma capa chamativa com a marca NOWAY, título e resumo oficiais. Animações/GIFs não são garantidos nas prévias de apps sociais; escolhida imagem estática para compatibilidade.
- Nova imagem gerada especificamente para a NOWAY com marca dourada e fundo esportivo preto, exportada como JPEG leve `assets/noway-social-preview.jpg` (800 × 420 pixels, ~50 KB) no próprio GitHub/Vercel; não há dependência de serviço de imagem externo.
- Foram adicionados ao HTML inicial (disponível mesmo para crawlers sem JavaScript) Open Graph: `og:title`, `og:description`, `og:image`, `og:url`, `og:type`, `og:site_name`, locale, MIME e dimensões; Twitter/X: `summary_large_image` e título/descrição/imagem. URL absoluta oficial `https://noway-esports-site.vercel.app/assets/noway-social-preview.jpg`, canônicas próprias para Home, Comunidade, Recrutamento, Desafios e NOWAY ID.
- Identidade do site e nenhuma das rotas internas, permissões ou fotos de atletas foi alterada. Caches de WhatsApp, Discord, Facebook e outros serviços podem reter a imagem anterior e não há suporte confiável a animações nestas prévias.
- Conferir commit, deployment Vercel READY e, quando possível, inspecionar OG real em plataforma de compartilhamento. READY não comprova a reindexação do cache de rede social.

## Correção de permissão GRI para aba Equipe — 21/10/2026

- Solicitado diretamente pelo Founder: GRI não conseguia abrir aba Equipe do NOWAY ID. A decisão anterior de não autorizar GRI nessa aba fica **revogada pelo pedido atual**; GRI continua sendo jogador, com acesso à Central da Equipe, chat, mural e tracker, **sem** receber gestão geral.
- Causa confirmada: três filtros JavaScript (`noway-console.js`, `noway-id.js`, `noway-equipe.js`) e a função de autorização de backend `noway_is_team_staff()` excluíam GRI. Embora presente no elenco interno, ele não conseguia abrir a aba nem consultar dados e chat.
- Migração Supabase **já aplicada com sucesso**: `allow_gri_team_workspace_as_player_20261021`, versionada em `supabase/migrations/20261021_allow_gri_team_workspace.sql`: função `public.noway_is_team_staff()` passa a aceitar owner, manager, jogador e gri após verificar `auth.uid()`, permitindo acesso das políticas RLS existentes e funções de leitura/chat. `public.noway_can_manage_team()` permanece exclusivamente owner/manager. Políticas de anexos privados exigem login e participação real na equipe.
- UI: `noway-console.js` libera para GRI **somente a aba `equipe`**, mantendo Agenda, Competitivo, Desafios, Permissões e ações gerenciais sujeitos às regras anteriores; `noway-id.js` libera funções de chat/diretório do time; `noway-equipe.js` libera o GRI no checkAuth do hub, sempre somente leitura/participação, sem poder editar a gestão. `painel.html` atualiza versões de import para não ficar preso no cache antigo. Recrutamento mantém regras próprias de GRI.
- Sintaxe JS validada e definição da função no banco conferida. A publicação Vercel READY precisa de confirmação separada. Teste integrado logado em conta GRI real ainda pendente.

## Emblema do cargo GRI nos nomes — 21/10/2026

- Pedido explícito: o Gestor de Recrutamento e Indicação (GRI) precisa de um emblema ao lado do nome, assim como Founder e TM; solicitado aplicar diretamente no site.
- `noway-id.js`: a função central `nowayRoleBadge(role,senderName)` agora reconhece também `gri`, com emblema SVG autoral de escudo e marca de seleção, tooltip e rótulo acessível "GRI / Gestor de Recrutamento e Indicação". Reutiliza os pontos onde os badges de Founder/TM já aparecem: chat da equipe, mural/comunicados e conversas de contato onde o cargo é fornecido pelo servidor. Não associa badge a nomes por suposição e não altera o SVG dos emblemas existentes.
- `styles.css`: classe `is-gri` em verde/menta metálico para diferenciar do amarelo Founder e azul TM, respeitando 27px e estética premium do NOWAY ID. `painel.html`: atualização de versão dos arquivos de estilos e script para evitar cache antigo.
- **Não altera cargos, permissões, RLS, RPC, banco, candidatos, recrutamento nem layout de outras páginas.** Verificar sintaxe, saídas da função para papéis válidos/inválidos, commit, deploy READY; teste visual e com conta GRI real dependem de acesso autenticado.

## Performance e correção de rolagem involuntária — 21/10/2026

- Founder relatou que o site rolava para cima sozinho e ficava lento. Diagnóstico a partir de scripts: `noway-console.js.setTab` chamava `scrollIntoView` também durante a sincronização automática do cargo/sessão, `noway-id.js.openTicket` chamava `scrollIntoView` na consulta automática de contatos a cada minuto. `noway-equipe.js` recriava cards mesmo sem dados novos. A Home descartava thumbnails e banners de live em toda consulta, gerando layout shifts.
- `noway-console.js`: `setTab(name,{passive:true})` na sincronização de cargo; não rola página nem refaz aba igual. Hash com `location.search` preservado. Eventos irrelevantes de Auth e `SIGNED_IN` repetido da mesma conta não recarregam o painel. Cliques em menus continuam podendo rolar voluntariamente.
- `noway-id.js`: atualização do histórico de Contatos (60s) apenas quando essa aba está aberta, sem scroll nem indicador de carregamento substituindo a conversa. Auth não desmonta o chat durante refresh de token. Chat busca novas mensagens a cada 12s dentro de Equipe e a cada 48s em outras abas, para preservar alertas com custo menor.
- `noway-equipe.js`: usa assinatura JSON do payload para atualizar cards do hub somente se os dados mudarem ou o usuário pedir Atualizar. Em caso de erro, invalida assinatura para permitir recuperação. Mantém verificação de auth do Supabase e consulta externa com cache existente.
- `noway-latest-posts.js`: atualiza contadores de visualizações in-place e preserva imagens/cards quando os vídeos não mudaram, sem cancelar atualização de 5min. `noway-roster-live.js`: mantém banners intactos quando plataformas ao vivo não mudaram.
- `noway-recruitment-desk.js`: evita consultar notificações de recrutamento para cargos sem autorização (continuam Owner/TM/GRI). `mouse-interactions.js`: reduz custo em hardware limitado (≤4GB de memória reportada, ≤4 threads ou saveData), usando cursor nativo sem efeitos de rastro; identidade visual preservada para aparelhos elegíveis.
- `painel.html` e `index.html`: URLs de scripts alterados recebem versão de cache nova; mantém badge GRI implementado anteriormente. Sem mudanças de dados de candidatos, fotos de elenco, permissões, bancos de dados ou páginas.
- Validação: sintaxe JS testada; não houve navegação real por navegador autenticado nem perfilamento de FPS/largura de banda. Confirmar commit e deploy Vercel READY; se continuar ocorrendo, solicitar qual página/aba e vídeo do problema.

- Ajuste adicional (21/10): `noway-console.js` deixou de forçar `scrollIntoView` para avisos de erro de consultas automáticas, evitando subir a página durante falhas temporárias. Continua mostrando a mensagem no sistema, sem retirar informações de erro. Versão do script da página `painel.html` atualizada para quebrar cache.

## Atualização editorial do elenco — 29/10/2026

- Pedido explícito do Founder: mover **Prado** e **Ace somente do elenco público** para **Menções Honrosas**. Esta mudança não revoga funções, cargos, contas NOWAY ID, vínculos internos nem permissões de ninguém.
- `site-data.js`: removidos os registros editoriais de Prado e Ace de `team` e transferidos para `honorableMentions`, com homenagens sobre Prado como primeiro Team Manager e colaborador da fundação, e Ace como primeiro GRI e responsável por indicações e fortalecimento da comunidade. Fotografias originais, biografias e redes foram preservadas. Jhonny permanece nas Menções Honrosas, sem alterações.
- `index.html`: contador de cards em “TODOS” ajustado de 05 para 03 (Nielss Uno + duas vagas abertas) e atualizada a versão de cache de `site-data.js` para refletir a mudança no navegador. A seção administrativa pública, incluindo a referência ao Prado como TM, não foi modificada.
- Sem alterações em arquivos do NOWAY ID, Supabase, RLS, funções backend ou permissões; sem alteração de CSS, estrutura do site ou implementação de novas funcionalidades.
- **Observação:** componentes de mídia que consultam apenas `team` deixam de considerar Prado e Ace como integrantes do elenco atual. Nenhuma alteração foi feita nesses componentes.
- **Validação:** inspeção de consistência da coleção e sintaxe JavaScript; publicação no GitHub confirmada por commit, com deploy da Vercel e teste visual a verificar separadamente.

## Ajuste de vagas após as Menções Honrosas — 29/10/2026

- Solicitação do Founder: após mover Prado e Ace apenas para Menções Honrosas, manter **cinco posições visuais** no elenco público, substituindo os dois espaços desocupados por cards iguais aos de **VAGA ABERTA**.
- `site-data.js`: incluídas duas posições editoriais de recrutamento em 2º e 3º lugares: **Âncora / Suporte** (posição anteriormente exibida por Prado) e **Flex** (posição anteriormente exibida por Ace). Preservadas as outras duas vagas existentes de **2º Entry / Lurker** e **Âncora / Suporte**; são, portanto, duas posições de Âncora / Suporte no elenco público, sem modificar nenhuma vaga anterior.
- `index.html`: contador de “TODOS” voltou a **05** (Nielss Uno + quatro cards de VAGA ABERTA) e atualizada a versão de cache de `site-data.js`.
- `honorableMentions` permanece intacta com Jhonny, Prado e Ace, mantendo homenagens, biografias, fotos e redes anteriores. Sem alterações em gestão, NOWAY ID, Supabase, cargos, acesso, permissões, recrutamento privado ou design/CSS.
- Validação: sintaxe JavaScript e estruturas esperadas verificadas antes do commit. GitHub deve ser verificado após gravação; deploy e teste visual na Vercel permanecem verificações independentes.

## Descoberta em buscadores — 29/10/2026

- Pedido do Founder: começar otimização de busca da NOWAY, com instruções e execução em uma etapa por vez.
- Nesta primeira etapa, foram criados `sitemap.xml` (somente páginas públicas `/`, `/comunidade`, `/recrutamento`, `/desafios`) e `robots.txt` permitindo rastreamento e declarando o sitemap. Endereço canônico: `https://noway-esports-site.vercel.app/`.
- `comunidade.html`, `recrutamento.html` e `desafios.html`: somente os metadados `rel=canonical` e `og:url` foram alinhados às rotas sem extensão geradas por `vercel.json` (`cleanUrls=true`). Nada foi alterado no conteúdo visual, nas candidaturas, no backend ou nas permissões.
- Excluídos do sitemap: painel NOWAY ID, links administrativos/autenticados, mensagens e outros recursos privados. Sitemap não é uma autorização de acesso nem uma regra de segurança.
- A verificação de propriedade no Google Search Console e o envio do sitemap ainda dependem de ação da conta Google do Founder. Indexação/posicionamento não são garantidos.
- Validação pendente: confirmar a publicação na Vercel e o acesso HTTP aos arquivos; commits GitHub não comprovam deploy nem indexação.
