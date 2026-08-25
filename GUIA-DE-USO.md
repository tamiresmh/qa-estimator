# QA Estimator — Guia de Uso

## O que é
Um copiloto de QA: você informa o ID de uma User Story do Azure DevOps, o app analisa a
complexidade dela, sugere uma estimativa de esforço de testes (técnica PERT) com justificativa,
e você decide — aceitar ou ajustar. Tudo fica registrado de volta na User Story.

**A IA nunca decide sozinha.** Ela só sugere. Quem decide é sempre você, QA.

## 1. Pré-requisitos (uma vez só)
- Ter o **Node.js** instalado. Se não tiver: baixe em https://nodejs.org (versão LTS) e instale
  normalmente, como qualquer programa.
- Ter um **Personal Access Token (PAT)** do Azure DevOps com permissão de leitura/escrita em
  Work Items. Gere em: `Seu perfil → Personal Access Tokens → New Token`.

## 2. Como abrir o app
- **Windows**: dê duplo clique em `Iniciar QA Estimator.bat`
- **Mac**: dê duplo clique em `Iniciar QA Estimator.command`
  (se o Mac bloquear por segurança na primeira vez: clique com o botão direito → Abrir)

Na primeira vez, o app vai instalar algumas dependências automaticamente — isso pode demorar
alguns minutos. Nas próximas vezes, abre direto.

> Dica: crie um atalho desse arquivo na sua Área de Trabalho para não precisar navegar até a
> pasta toda vez.

## 3. Configurar a conexão (uma vez só)
1. Abra a aba **Configuração**.
2. Preencha:
   - Organização: `https://dev.azure.com/sua-organizacao/`
   - Projeto: `Nome do seu projeto no Azure DevOps`
   - PAT: cole o token gerado no passo anterior
3. Clique em **Testar conexão** para confirmar que está tudo certo.
4. Clique em **Salvar credenciais** — elas ficam criptografadas neste computador, o PAT nunca é
   salvo em texto puro nem enviado para lugar nenhum além do Azure DevOps.

## 4. Estimar uma User Story
1. Abra a aba **Estimar User Story**.
2. Digite o ID da US e clique em **Buscar User Story**.
3. O app mostra os dados da US, a análise de complexidade (4 fatores) e a estimativa PERT
   sugerida, com a justificativa completa.
4. Escolha **Aceitar sugestão** ou **Ajustar valor**. Se ajustar, é obrigatório explicar o
   motivo (isso ajuda a calibrar o processo no futuro).
5. Clique em **Registrar no Azure DevOps**. A estimativa vira um comentário na User Story,
   sempre rastreável, mesmo que o projeto não tenha campos customizados configurados.

## 5. Histórico
A aba **Histórico** mostra todas as estimativas já feitas nesta máquina — útil para acompanhar
o processo ao longo do tempo.

## Dúvidas comuns

**Abri o app e já veio com organização/projeto preenchidos, que não são os meus** — isso
acontece se esse computador já rodou este app antes (ou outra cópia dele) e salvou credenciais.
Elas ficam guardadas fora da pasta do projeto, numa área de dados do próprio sistema operacional
(`%APPDATA%\qa-estimator` no Windows, `~/Library/Application Support/qa-estimator` no Mac) — por
isso continuam lá mesmo se você baixar uma cópia nova do código. Para limpar: aba
**Configuração → Limpar credenciais salvas**. Isso é sempre local a cada computador — nunca é
gravado no código nem viaja junto quando alguém baixa ou clona o projeto.

**"Falha na conexão" ao testar** — confira se a organização/projeto estão exatamente como no
Azure DevOps (maiúsculas/minúsculas importam no nome do projeto) e se o PAT não expirou.

**"Campos customizados não existem neste processo"** — normal, é só um aviso. O registro por
comentário já garante a rastreabilidade exigida; os campos customizados são um extra.

**Quero mudar as cores** — o tema fica centralizado no topo do arquivo
`src/renderer/styles.css`, fácil de ajustar.
