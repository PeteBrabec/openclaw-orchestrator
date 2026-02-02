import { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAgentsStore } from '../../src/store/agents';

export default function AgentDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { agents, rebootAgent, destroyAgent, fetchAgents } = useAgentsStore();
  const [isRebooting, setIsRebooting] = useState(false);
  const [isDestroying, setIsDestroying] = useState(false);
  
  const agent = agents.find(a => String(a.serverId) === id);
  
  useEffect(() => {
    if (!agent) {
      fetchAgents();
    }
  }, [id]);
  
  if (!agent) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#fff" />
      </View>
    );
  }
  
  const statusColor = {
    running: '#4ade80',
    off: '#6b7280',
    starting: '#fbbf24',
    stopping: '#f87171',
    migrating: '#60a5fa',
    rebuilding: '#a78bfa',
    deleting: '#f87171',
    unknown: '#6b7280',
  }[agent.status] || '#6b7280';
  
  const handleReboot = () => {
    Alert.alert(
      'Reboot Agent',
      `Are you sure you want to reboot ${agent.name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reboot',
          onPress: async () => {
            setIsRebooting(true);
            try {
              await rebootAgent(agent.serverId);
              Alert.alert('Success', 'Agent is rebooting');
            } catch (error) {
              Alert.alert('Error', error instanceof Error ? error.message : 'Failed to reboot');
            } finally {
              setIsRebooting(false);
            }
          },
        },
      ]
    );
  };
  
  const handleDestroy = () => {
    Alert.alert(
      'Destroy Agent',
      `Are you sure you want to permanently destroy ${agent.name}? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Destroy',
          style: 'destructive',
          onPress: async () => {
            setIsDestroying(true);
            try {
              await destroyAgent(agent.serverId);
              Alert.alert('Success', 'Agent destroyed', [
                { text: 'OK', onPress: () => router.back() },
              ]);
            } catch (error) {
              Alert.alert('Error', error instanceof Error ? error.message : 'Failed to destroy');
              setIsDestroying(false);
            }
          },
        },
      ]
    );
  };
  
  const handleOpenTelegram = () => {
    if (agent.openclaw?.telegramBot) {
      const username = agent.openclaw.telegramBot.replace('@', '');
      Linking.openURL(`https://t.me/${username}`);
    }
  };
  
  const formatUptime = (seconds: number): string => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    
    if (days > 0) return `${days}d ${hours}h`;
    if (hours > 0) return `${hours}h ${mins}m`;
    return `${mins}m`;
  };
  
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.name}>{agent.name}</Text>
        <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
          <Text style={styles.statusText}>{agent.status}</Text>
        </View>
      </View>
      
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Infrastructure</Text>
        <InfoRow label="Server ID" value={String(agent.serverId)} />
        <InfoRow label="IP Address" value={agent.ip || 'Pending...'} />
        <InfoRow label="Datacenter" value={agent.datacenter} />
        <InfoRow label="Type" value={agent.serverType} />
        <InfoRow label="Created" value={new Date(agent.created).toLocaleString()} />
      </View>
      
      {agent.openclaw && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>OpenClaw</Text>
          <InfoRow label="Version" value={agent.openclaw.version} />
          <InfoRow label="Status" value={agent.openclaw.status} />
          <InfoRow label="Channels" value={agent.openclaw.channels.join(', ') || 'None'} />
          {agent.openclaw.uptime !== undefined && (
            <InfoRow label="Uptime" value={formatUptime(agent.openclaw.uptime)} />
          )}
          {agent.openclaw.telegramBot && (
            <TouchableOpacity onPress={handleOpenTelegram}>
              <InfoRow 
                label="Telegram" 
                value={agent.openclaw.telegramBot} 
                valueStyle={styles.link}
              />
            </TouchableOpacity>
          )}
        </View>
      )}
      
      {!agent.openclaw && agent.status === 'running' && agent.ip && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>OpenClaw</Text>
          <Text style={styles.noDataText}>
            Waiting for agent to come online...
          </Text>
          <Text style={styles.hint}>
            Discovery endpoint: https://{agent.ip}/.well-known/openclaw.json
          </Text>
        </View>
      )}
      
      <View style={styles.actions}>
        <TouchableOpacity 
          style={[styles.actionButton, styles.rebootButton]}
          onPress={handleReboot}
          disabled={isRebooting || agent.status !== 'running'}
        >
          {isRebooting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.actionButtonText}>🔄 Reboot</Text>
          )}
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.actionButton, styles.destroyButton]}
          onPress={handleDestroy}
          disabled={isDestroying}
        >
          {isDestroying ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.actionButtonText}>🗑️ Destroy</Text>
          )}
        </TouchableOpacity>
      </View>
      
      {agent.ip && (
        <Text style={styles.sshHint}>
          SSH: ssh root@{agent.ip}
        </Text>
      )}
    </ScrollView>
  );
}

function InfoRow({ 
  label, 
  value, 
  valueStyle,
}: { 
  label: string; 
  value: string;
  valueStyle?: object;
}) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={[styles.infoValue, valueStyle]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#111',
  },
  content: {
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#111',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  name: {
    color: '#fff',
    fontSize: 28,
    fontWeight: 'bold',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  card: {
    backgroundColor: '#1f1f1f',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  cardTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  infoLabel: {
    color: '#9ca3af',
    fontSize: 14,
  },
  infoValue: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  link: {
    color: '#3b82f6',
  },
  noDataText: {
    color: '#9ca3af',
    fontSize: 14,
  },
  hint: {
    color: '#6b7280',
    fontSize: 12,
    marginTop: 8,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  actionButton: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  rebootButton: {
    backgroundColor: '#3b82f6',
  },
  destroyButton: {
    backgroundColor: '#dc2626',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  sshHint: {
    color: '#6b7280',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 16,
    fontFamily: 'monospace',
  },
});
