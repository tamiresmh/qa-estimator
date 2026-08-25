# Como funciona o QA Estimator

Este documento explica o motor por trás da sugestão de estimativa: como a complexidade é
pontuada e como o cálculo de três pontos (PERT) é aplicado em cima dela. Se você só quer usar o
app, veja o `GUIA-DE-USO.md` — este arquivo é para quem quer entender ou mexer no algoritmo.

## Visão geral do fluxo

```
User Story (Azure DevOps)
        │
        ▼
1. Análise de complexidade  → pontua 4 dimensões (0–10 cada) → total 0–40
        │
        ▼
2. Classificação             → total < 8 = Baixa · < 18 = Média · ≥ 18 = Alta
        │
        ▼
3. Cenário PERT               → Otimista / Mais provável / Pessimista (tabela fixa por nível)
        │
        ▼
4. Cálculo PERT                → (O + 4M + P) / 6 = estimativa sugerida, em horas
        │
        ▼
5. Justificativa automática   → texto explicando a classificação e a conta feita
        │
        ▼
6. Validação humana            → QA aceita ou ajusta (com motivo obrigatório se ajustar)
```

Importante sobre o que este motor **é** e **não é**: não é um modelo de machine learning nem
"entende" a User Story no sentido de interpretar linguagem natural com uma IA generativa. É um
algoritmo determinístico de pontuação — conta ocorrências de palavras-chave, itens de lista e
tamanho de texto, e aplica pesos fixos definidos em `src/analysis/complexityAnalyzer.js`. Isso é
intencional: torna o resultado 100% explicável e reproduzível (a mesma US sempre gera a mesma
pontuação), o que é o ponto principal do projeto — reduzir a subjetividade e dar rastreabilidade,
não "adivinhar" com uma caixa-preta.

## 1. Análise de complexidade

A pontuação total é a soma de 4 dimensões independentes, cada uma limitada a 0–10 pontos
(`clampScore` em `complexityAnalyzer.js`), então o total teórico vai de 0 a 40.

### Dimensão 1 — Funcional
Mede regras de negócio, fluxos, validações e cálculos. Procura por palavras-chave como
"regra de negócio", "validação", "cálculo", "fluxo", "condição", "cenário", "exceção" (lista
completa em `FUNCTIONAL_KEYWORDS`) na descrição + critérios de aceite da US.

```
score = (nº de termos encontrados × 0.6) + (nº de itens de lista nos critérios de aceite × 0.5)
```

### Dimensão 2 — Técnica
Mede integrações, APIs, serviços, processamento assíncrono. Procura termos como "integração",
"api", "serviço", "endpoint", "assíncrono", "fila", "webhook", "microsserviço", "banco de dados"
(lista completa em `TECHNICAL_KEYWORDS`), e conta os itens relacionados/vinculados à US (que
sugerem dependências com outras áreas).

```
score = (nº de termos técnicos × 0.8) + (nº de itens relacionados vinculados × 0.7)
```

### Dimensão 3 — Escopo
Mede o tamanho do trabalho: quantos critérios de aceite a US tem e quão longa é a descrição.

```
score = min(6, nº de critérios de aceite) + min(4, palavras da descrição / 60)
```

### Dimensão 4 — Casos de teste
Mede quantos casos de teste já existem vinculados à US e estima quantos ainda precisam ser
criados (assumindo 2 por critério de aceite — 1 cenário positivo + 1 negativo — descontando os
já vinculados).

```
casos_a_criar = max(0, critérios_de_aceite × 2 − casos_já_vinculados)
score = (casos_já_vinculados × 0.4) + (casos_a_criar × 0.5)
```

### Total e classificação

```
total = funcional + técnica + escopo + casos_de_teste     (0 a 40)

Baixa  se total < 8
Média  se total < 18
Alta   se total >= 18
```

Esses limiares (8 e 18) vêm da especificação original do projeto e ficam centralizados em
`src/shared/constants.js` (`COMPLEXITY_THRESHOLDS`), caso precisem ser recalibrados no futuro
com base em dados históricos reais.

## 2. Cálculo PERT (técnica de três pontos)

Depois de classificada a complexidade, o motor busca o cenário de horas correspondente numa
tabela fixa (`PERT_SCENARIOS` em `constants.js`), definida na especificação do projeto:

| Complexidade | Otimista (O) | Mais provável (M) | Pessimista (P) |
|---|---|---|---|
| Baixa | 2h | 4h | 6h |
| Média | 6h | 10h | 16h |
| Alta | 12h | 20h | 32h |

E aplica a fórmula clássica de estimativa de três pontos (PERT):

```
estimativa = (O + 4×M + P) / 6
```

O peso 4 no valor "mais provável" é o que torna essa técnica mais robusta que uma média simples:
ela puxa o resultado para perto do cenário mais realista, mas ainda deixa os extremos otimista e
pessimista influenciarem o resultado — é a mesma lógica usada em gerenciamento de projetos (PERT/
CPM) desde os anos 1950.

## 3. Exemplo real (o mesmo usado nos prints de demonstração)

User Story fictícia: *"Permitir pagamento parcelado no checkout com validação de limite e
integração com gateway"*, com 5 critérios de aceite, descrição de 37 palavras, 2 casos de teste
já vinculados e 3 itens relacionados.

**Análise de complexidade:**

| Dimensão | Cálculo | Pontuação |
|---|---|---|
| Funcional | 5 termos × 0.6 + 5 itens × 0.5 | 5.5 / 10 |
| Técnica | 4 termos × 0.8 + 3 relacionados × 0.7 | 5.3 / 10 |
| Escopo | min(6,5) + min(4, 37/60) | 5.6 / 10 |
| Casos de teste | 2 vinculados × 0.4 + 8 a criar × 0.5 | 4.8 / 10 |
| **Total** | 5.5 + 5.3 + 5.6 + 4.8 | **21.2 / 40 → Alta** |

**Cálculo PERT** (cenário "Alta": O=12, M=20, P=32):

```
(12 + 4×20 + 32) / 6 = (12 + 80 + 32) / 6 = 124 / 6 = 20.67h
```

Essa é a estimativa sugerida que aparece na tela — sempre acompanhada da justificativa textual
gerada por `buildJustification()` em `src/pert/pertEngine.js`, citando a classificação e a conta
exata que levou a esse número.

## 4. Depois da sugestão: decisão humana

O QA pode **aceitar** a sugestão como está, ou **ajustar** o valor final. Se ajustar, o motivo é
obrigatório (validado em `src/services/validationService.js`) e fica registrado junto com a
estimativa — tanto no histórico local (`historyStore.js`) quanto no comentário gravado de volta
na User Story no Azure DevOps. Essa trilha de ajustes é o que, no futuro, pode alimentar
calibração do algoritmo (ver seção de evoluções futuras no `README.md`) — hoje esse dado só é
coletado, não é usado automaticamente para nada.

## Onde mexer

- Pesos e palavras-chave de cada dimensão: `src/analysis/complexityAnalyzer.js`
- Limiares de classificação e tabela de cenários PERT: `src/shared/constants.js`
- Texto da justificativa automática: `src/pert/pertEngine.js`
