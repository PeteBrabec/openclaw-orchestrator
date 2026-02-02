import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import { Credentials, TelegramBot } from '../types';

const CREDENTIALS_KEY = 'hedz_credentials';

interface CredentialsState {
  credentials: Credentials | null;
  isLoading: boolean;
  isInitialized: boolean;
  
  // Actions
  loadCredentials: () => Promise<void>;
  saveCredentials: (credentials: Credentials) => Promise<void>;
  updateHetznerToken: (token: string) => Promise<void>;
  updateAnthropicKey: (key: string) => Promise<void>;
  addTelegramBot: (bot: TelegramBot) => Promise<void>;
  removeTelegramBot: (name: string) => Promise<void>;
  clearCredentials: () => Promise<void>;
}

export const useCredentialsStore = create<CredentialsState>((set, get) => ({
  credentials: null,
  isLoading: false,
  isInitialized: false,
  
  loadCredentials: async () => {
    set({ isLoading: true });
    try {
      const stored = await SecureStore.getItemAsync(CREDENTIALS_KEY);
      if (stored) {
        const credentials = JSON.parse(stored) as Credentials;
        set({ credentials, isInitialized: true });
      } else {
        set({ credentials: null, isInitialized: true });
      }
    } catch (error) {
      console.error('Failed to load credentials:', error);
      set({ credentials: null, isInitialized: true });
    } finally {
      set({ isLoading: false });
    }
  },
  
  saveCredentials: async (credentials: Credentials) => {
    set({ isLoading: true });
    try {
      await SecureStore.setItemAsync(CREDENTIALS_KEY, JSON.stringify(credentials));
      set({ credentials });
    } catch (error) {
      console.error('Failed to save credentials:', error);
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },
  
  updateHetznerToken: async (token: string) => {
    const current = get().credentials || { hetznerToken: '', anthropicKey: '', telegramBots: [] };
    await get().saveCredentials({ ...current, hetznerToken: token });
  },
  
  updateAnthropicKey: async (key: string) => {
    const current = get().credentials || { hetznerToken: '', anthropicKey: '', telegramBots: [] };
    await get().saveCredentials({ ...current, anthropicKey: key });
  },
  
  addTelegramBot: async (bot: TelegramBot) => {
    const current = get().credentials || { hetznerToken: '', anthropicKey: '', telegramBots: [] };
    const bots = [...current.telegramBots.filter(b => b.name !== bot.name), bot];
    await get().saveCredentials({ ...current, telegramBots: bots });
  },
  
  removeTelegramBot: async (name: string) => {
    const current = get().credentials;
    if (!current) return;
    const bots = current.telegramBots.filter(b => b.name !== name);
    await get().saveCredentials({ ...current, telegramBots: bots });
  },
  
  clearCredentials: async () => {
    try {
      await SecureStore.deleteItemAsync(CREDENTIALS_KEY);
      set({ credentials: null });
    } catch (error) {
      console.error('Failed to clear credentials:', error);
      throw error;
    }
  },
}));
