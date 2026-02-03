# Multi-Agent Analysis pro Hedz

## Kontext

Petr identifikoval potřebu: **možnost mít více agentů na jednom serveru**.
Tato analýza shrnuje možnosti OpenClaw a dopad na Hedz architekturu.

---

## Co OpenClaw podporuje

### 1. Multi-Agent Routing

Jeden Gateway může hostit **neomezený počet agentů**, každý s:
- Vlastním workspace (AGENTS.md, SOUL.md, soubory)
- Vlastním agent directory (auth, sessions)
- Vlastní identitou a osobností
- Vlastními tool permissions

```json
{
  "agents": {
    "list": [
      { "id": "pete", "workspace": "~/.openclaw/workspace-pete" },
      { "id": "alice", "workspace": "~/.openclaw/workspace-alice" },
      { "id": "bob", "workspace": "~/.openclaw/workspace-bob" }
    ]
  }
}
```

### 2. Bindings (Routing)

Zprávy se routují na agenty podle:
- **channel** - WhatsApp, Telegram, Discord...
- **accountId** - více účtů jednoho kanálu
- **peer** - konkrétní DM nebo skupina
- **guildId/teamId** - Discord guild, Slack team

```json
{
  "bindings": [
    { "agentId": "pete", "match": { "channel": "telegram", "peer": { "kind": "dm", "id": "599821323" } } },
    { "agentId": "alice", "match": { "channel": "whatsapp" } },
    { "agentId": "bob", "match": { "channel": "telegram", "accountId": "work-bot" } }
  ]
}
```

### 3. Broadcast Groups

Více agentů může odpovídat na **stejnou zprávu** (parallel nebo sequential):

```json
{
  "broadcast": {
    "strategy": "parallel",
    "-4641738559": ["code-reviewer", "security-auditor", "docs-generator"]
  }
}
```

Use cases:
- Specializované týmy (code review, security, docs)
- Multi-language support
- QA workflows

### 4. Per-Agent Sandbox & Tools

Každý agent může mít vlastní:
- Sandbox mode (off/all/non-main)
- Tool allow/deny lists
- Model (sonnet vs opus)

```json
{
  "agents": {
    "list": [
      {
        "id": "trusted",
        "sandbox": { "mode": "off" },
        "tools": { "allow": ["*"] }
      },
      {
        "id": "restricted",
        "sandbox": { "mode": "all" },
        "tools": { "deny": ["exec", "write"] }
      }
    ]
  }
}
```

### 5. Sub-Agents

Agenti mohou spawnovat izolované sub-agenty pro background tasks:
- Vlastní session
- Omezené tools (bez session tools)
- Auto-archive po dokončení
- Announce result zpět do chatu

---

## Dopad na Hedz architekturu

### Původní model (v0)

```
1 VPS = 1 Agent
├── Jednoduché
├── Plná izolace
├── Drahé (~€4/agent/měsíc)
└── Špatně škáluje pro více agentů
```

### Nový model (doporučený)

```
1 VPS = N Agentů
├── Efektivnější využití resources
├── Levnější (€4 pro 3-10 agentů)
├── Sdílený Gateway proces
├── Izolace přes workspaces + sandboxing
└── Komplexnější management
```

---

## Návrh: Hedz podporuje oba modely

### Option A: Shared Server (default pro jednotlivce)

```
hedz.app
├── Server: "Personal" (cx22, €4/mo)
│   ├── Agent: Pete (Telegram @PeteBot)
│   ├── Agent: Alice (WhatsApp personal)
│   └── Agent: WorkBot (Slack workspace)
```

**Kdy použít:**
- Jednotlivci s více agenty
- Různé kanály/účely
- Budget-conscious

### Option B: Dedicated Server (pro heavy load)

```
hedz.app
├── Server: "Pete-Dedicated" (cx32, €8/mo)
│   └── Agent: Pete (high traffic, opus model)
├── Server: "Team-Server" (cx22, €4/mo)
│   ├── Agent: Alice
│   └── Agent: Bob
```

**Kdy použít:**
- High-traffic agenti
- Enterprise/team use
- Striktní izolace requirements

---

## Změny v Hedz UI

### Server management

```
Servers
├── [+] Add Server
├── Server: "Personal" (cx22, fsn1)
│   ├── Status: running
│   ├── IP: 135.181.x.x
│   ├── Agents: 3
│   └── [Manage Agents] [Settings] [Destroy]
```

### Agent management (per server)

```
Server: Personal → Agents
├── [+] Add Agent
├── Agent: Pete
│   ├── Channel: Telegram @PeteBot
│   ├── Workspace: ~/.openclaw/workspace-pete
│   └── [Edit] [Remove]
├── Agent: Alice
│   ├── Channel: WhatsApp +420...
│   └── [Edit] [Remove]
```

### Spawn flow změna

**Starý flow:**
1. Create server
2. Server = Agent (1:1)

**Nový flow:**
1. Select/Create server
2. Add agent to server
3. Configure bindings

---

## Technické změny

### 1. Cloud-init update

Místo jednoho agenta, cloud-init připraví multi-agent strukturu:

```yaml
# Adresáře pro více agentů
mkdir -p /home/node/.openclaw/agents/
mkdir -p /home/node/.openclaw/workspace-{agent1,agent2,...}
```

### 2. Config management

Hedz musí umět:
- Generovat `openclaw.json` s více agenty
- Updatovat bindings
- Hot-reload config (bez restartu Gateway)

### 3. Discovery endpoint update

```json
// /.well-known/openclaw.json
{
  "name": "Personal Server",
  "version": "2026.1.30",
  "agents": [
    { "id": "pete", "status": "running", "channels": ["telegram"] },
    { "id": "alice", "status": "running", "channels": ["whatsapp"] }
  ]
}
```

### 4. Hetzner labels update

```
openclaw: "true"
openclaw-server-name: "Personal"
openclaw-agent-count: "3"
```

---

## Trade-offs

| Aspekt | 1 Server = 1 Agent | 1 Server = N Agentů |
|--------|-------------------|---------------------|
| Cost | €4/agent | €4 pro všechny |
| Isolation | Plná (OS-level) | Workspace + sandbox |
| Scaling | Horizontal | Vertical first |
| Management | Jednodušší | Komplexnější |
| Failure domain | Izolovaný | Sdílený |
| Resource contention | Žádný | Možný |

---

## Doporučení pro v0.1

1. **Zachovat současný 1:1 model** jako "dedicated mode"
2. **Přidat "shared mode"** jako default pro nové servery
3. **UI redesign**: Server list → Agent list per server
4. **Config generator**: Generovat multi-agent openclaw.json
5. **Hot-reload**: Podpora pro přidání agenta bez restartu

---

## Otevřené otázky

1. **Jak řešit WhatsApp QR pairing** pro multi-agent? (každý WhatsApp účet = jeden QR)
2. **Billing model** - účtovat per server nebo per agent?
3. **Migrace** - jak přesunout agenta mezi servery?
4. **Backup/Restore** - workspace per agent nebo celý server?

---

## Reference

- [Multi-Agent Routing](https://docs.openclaw.ai/concepts/multi-agent)
- [Broadcast Groups](https://docs.openclaw.ai/broadcast-groups)
- [Sandboxing](https://docs.openclaw.ai/gateway/sandboxing)
- [Sub-Agents](https://docs.openclaw.ai/tools/subagents)
- [Hetzner Deployment](https://docs.openclaw.ai/platforms/hetzner)
