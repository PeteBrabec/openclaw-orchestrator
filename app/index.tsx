import { useEffect, useCallback } from 'react';
import { 
  View, 
  Text, 
  FlatList, 
  TouchableOpacity, 
  RefreshControl,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { Link, useRouter } from 'expo-router';
import { useCredentialsStore } from '../src/store/credentials';
import { useAgentsStore } from '../src/store/agents';
import { Agent } from '../src/types';

function AgentCard({ agent }: { agent: Agent }) {
  const router = useRouter();
  
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
  
  return (
    <TouchableOpacity 
      style={styles.card}
      onPress={() => router.push(`/agent/${agent.serverId}`)}
    >
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle}>{agent.name}</Text>
        <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
      </View>
      
      <Text style={styles.cardSubtitle}>
        {agent.ip || 'No IP'} • {agent.datacenter} • {agent.serverType}
      </Text>
      
      {agent.openclaw && (
        <View style={styles.openclawInfo}>
          <Text style={styles.openclawText}>
            OpenClaw {agent.openclaw.version} • {agent.openclaw.status}
          </Text>
          {agent.openclaw.telegramBot && (
            <Text style={styles.openclawText}>
              {agent.openclaw.telegramBot}
            </Text>
          )}
        </View>
      )}
    </TouchableOpacity>
  );
}

function SetupPrompt() {
  const router = useRouter();
  
  return (
    <View style={styles.setupContainer}>
      <Text style={styles.setupTitle}>Welcome to Hedz 🗣️</Text>
      <Text style={styles.setupText}>
        Configure your Hetzner API token to get started.
      </Text>
      <TouchableOpacity 
        style={styles.setupButton}
        onPress={() => router.push('/settings')}
      >
        <Text style={styles.setupButtonText}>Configure</Text>
      </TouchableOpacity>
    </View>
  );
}

function EmptyState() {
  const router = useRouter();
  
  return (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyTitle}>No agents yet</Text>
      <Text style={styles.emptyText}>
        Spawn your first agent to get started.
      </Text>
      <TouchableOpacity 
        style={styles.setupButton}
        onPress={() => router.push('/spawn')}
      >
        <Text style={styles.setupButtonText}>Spawn Agent</Text>
      </TouchableOpacity>
    </View>
  );
}

export default function AgentListScreen() {
  const router = useRouter();
  const { credentials, isInitialized } = useCredentialsStore();
  const { agents, isLoading, error, fetchAgents } = useAgentsStore();
  
  const hasCredentials = credentials?.hetznerToken;
  
  useEffect(() => {
    if (hasCredentials) {
      fetchAgents();
    }
  }, [hasCredentials]);
  
  const onRefresh = useCallback(() => {
    if (hasCredentials) {
      fetchAgents();
    }
  }, [hasCredentials]);
  
  if (!isInitialized) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#fff" />
      </View>
    );
  }
  
  if (!hasCredentials) {
    return <SetupPrompt />;
  }
  
  return (
    <View style={styles.container}>
      {error && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}
      
      <FlatList
        data={agents}
        keyExtractor={(item) => String(item.serverId)}
        renderItem={({ item }) => <AgentCard agent={item} />}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={onRefresh}
            tintColor="#fff"
          />
        }
        ListEmptyComponent={!isLoading ? <EmptyState /> : null}
        contentContainerStyle={agents.length === 0 ? styles.emptyList : styles.list}
      />
      
      <TouchableOpacity 
        style={styles.fab}
        onPress={() => router.push('/spawn')}
      >
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>
      
      <TouchableOpacity 
        style={styles.settingsButton}
        onPress={() => router.push('/settings')}
      >
        <Text style={styles.settingsText}>⚙️</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#111',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#111',
  },
  list: {
    padding: 16,
  },
  emptyList: {
    flex: 1,
  },
  card: {
    backgroundColor: '#1f1f1f',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  cardTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  cardSubtitle: {
    color: '#9ca3af',
    fontSize: 14,
  },
  openclawInfo: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#333',
  },
  openclawText: {
    color: '#4ade80',
    fontSize: 12,
  },
  setupContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    backgroundColor: '#111',
  },
  setupTitle: {
    color: '#fff',
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  setupText: {
    color: '#9ca3af',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 24,
  },
  setupButton: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
  },
  setupButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyTitle: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '600',
    marginBottom: 8,
  },
  emptyText: {
    color: '#9ca3af',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 24,
  },
  errorBanner: {
    backgroundColor: '#7f1d1d',
    padding: 12,
  },
  errorText: {
    color: '#fca5a5',
    textAlign: 'center',
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#3b82f6',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  fabText: {
    color: '#fff',
    fontSize: 28,
    fontWeight: '300',
  },
  settingsButton: {
    position: 'absolute',
    bottom: 24,
    left: 24,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#333',
    justifyContent: 'center',
    alignItems: 'center',
  },
  settingsText: {
    fontSize: 20,
  },
});
