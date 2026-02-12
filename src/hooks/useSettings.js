import { useState, useEffect } from 'react';

const SETTINGS_KEY = 'pricing-studio-settings';
const DEFAULT_SETTINGS = {
  rate: 175,
  minProject: 1750,
  landingPagePrice: 700,
  showInternalCosts: false,
};

export function useSettings() {
  const [settings, setSettings] = useState(() => {
    // Load from localStorage immediately
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem(SETTINGS_KEY);
        return stored ? JSON.parse(stored) : DEFAULT_SETTINGS;
      } catch {
        return DEFAULT_SETTINGS;
      }
    }
    return DEFAULT_SETTINGS;
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch from server on mount
  useEffect(() => {
    async function fetchSettings() {
      try {
        const res = await fetch('/api/settings');
        if (!res.ok) throw new Error('Failed to fetch settings');

        const { settings: serverSettings } = await res.json();

        // Update both state and localStorage
        setSettings(serverSettings);
        localStorage.setItem(SETTINGS_KEY, JSON.stringify(serverSettings));
        setError(null);
      } catch (err) {
        console.error('Failed to sync settings:', err);
        setError('Using offline data');
      } finally {
        setLoading(false);
      }
    }

    fetchSettings();
  }, []);

  // Auto-sync to localStorage on changes
  useEffect(() => {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  }, [settings]);

  const updateSettings = async (updates) => {
    // Optimistic update
    setSettings(prev => ({ ...prev, ...updates }));

    // Sync to server
    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });

      if (!res.ok) throw new Error('Failed to update settings');

      const { settings: updatedSettings } = await res.json();
      setSettings(updatedSettings);
      setError(null);
    } catch (err) {
      console.error('Failed to update settings:', err);
      setError('Updated locally only');
    }
  };

  return {
    settings,
    setSettings, // For bulk updates
    updateSettings,
    loading,
    error,
  };
}
