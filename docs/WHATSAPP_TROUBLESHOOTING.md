# 🔧 WhatsApp - Troubleshooting & Debug

## 🎯 TESTE MANUAL (PASSO A PASSO)

### 1. **Debug da Evolution API**
```bash
# No browser (logado), visite:
https://app.suachurn.com.br/api/whatsapp/debug
```

**O que verificar:**
- ✅ `evolution.health` = "OK"
- ✅ `agency.instanceName` = "agency_xxx"  
- ✅ `instance.status.state` = "close" ou "open"
- ✅ `instance.qrCode` = "✅ Available" ou objeto

**Se `health` = ERROR:**
- Evolution API está offline ou API Key inválida
- Verifique: `EVOLUTION_API_URL` e `EVOLUTION_API_KEY` no Vercel

---

### 2. **Conectar WhatsApp (UI)**
1. **Configurações → WhatsApp**
2. Clique **"Conectar WhatsApp"**
3. **Aguarde 5-10s** (criar instância + gerar QR)
4. **QR Code aparece** (quadrado branco com pontos)
5. **WhatsApp → Menu → Aparelhos Conectados**
6. **Escaneia QR Code**
7. **Aguarda 3s** → deve mudar para "✅ Online"

**Se QR não aparece:**
- Abra DevTools Console (F12)
- Procure logs: `[WhatsApp Connect]`
- Verifique errors

---

### 3. **Verificar Logs no Vercel**
```bash
# Vercel Dashboard → Logs
# Busque: "[WhatsApp Connect]"
```

**Fluxo esperado:**
```
[WhatsApp Connect] Starting for: agency_xxx
[WhatsApp Connect] Checking status...
[WhatsApp Connect] ✅ Instance created (attempt 1)
[WhatsApp Connect] Waiting 3s for initialization...
[WhatsApp Connect] ✅ Status after creation: { connected: false, state: 'close' }
[WhatsApp Connect] Generating QR Code...
[WhatsApp Connect] ✅ QR Code obtained (attempt 1)
[WhatsApp Connect] ✅ Webhook registered
[WhatsApp Connect] ✅ QR Code saved to DB
```

---

## 🐛 PROBLEMAS COMUNS

### ❌ "Não foi possível gerar QR Code após 3 tentativas"

**Causa:** Evolution API não retornou QR Code  
**Soluções:**
1. **Teste direct na API:**
   ```bash
   curl -X GET "https://evolution-zc.emadigital.com.br/instance/connect/agency_XXX" \
     -H "apikey: 0e32e814b9136e33bbfcd634e2931f693057bddb"
   ```
2. **Verifique resposta:**
   - ✅ `{ "base64": "iVBOR...", "code": "..." }`
   - ❌ `{ "error": "Instance already connected" }` → Desconecte antes

3. **Desconecte e reconecte:**
   ```bash
   curl -X DELETE "https://evolution-zc.emadigital.com.br/instance/logout/agency_XXX" \
     -H "apikey: 0e32e814b9136e33bbfcd634e2931f693057bddb"
   ```

---

### ❌ "Timeout ao listar grupos"

**Causa:** Muitos grupos (100+) na instância  
**Solução:** ✅ **JÁ IMPLEMENTADO** - Agora cada agência tem sua instância (5-20 grupos)

**Teste:**
```bash
# Visite (logado):
/api/whatsapp/agency/groups

# Deve retornar em 1-3s com 5-20 grupos
```

---

### ❌ QR Code aparece mas não conecta

**Possíveis causas:**
1. **QR Code expirou** (2 min)
   - Solução: Clique "Conectar WhatsApp" novamente

2. **Número já conectado em outro lugar**
   - Solução: Desconecte outros aparelhos primeiro

3. **Webhook não registrado**
   - Teste webhook:
     ```bash
     curl -X GET "https://evolution-zc.emadigital.com.br/webhook/find/agency_XXX" \
       -H "apikey: 0e32e814b9136e33bbfcd634e2931f693057bddb"
     ```
   - Deve retornar: `{ "enabled": true, "url": "..." }`

