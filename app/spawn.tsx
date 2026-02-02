import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useCredentialsStore } from '../src/store/credentials';
import { useAgentsStore } from '../src/store/agents';
import { SpawnFormData } from '../src/types';

const REGIONS = [
  { value: 'fsn1', label: 'Falkenstein 🇩🇪' },
  { value: 'nbg1', label: 'Nuremberg 🇩🇪' },
  { value: 'hel1', label: 'Helsinki 🇫🇮' },
] as const;

const SIZES = [
  { value: 'cx22', label: 'CX22 (2 vCPU, 4GB RAM) ~€4/mo' },
  { value: 'cx32', label: 'CX32 (4 vCPU, 8GB RAM) ~€8/mo' },
  { value: 'cx42', label: 'CX42 (8 vCPU, 16GB RAM) ~€15/mo' },
] as const;

export default function SpawnScreen() {
  const router = useRouter();
  const credentials = useCredentialsStore((s) => s.credentials);
  const spawnAgent = useAgentsStore((s) => s.spawnAgent);
  
  const [name, setName] = useState('');
  const [region, setRegion] = useState<SpawnFormData['region']>('fsn1');
  const [size, setSize] = useState<SpawnFormData['size']>('cx22');
  const [anthropicKey, setAnthropicKey] = useState(credentials?.anthropicKey || '');
  const [telegramBotToken, setTelegramBotToken] = useState('');
  const [selectedBot, setSelectedBot] = useState<string | null>(null);
  const [isSpawning, setIsSpawning] = useState(false);
  
  const handleSelectBot = (botName: string) => {
    const bot = credentials?.telegramBots.find(b => b.name === botName);
    if (bot) {
      setSelectedBot(botName);
      setTelegramBotToken(bot.token);
      if (!name) {
        setName(botName);
      }
    }
  };
  
  const handleSpawn = async () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Agent name is required');
      return;
    }
    
    if (!anthropicKey.trim()) {
      Alert.alert('Error', 'Anthropic API key is required');
      return;
    }
    
    setIsSpawning(true);
    
    try {
      await spawnAgent({
        name: name.trim(),
        region,
        size,
        anthropicKey: anthropicKey.trim(),
        telegramBotToken: telegramBotToken.trim() || undefined,
      });
      
      Alert.alert(
        'Agent Spawning',
        `${name} is being created. It may take 2-3 minutes to become available.`,
        [{ text: 'OK', onPress: () => router.back() }]
      );
    } catch (error) {
      Alert.alert('Error', error instanceof Error ? error.message : 'Failed to spawn agent');
    } finally {
      setIsSpawning(false);
    }
  };
  
  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Agent Identity</Text>
          <Text style={styles.label}>Name *</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="e.g., Pete, Alice, Bob"
            placeholderTextColor="#6b7280"
            autoCapitalize="words"
            autoCorrect={false}
          />
        </View>
        
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Infrastructure</Text>
          
          <Text style={styles.label}>Region</Text>
          <View style={styles.optionGroup}>
            {REGIONS.map((r) => (
              <TouchableOpacity
                key={r.value}
                style={[
                  styles.option,
                  region === r.value && styles.optionSelected,
                ]}
                onPress={() => setRegion(r.value)}
              >
                <Text style={[
                  styles.optionText,
                  region === r.value && styles.optionTextSelected,
                ]}>
                  {r.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          
          <Text style={[styles.label, { marginTop: 16 }]}>Size</Text>
          <View style={styles.optionGroup}>
            {SIZES.map((s) => (
              <TouchableOpacity
                key={s.value}
                style={[
                  styles.option,
                  size === s.value && styles.optionSelected,
                ]}
                onPress={() => setSize(s.value)}
              >
                <Text style={[
                  styles.optionText,
                  size === s.value && styles.optionTextSelected,
                ]}>
                  {s.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
        
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>API Keys</Text>
          
          <Text style={styles.label}>Anthropic API Key *</Text>
          <TextInput
            style={styles.input}
            value={anthropicKey}
            onChangeText={setAnthropicKey}
            placeholder="sk-ant-..."
            placeholderTextColor="#6b7280"
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>
        
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Telegram (Optional)</Text>
          
          {credentials?.telegramBots && credentials.telegramBots.length > 0 && (
            <>
              <Text style={styles.label}>Select Saved Bot</Text>
              <View style={styles.optionGroup}>
                {credentials.telegramBots.map((bot) => (
                  <TouchableOpacity
                    key={bot.name}
                    style={[
                      styles.option,
                      selectedBot === bot.name && styles.optionSelected,
                    ]}
                    onPress={() => handleSelectBot(bot.name)}
                  >
                    <Text style={[
                      styles.optionText,
                      selectedBot === bot.name && styles.optionTextSelected,
                    ]}>
                      {bot.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              <Text style={styles.orDivider}>or</Text>
            </>
          )}
          
          <Text style={styles.label}>Bot Token</Text>
          <TextInput
            style={styles.input}
            value={telegramBotToken}
            onChangeText={(text) => {
              setTelegramBotToken(text);
              setSelectedBot(null);
            }}
            placeholder="123456:ABC-DEF..."
            placeholderTextColor="#6b7280"
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
          />
          <Text style={styles.hint}>
            Leave empty to spawn without Telegram integration
          </Text>
        </View>
        
        <TouchableOpacity 
          style={[styles.spawnButton, isSpawning && styles.spawnButtonDisabled]}
          onPress={handleSpawn}
          disabled={isSpawning}
        >
          {isSpawning ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.spawnButtonText}>🚀 Spawn Agent</Text>
          )}
        </TouchableOpacity>
        
        <Text style={styles.costHint}>
          Estimated cost: ~€4-15/month depending on size
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#111',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 16,
  },
  label: {
    color: '#9ca3af',
    fontSize: 14,
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#1f1f1f',
    borderRadius: 8,
    padding: 16,
    color: '#fff',
    fontSize: 16,
  },
  hint: {
    color: '#6b7280',
    fontSize: 12,
    marginTop: 8,
  },
  optionGroup: {
    gap: 8,
  },
  option: {
    backgroundColor: '#1f1f1f',
    borderRadius: 8,
    padding: 12,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  optionSelected: {
    borderColor: '#3b82f6',
    backgroundColor: '#1e3a5f',
  },
  optionText: {
    color: '#9ca3af',
    fontSize: 14,
  },
  optionTextSelected: {
    color: '#fff',
  },
  orDivider: {
    color: '#6b7280',
    textAlign: 'center',
    marginVertical: 12,
  },
  spawnButton: {
    backgroundColor: '#22c55e',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 16,
  },
  spawnButtonDisabled: {
    opacity: 0.5,
  },
  spawnButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  costHint: {
    color: '#6b7280',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 12,
    marginBottom: 32,
  },
});
