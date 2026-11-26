# JWT Decoder

Decode JWT tokens: header, payload, expiry status and copyable claims.

**JWT Decoder** runs on the selection (or the whole document) — it detects a `Bearer`-prefixed token, decodes the base64url segments, shows header + payload as JSON and computes whether the token is still valid from its `exp` claim.

## Usage
Run **JWT decoder** (`Ctrl-Alt-1`) on a token, then choose *Show decoded token* or *Copy claims as JSON*.

## Português
**Decodificador de JWT**: decodifica tokens na seleção — header, payload, algoritmo e validade (verifica `exp`). Permite copiar os claims como JSON. Atalho `Ctrl-Alt-1`.

Part of the Xcoder plugin marketplace — installed via **Extensions**.
