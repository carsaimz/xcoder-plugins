# Scraper (XCoder plugin)

Obtém o **código-fonte de qualquer site** e faz engenharia reversa imediata:

- **Fonte** — bruto (HTTP nativo → `fetch` → WebView renderizada, cada passo visível no estado), toggle **Embelezar/Bruto** (formatação local de HTML/CSS/JS, sem prétier nem rede), **Copiar**, **Guardar** e **Abrir no editor**.
- **Recursos** — imagens, scripts, estilos, fontes e media referenciados pela página, com URL absoluto e abertura directa.
- **Segredos** — varredura de credenciais expostas (chaves AWS/Google/OpenAI/GitHub/Slack/GitLab, JWTs, chaves privadas, atribuições `api_key=…`), sempre **mascaradas**, e lista de **endpoints/APIs** referenciados pelo código.

## Português

**Scraper**: código-fonte bruto ou renderizado, embelezamento local, recursos com links, segredos mascarados e endpoints — tudo offline, guardável no editor com um toque.

---

Requires XCoder ≥ 1.8.43 (plugin API `webScraper`, `webInspector`, `downloadManager`).
