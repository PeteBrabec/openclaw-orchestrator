import { create } from 'zustand';
import { Agent, HetznerServer, HetznerServerListResponse, OpenClawStatus, SpawnFormData } from '../types';
import { useCredentialsStore } from './credentials';

const HETZNER_API = 'https://api.hetzner.cloud/v1';

interface AgentsState {
  agents: Agent[];
  isLoading: boolean;
  error: string | null;
  
  // Actions
  fetchAgents: () => Promise<void>;
  fetchAgentStatus: (agent: Agent) => Promise<OpenClawStatus | null>;
  spawnAgent: (data: SpawnFormData) => Promise<void>;
  rebootAgent: (serverId: number) => Promise<void>;
  destroyAgent: (serverId: number) => Promise<void>;
}

function mapHetznerServer(server: HetznerServer): Agent {
  return {
    serverId: server.id,
    name: server.labels['openclaw-name'] || server.name,
    ip: server.public_net.ipv4?.ip || null,
    status: server.status as Agent['status'],
    created: server.created,
    datacenter: server.datacenter.name,
    serverType: server.server_type.name,
    labels: server.labels,
  };
}

export const useAgentsStore = create<AgentsState>((set, get) => ({
  agents: [],
  isLoading: false,
  error: null,
  
  fetchAgents: async () => {
    const token = useCredentialsStore.getState().credentials?.hetznerToken;
    if (!token) {
      set({ error: 'No Hetzner token configured' });
      return;
    }
    
    set({ isLoading: true, error: null });
    
    try {
      const response = await fetch(`${HETZNER_API}/servers?label_selector=openclaw=true`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      if (!response.ok) {
        throw new Error(`Hetzner API error: ${response.status}`);
      }
      
      const data: HetznerServerListResponse = await response.json();
      const agents = data.servers.map(mapHetznerServer);
      
      // Fetch OpenClaw status for each agent
      const agentsWithStatus = await Promise.all(
        agents.map(async (agent) => {
          if (agent.ip && agent.status === 'running') {
            const openclaw = await get().fetchAgentStatus(agent);
            return { ...agent, openclaw: openclaw || undefined };
          }
          return agent;
        })
      );
      
      set({ agents: agentsWithStatus });
    } catch (error) {
      console.error('Failed to fetch agents:', error);
      set({ error: error instanceof Error ? error.message : 'Unknown error' });
    } finally {
      set({ isLoading: false });
    }
  },
  
  fetchAgentStatus: async (agent: Agent): Promise<OpenClawStatus | null> => {
    if (!agent.ip) return null;
    
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      const response = await fetch(`https://${agent.ip}/.well-known/openclaw.json`, {
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) return null;
      return await response.json();
    } catch {
      // Agent might not have the endpoint yet or be unreachable
      return null;
    }
  },
  
  spawnAgent: async (data: SpawnFormData) => {
    const token = useCredentialsStore.getState().credentials?.hetznerToken;
    if (!token) {
      throw new Error('No Hetzner token configured');
    }
    
    set({ isLoading: true, error: null });
    
    try {
      // Build cloud-init user-data
      const cloudInit = buildCloudInit(data);
      
      const response = await fetch(`${HETZNER_API}/servers`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: data.name.toLowerCase().replace(/[^a-z0-9-]/g, '-'),
          server_type: data.size,
          location: data.region,
          image: 'ubuntu-24.04',
          labels: {
            'openclaw': 'true',
            'openclaw-name': data.name,
          },
          user_data: cloudInit,
          start_after_create: true,
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || `Hetzner API error: ${response.status}`);
      }
      
      // Refresh agent list
      await get().fetchAgents();
    } catch (error) {
      console.error('Failed to spawn agent:', error);
      set({ error: error instanceof Error ? error.message : 'Unknown error' });
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },
  
  rebootAgent: async (serverId: number) => {
    const token = useCredentialsStore.getState().credentials?.hetznerToken;
    if (!token) {
      throw new Error('No Hetzner token configured');
    }
    
    const response = await fetch(`${HETZNER_API}/servers/${serverId}/actions/reboot`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
    
    if (!response.ok) {
      throw new Error(`Failed to reboot: ${response.status}`);
    }
    
    await get().fetchAgents();
  },
  
  destroyAgent: async (serverId: number) => {
    const token = useCredentialsStore.getState().credentials?.hetznerToken;
    if (!token) {
      throw new Error('No Hetzner token configured');
    }
    
    const response = await fetch(`${HETZNER_API}/servers/${serverId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
    
    if (!response.ok) {
      throw new Error(`Failed to destroy: ${response.status}`);
    }
    
    // Remove from local state immediately
    set({ agents: get().agents.filter(a => a.serverId !== serverId) });
  },
}));

function buildCloudInit(data: SpawnFormData): string {
  // Minimal cloud-init that installs OpenClaw
  // This will be expanded with the full cloud-init from openclaw-spawn
  return `#cloud-config
package_update: true
package_upgrade: true

packages:
  - docker.io
  - docker-compose

runcmd:
  - systemctl enable docker
  - systemctl start docker
  - |
    # Clone OpenClaw spawn repo and run setup
    git clone https://github.com/PeteBrabec/openclaw-spawn.git /opt/openclaw-spawn
    cd /opt/openclaw-spawn
    
    # Create secrets.env
    cat > secrets.env << 'SECRETS_EOF'
    ANTHROPIC_API_KEY=${data.anthropicKey}
    ${data.telegramBotToken ? `TELEGRAM_BOT_TOKEN=${data.telegramBotToken}` : ''}
    AGENT_NAME=${data.name}
    SECRETS_EOF
    
    # Run spawn script
    bash spawn.sh
`;
}
