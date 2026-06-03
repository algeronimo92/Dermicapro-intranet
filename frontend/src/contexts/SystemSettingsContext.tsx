import React, { createContext, useContext, useState, useEffect } from 'react';
import { settingsService, SystemSettings } from '../services/settings.service';

const DEFAULTS: SystemSettings = {
  session_timeout_minutes: '5',
};

interface SystemSettingsContextType {
  settings: SystemSettings;
  isLoading: boolean;
  updateSetting: (key: keyof SystemSettings, value: string) => Promise<void>;
  sessionTimeoutMs: number;
}

const SystemSettingsContext = createContext<SystemSettingsContextType | undefined>(undefined);

export const SystemSettingsProvider: React.FC<{ children: React.ReactNode; isAuthenticated: boolean }> = ({
  children,
  isAuthenticated,
}) => {
  const [settings, setSettings] = useState<SystemSettings>(DEFAULTS);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated) {
      setSettings(DEFAULTS);
      setIsLoading(false);
      return;
    }
    settingsService.getAll()
      .then(s => setSettings(s))
      .catch(() => setSettings(DEFAULTS))
      .finally(() => setIsLoading(false));
  }, [isAuthenticated]);

  const updateSetting = async (key: keyof SystemSettings, value: string) => {
    const updated = await settingsService.update(key, value);
    setSettings(prev => ({ ...prev, ...updated }));
  };

  const sessionTimeoutMs = Math.max(1, Number(settings.session_timeout_minutes)) * 60 * 1000;

  return (
    <SystemSettingsContext.Provider value={{ settings, isLoading, updateSetting, sessionTimeoutMs }}>
      {children}
    </SystemSettingsContext.Provider>
  );
};

export const useSystemSettings = () => {
  const ctx = useContext(SystemSettingsContext);
  if (!ctx) throw new Error('useSystemSettings must be used within SystemSettingsProvider');
  return ctx;
};
