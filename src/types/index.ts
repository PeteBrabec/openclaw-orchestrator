// Credentials stored in secure storage
export interface Credentials {
  hetznerToken: string;
  anthropicKey: string;
  telegramBots: TelegramBot[];
}

export interface TelegramBot {
  name: string;
  token: string;
}

// Agent data from Hetzner + discovery
export interface Agent {
  // From Hetzner API
  serverId: number;
  name: string;
  ip: string | null;
  status: 'running' | 'off' | 'starting' | 'stopping' | 'migrating' | 'rebuilding' | 'deleting' | 'unknown';
  created: string;
  datacenter: string;
  serverType: string;
  labels: Record<string, string>;
  
  // From /.well-known/openclaw.json (optional, fetched separately)
  openclaw?: OpenClawStatus;
}

export interface OpenClawStatus {
  name: string;
  version: string;
  status: 'running' | 'starting' | 'error';
  channels: string[];
  telegramBot?: string;
  uptime?: number;
}

// Hetzner API types
export interface HetznerServer {
  id: number;
  name: string;
  status: string;
  public_net: {
    ipv4: {
      ip: string;
    } | null;
    ipv6: {
      ip: string;
    } | null;
  };
  created: string;
  datacenter: {
    name: string;
    description: string;
  };
  server_type: {
    name: string;
    description: string;
  };
  labels: Record<string, string>;
}

export interface HetznerServerListResponse {
  servers: HetznerServer[];
}

// Spawn form data
export interface SpawnFormData {
  name: string;
  region: 'fsn1' | 'nbg1' | 'hel1';
  size: 'cx22' | 'cx32' | 'cx42';
  anthropicKey: string;
  telegramBotToken?: string;
}
