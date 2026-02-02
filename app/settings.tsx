import { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';

// Cross-platform alert
const showAlert = (title: string, message: string, buttons?: Array<{text: string, onPress?: () => void, style?: string}>) => {
  if (Platform.OS === 'web') {
    if (buttons && buttons.length > 1) {
      const confirmed = window.confirm(`${title}\n\n${message}`);
      if (confirmed && buttons[1]?.onPress) {
        buttons[1].onPress();
      }
    } else {
      window.alert(`${title}\n\n${message}`);
    }
  } else {
    const { Alert } = require('react-native');
    Alert.alert(title, message, buttons);
  }
};
import { useRouter } from 'expo-router';
import { useCredentialsStore } from '../src/store/credentials';

export default function SettingsScreen() {
  const router = useRouter();
  const { credentials, saveCredentials, isLoading } = useCredentialsStore();
  
  const [hetznerToken, setHetznerToken] = useState('');
  const [anthropicKey, setAnthropicKey] = useState('');
  const [telegramBotName, setTelegramBotName] = useState('');
  const [telegramBotToken, setTelegramBotToken] = useState('');
  
  useEffect(() => {
    if (credentials) {
      setHetznerToken(credentials.hetznerToken);
      setAnthropicKey(credentials.anthropicKey);
    }
  }, [credentials]);
  
  const handleSave = async () => {
    if (!hetznerToken.trim()) {
      showAlert('Error', 'Hetzner API token is required');
      return;
    }
    
    try {
      const bots = credentials?.telegramBots || [];
      
      // Add new bot if both fields are filled
      if (telegramBotName.trim() && telegramBotToken.trim()) {
        const existingIndex = bots.findIndex(b => b.name === telegramBotName.trim());
        if (existingIndex >= 0) {
          bots[existingIndex].token = telegramBotToken.trim();
        } else {
          bots.push({ name: telegramBotName.trim(), token: telegramBotToken.trim() });
        }
      }
      
      await saveCredentials({
        hetznerToken: hetznerToken.trim(),
        anthropicKey: anthropicKey.trim(),
        telegramBots: bots,
      });
      
      setTelegramBotName('');
      setTelegramBotToken('');
      
      router.back();
    } catch (error) {
      showAlert('Error', 'Failed to save credentials');
    }
  };
  
  const handleRemoveBot = (name: string) => {
    showAlert(
      'Remove Bot',
      `Remove ${name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Remove', 
          style: 'destructive',
          onPress: async () => {
            const bots = credentials?.telegramBots.filter(b => b.name !== name) || [];
            await saveCredentials({
              hetznerToken: credentials?.hetznerToken || '',
              anthropicKey: credentials?.anthropicKey || '',
              telegramBots: bots,
            });
          },
        },
      ]
    );
  };
  
  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Hetzner Cloud</Text>
          <Text style={styles.label}>API Token *</Text>
          <TextInput
            style={styles.input}
            value={hetznerToken}
            onChangeText={setHetznerToken}
            placeholder="Enter Hetzner API token"
            placeholderTextColor="#6b7280"
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
            testID="hetzner-token-input"
          />
          <Text style={styles.hint}>
            Create at: Hetzner Console → Project → Security → API Tokens
          </Text>
        </View>
        
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Anthropic (Claude)</Text>
          <Text style={styles.label}>API Key</Text>
          <TextInput
            style={styles.input}
            value={anthropicKey}
            onChangeText={setAnthropicKey}
            placeholder="Enter Anthropic API key (optional)"
            placeholderTextColor="#6b7280"
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
          />
          <Text style={styles.hint}>
            Used as default for new agents. Each agent can use its own key.
          </Text>
        </View>
        
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Telegram Bots</Text>
          
          {credentials?.telegramBots.map((bot) => (
            <View key={bot.name} style={styles.botItem}>
              <View>
                <Text style={styles.botName}>{bot.name}</Text>
                <Text style={styles.botToken}>
                  {bot.token.slice(0, 10)}...{bot.token.slice(-6)}
                </Text>
              </View>
              <TouchableOpacity onPress={() => handleRemoveBot(bot.name)}>
                <Text style={styles.removeButton}>✕</Text>
              </TouchableOpacity>
            </View>
          ))}
          
          <Text style={styles.label}>Add Bot</Text>
          <TextInput
            style={styles.input}
            value={telegramBotName}
            onChangeText={setTelegramBotName}
            placeholder="Bot name (e.g., Pete)"
            placeholderTextColor="#6b7280"
            autoCapitalize="none"
            autoCorrect={false}
          />
          <TextInput
            style={[styles.input, { marginTop: 8 }]}
            value={telegramBotToken}
            onChangeText={setTelegramBotToken}
            placeholder="Bot token from @BotFather"
            placeholderTextColor="#6b7280"
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
          />
          <Text style={styles.hint}>
            Create bot: Telegram → @BotFather → /newbot
          </Text>
        </View>
        
        <TouchableOpacity 
          style={[styles.saveButton, isLoading && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={isLoading}
          testID="save-button"
        >
          <Text style={styles.saveButtonText}>
            {isLoading ? 'Saving...' : 'Save'}
          </Text>
        </TouchableOpacity>
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
    marginBottom: 32,
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
  botItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#1f1f1f',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  botName: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  botToken: {
    color: '#6b7280',
    fontSize: 12,
    marginTop: 2,
  },
  removeButton: {
    color: '#f87171',
    fontSize: 18,
    padding: 8,
  },
  saveButton: {
    backgroundColor: '#3b82f6',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 32,
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
});
