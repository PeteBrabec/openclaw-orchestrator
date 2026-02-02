# OpenClaw Orchestrator - Proposal

## Vision

A lightweight macOS app that lets you spawn, manage, and communicate with a fleet of OpenClaw agents - each with their own identity, infrastructure, and purpose.

## The Problem

Today, spawning an agent requires:
1. Manual secret management (copy-paste API keys)
2. Running CLI commands
3. Tracking which agents exist where
4. No unified way to communicate across agents

## The Solution

A native macOS app (or simple web dashboard) that:
- **Stores secrets in Apple Keychain** - no plaintext files
- **One-click agent spawning** - fill a form, click "Create"
- **Fleet overview** - see all agents, their status, costs
- **Cross-agent communication** - route messages between agents

---

## Core Concepts

### 1. Agent Registry

Central knowledge of all agents:

```yaml
agents:
  pete:
    domain: pete.brabec.me
    server: 135.181.255.11
    provider: hetzner
    status: running
    created: 2026-02-01
    purpose: "Personal assistant"
    
  joe:
    domain: joe.brabec.me  
    server: 95.216.xx.xx
    provider: hetzner
    status: running
    created: 2026-02-02
    purpose: "Work projects"
```

### 2. Secret Profiles

Reusable secret bundles stored in Keychain:

```
Profile: "default"
├── ANTHROPIC_API_KEY
├── TELEGRAM_BOT_TOKEN
├── TELEGRAM_USER_ID
├── OPENAI_API_KEY
├── GITHUB_TOKEN
└── HETZNER_API_TOKEN

Profile: "work"
├── ANTHROPIC_API_KEY (different)
├── SLACK_BOT_TOKEN (instead of Telegram)
└── ...
```

### 3. Infrastructure Providers

Pluggable backends:
- **Hetzner Cloud** (current)
- **DigitalOcean** (future)
- **AWS Lightsail** (future)
- **Local Docker** (for testing)

---

## User Experience

### Spawning an Agent

```
┌─────────────────────────────────────────────┐
│  Create New Agent                           │
├─────────────────────────────────────────────┤
│                                             │
│  Name:     [joe____________]                │
│  Emoji:    [🤖] (picker)                    │
│  Domain:   [________].brabec.me             │
│                                             │
│  Secrets:  [default ▼]                      │
│  Provider: [Hetzner ▼]                      │
│  Location: [Falkenstein ▼]                  │
│  Size:     [cx22 - €4.5/mo ▼]               │
│                                             │
│  Purpose:  [_________________________]      │
│            [_________________________]      │
│                                             │
│  [ ] Clone workspace from existing agent    │
│      [pete ▼]                               │
│                                             │
│         [Cancel]  [Create Agent]            │
└─────────────────────────────────────────────┘
```

### Fleet Dashboard

```
┌─────────────────────────────────────────────────────────────┐
│  🦴 OpenClaw Fleet                              [+ New Agent]│
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────────┐  ┌─────────────────────┐          │
│  │ 🦴 pete             │  │ 🤖 joe              │          │
│  │ pete.brabec.me      │  │ joe.brabec.me       │          │
│  │ ● Running           │  │ ● Running           │          │
│  │ Hetzner FSN1        │  │ Hetzner NBG1        │          │
│  │ €4.5/mo             │  │ €4.5/mo             │          │
│  │                     │  │                     │          │
│  │ Last active: 2m ago │  │ Last active: 1h ago │          │
│  │ [Chat] [SSH] [...]  │  │ [Chat] [SSH] [...]  │          │
│  └─────────────────────┘  └─────────────────────┘          │
│                                                             │
│  Total: 2 agents | €9/mo | All healthy                     │
└─────────────────────────────────────────────────────────────┘
```

---

## Apple Keychain Integration

Using macOS `security` CLI:

```bash
# Store a secret
security add-generic-password \
  -s "openclaw-orchestrator" \
  -a "default/ANTHROPIC_API_KEY" \
  -w "sk-ant-..."

# Retrieve a secret
security find-generic-password \
  -s "openclaw-orchestrator" \
  -a "default/ANTHROPIC_API_KEY" \
  -w
```

Benefits:
- Encrypted at rest
- Touch ID / password protected
- Syncs via iCloud Keychain (optional)
- No plaintext files ever