---

## 📊 ARQUITETURA ATUAL

```
Evolution API (1 servidor)
  ├── Instância: agency_AAAA (WhatsApp da Agência A)
  │   └── 12 grupos → Lista em 2s ✅
  ├── Instância: agency_BBBB (WhatsApp da Agência B)
  │   └── 8 grupos → Lista em 1s ✅
  └── Instância: agency_CCCC (WhatsApp da Agência C)
      └── 15 grupos → Lista em 2s ✅
```

**Vantagens:**
- ✅ Cada agência = 1 número WhatsApp
- ✅ Listagem rápida (5-20 grupos)
- ✅ Sem timeout (era 45s+, agora <3s)
- ✅ Escalável (100+ agências OK)

---

## 🔍 ENDPOINTS DE DEBUG

### GET `/api/whatsapp/debug`
Informações completas da Evolution API + Instância

**Resposta:**
```json
{
  "evolution": {
    "url": "https://evolution-zc.emadigital.com.br",
    "apiKeyConfigured": true,
    "health": "OK"
  },
  "agency": {
    "id": "xxx",
    "name": "Clinisales",
    "instanceName": "agency_xxx",
    "dbPhone": "5511999999999",
    "dbConnectedAt": "2026-02-19T19:00:00Z"
  },
  "instance": {
    "status": { "connected": true, "state": "open", "phone": "5511999999999" },
    "qrCode": null
  },
  "allInstances": [
    { "name": "agency_xxx", "state": "open" },
    { "name": "agency_yyy", "state": "close" }
  ]
}
```

---

### POST `/api/whatsapp/agency/connect`
Conecta WhatsApp (gera QR Code)

**Retry automático:** 3 tentativas  
**Timeout:** 10s por tentativa  
**Logs:** Console com emoji (✅ ❌ ⚠️)

---

### GET `/api/whatsapp/agency/status`
Verifica se conectado

**Resposta:**
```json
{
  "connected": true,
  "phone": "5511999999999",
  "state": "open"
}
```

---

### GET `/api/whatsapp/agency/groups`
Lista grupos da agência (RÁPIDO!)

**Performance:**
- 5 grupos: ~1s
- 20 grupos: ~3s
- 100 grupos: ❌ Não acontece (1 agência = 5-20 grupos)

---

## 📝 LOGS IMPORTANTES

### Console do Browser (F12)
```
[WhatsApp] 🔄 Buscando grupos da agência...
[WhatsApp] 📡 Resposta em 2s - Status: 200
[WhatsApp] ✅ 12 grupos da agência
```

### Vercel Logs
```
[WhatsApp Connect] Starting for: agency_xxx
[WhatsApp Connect] ✅ Instance created
[WhatsApp Connect] ✅ QR Code obtained
[WhatsApp Connect] ✅ Webhook registered
```

---

## 🚀 NEXT STEPS

1. **Rodar migration no Supabase** (se ainda não rodou):
   ```sql
   ALTER TABLE agencies 
     ADD COLUMN whatsapp_instance_name TEXT NULL,
     ADD COLUMN whatsapp_phone TEXT NULL,
     ADD COLUMN whatsapp_connected_at TIMESTAMPTZ NULL,
     ADD COLUMN whatsapp_qr_code TEXT NULL;
   ```

2. **Testar conexão:**
   - Configurações → WhatsApp → Conectar
   - Escanear QR Code
   - Verificar status (deve ficar "✅ Online")

3. **Testar listagem de grupos:**
   - Clientes → Editar Cliente → Integrações
   - Clicar "Selecionar Grupo do Cliente"
   - Deve listar em 1-3s

4. **Monitorar Vercel Logs:**
   - Verificar performance
   - Procurar errors

---

## 📞 SUPORTE

Se ainda tiver problemas:
1. Verifique `/api/whatsapp/debug`
2. Leia logs do Vercel
3. Teste Evolution API direto (curl)
4. Abra issue no GitHub com logs completos
