# Instruções para agentes — NOWAY Esports

**PRIMEIRO PASSO OBRIGATÓRIO:** ler integralmente **NOWAY_CONTEXT_MASTER.md**, na raiz do projeto, ANTES de responder sobre arquitetura ou editar arquivos.

O documento mestre contém identidade visual aprovada, mapa do código, IDs de projetos, hierarquia de cargos, privacidade, GRI, recrutamento, Tracker, fotos, bugs conhecidos, situação verificada, limites de teste e regras de continuidade.

## Regras operacionais

1. Priorize o último pedido explícito do usuário; **não amplie escopo**.
2. Faça uma tarefa por vez e preserve o visual preto/amarelo já aprovado.
3. **Fotos do elenco são ativos editoriais controlados por site-data.js; avatar da conta NOWAY ID é diferente.** Nunca use geração de imagens quando a tarefa é apenas substituir o arquivo original de uma foto.
4. Nunca invente partidas, métricas, resultados ou integração oficial de terceiros.
5. Garanta acesso por RLS/RPC do Supabase, não só por botões: recrutamento individual é privado; GRI tem atribuições específicas de recrutamento, não gestão global.
6. Diferencie Tracker externo consultado via Edge Function do Tracker proprietário baseado em estatísticas registradas e confirmadas pela NOWAY.
7. Distinga commit, deploy READY, inspeção visual e teste com usuários reais. **Não anuncie entrega sem validação.**
8. Não grave chaves, credenciais, e-mails, mensagens privadas ou dados de candidatos em documentação.
9. Após mudança material, atualize o registro no documento mestre com data, arquivos, backend, versão do deploy, validações e pendências.
10. **Estado de intenção em 16/10/2026:** após pedir GRI e Tracker, o usuário interrompeu a expansão da implementação e pediu **documentação para não perder contexto**. Este arquivo e o documento mestre não dão autorização para desenvolver mais funcionalidades sem novo pedido.

**Links:** repositório AizenXprog/noway-esports-site, produção https://noway-esports-site.vercel.app/, painel /painel.html, recrutamento /recrutamento.html.

Este documento é uma referência de comportamento para continuidade, não substitui o código atual nem os comandos do usuário.