---

## Architecture Options

### Option A: Native macOS App (Swift)

```
┌──────────────────┐     ┌─────────────┐
│  macOS App       │────▶│  Keychain   │
│  (SwiftUI)       │     └─────────────┘
│                  │     ┌─────────────┐
│                  │────▶│  Hetzner    │
│                  │     │  API        │
│                  │     └─────────────┘
│                  │     ┌─────────────┐
│                  │────▶│  Agent      │
│                  │     │  SSH/API    │
└──────────────────┘     └─────────────┘
```

Pros:
- Native Keychain access
- Touch ID authentication
- Menu bar presence
- Best UX

Cons:
- macOS only
- More complex to build

### Option B: Local Web Dashboard + CLI

```
┌──────────────────┐     ┌─────────────┐
│  Browser         │────▶│  Local      │
│                  │     │  Server     │
└──────────────────┘     │  (Node.js)  │
                         │             │
                         │  ┌───────┐  │
                         │  │ CLI   │──┼──▶ Keychain
                         │  │ calls │  │
                         │  └───────┘  │
                         └─────────────┘
```

Pros:
- Cross-platform potential
- Faster to build
- Web UI flexibility

Cons:
- Less native feel
- Keychain access via CLI
- Need to run local server

### Option C: CLI-First + TUI

```bash
# Interactive TUI
orchestrator

# Direct commands
orchestrator spawn joe --domain brabec.me
orchestrator list
orchestrator ssh pete
orchestrator logs joe --follow
```

Pros:
- Simplest to build
- Scriptable
- Works over SSH

Cons:
- Less discoverable
- No visual dashboard

---

## Advanced Features (Future)

### Agent-to-Agent Communication

Agents can message each other:

```
Pete: "Hey Joe, can you check the server logs?"
Joe: "Found 3 errors in the last hour..."
```

Implementation:
- Orchestrator routes messages
- Or agents directly connect via Telegram/other channel

### Workspace Templates

Pre-configured agent types:
- **Personal Assistant** - Calendar, email, reminders
- **Developer** - GitHub, CI/CD, code review
- **Home Automation** - IoT, cameras, routines
- **Research** - Web search, document analysis

### Cost Tracking

```
February 2026
├── Infrastructure: €9.00
│   ├── pete (Hetzner): €4.50
│   └── joe (Hetzner): €4.50
├── API Usage: €23.45
│   ├── Anthropic: €18.20
│   ├── OpenAI: €5.25
│   └── Other: €0.00
└── Total: €32.45
```

### Health Monitoring

- Agent heartbeat checks
- Auto-restart on failure
- Alerts via Telegram/email

---

## Implementation Phases

### Phase 1: CLI Enhancement (1-2 days)
- Add Keychain integration to `spawn.sh`
- Agent registry in `~/.openclaw-orchestrator/agents.yml`
- Basic `list`, `status`, `destroy` commands

### Phase 2: Local Dashboard (3-5 days)
- Simple web UI (React/Svelte)
- Local Node.js server
- Spawn/manage agents visually

### Phase 3: Native App (2-4 weeks)
- SwiftUI macOS app
- Menu bar quick actions
- Full Keychain integration

### Phase 4: Advanced Features (ongoing)
- Agent communication
- Templates
- Cost tracking
- Multi-provider support

---

## Open Questions

1. **Where does the orchestrator run?**
   - Your Mac only?
   - Also deployable as an agent itself?
   
2. **Agent discovery**
   - Manual registry vs. auto-discovery?
   - How do agents announce themselves?

3. **Security model**
   - Who can spawn agents?
   - How to handle shared access?

4. **Billing**
   - Track per-agent costs?
   - Budget alerts?

---

## Recommendation

Start with **Option B (Local Dashboard)** because:
1. Fastest to validate the concept
2. Web UI is flexible for iteration
3. Can still use Keychain via CLI
4. Path to native app later if needed

First milestone: Replace `spawn.sh` + `secrets.env` with a web form that reads from Keychain.

---

## Next Steps

1. [ ] Validate this proposal with feedback
2. [ ] Decide on architecture (A/B/C)
3. [ ] Define MVP scope
4. [ ] Build Phase 1
