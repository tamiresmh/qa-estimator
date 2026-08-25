# QA Estimator

Assistente inteligente de estimativa de esforço para testes, integrado ao Azure DevOps.
Lê uma User Story, analisa complexidade, aplica PERT, justifica a sugestão, e deixa a decisão
final sempre nas mãos do QA.

Veja `GUIA-DE-USO.md` para instruções de uso sem terminal, e `COMO-FUNCIONA.md` para o
detalhamento do algoritmo de complexidade e do cálculo PERT (com exemplo numérico).

## Rodar em modo desenvolvimento
```bash
npm install
npm start
```

## Rodar os testes
```bash
npm test
```

## Estrutura
```
src/main/            processo principal Electron (main.js, preload.js, ipc-handlers.js)
src/renderer/         UI (HTML/CSS/JS puro)
src/services/          orquestração (estimationService, validationService)
src/analysis/          complexityAnalyzer.js — motor de pontuação de complexidade
src/pert/              pertEngine.js — cálculo PERT + justificativa
src/azuredevops/       client.js — cliente REST (busca US, registra estimativa)
src/storage/           credentialStore.js (credenciais), historyStore.js (histórico local)
src/shared/            constants.js — limiares e cenários PERT centralizados
test/                  testes unitários (node:test)
```

## Regras de negócio
- Classificação de complexidade por pontuação (4 dimensões: funcional, técnica, escopo, casos
  de teste). Limiares: Baixa < 8, Média < 18, Alta >= 18.
- PERT = (Otimista + 4×Mais provável + Pessimista) / 6, com tabela de cenários fixa por
  complexidade.
- Toda sugestão vem com justificativa textual automática.
- QA sempre decide: aceitar ou ajustar com motivo obrigatório.
- Registro no Azure DevOps via comentário estruturado (sempre funciona) + tentativa best-effort
  de campos customizados (`Custom.QAComplexity`, `Custom.QAPertHours`,
  `Custom.QAFinalEstimateHours`).

## Segurança
Credenciais (organização, projeto, PAT) são criptografadas localmente via `safeStorage` do
Electron (DPAPI no Windows / Keychain no macOS) e ficam em `%APPDATA%` (Windows) ou
`~/Library/Application Support` (macOS). O PAT nunca é enviado para nenhum lugar além do
próprio Azure DevOps.

## Licença
Distribuído sob a licença MIT — veja o arquivo [LICENSE](LICENSE).
