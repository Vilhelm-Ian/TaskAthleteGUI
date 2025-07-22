// src/pages/Profile.jsx
import { h } from 'preact';
import { useState, useEffect, useCallback } from 'preact/hooks';
import { invoke } from '@tauri-apps/api/core';
import List from 'preact-material-components/List';
import Switch from 'preact-material-components/Switch';
import Select from 'preact-material-components/Select';

import 'preact-material-components/List/style.css';
import 'preact-material-components/Switch/style.css';
import 'preact-material-components/Select/style.css';

import { UserCircle2, Bell, Palette, Settings, Target, Weight, Repeat, Clock, Route, HelpCircle, Heart, ChevronRight, Sun, Moon, RefreshCw } from 'lucide-preact';

export const GUI_THEME_STORAGE_KEY = 'appGuiTheme';

export const AVAILABLE_THEMES = [
  { id: 'default-light', name: 'Default Light' },
  { id: 'default-dark', name: 'Default Dark' },
  { id: 'catppuccin-latte', name: 'Catppuccin Latte' },
  { id: 'catppuccin-mocha', name: 'Catppuccin Mocha' },
];

const SettingsItem = ({ icon: Icon, primary, secondary, actionComponent, onClick, className }) => (
   <List.Item onClick={onClick} className={`!py-3 !px-4 flex items-center justify-between w-full ${className || ''}`}>
       <div class="flex items-center flex-grow">
           {Icon && <Icon class="w-5 h-5 text-secondary mr-4 flex-shrink-0" strokeWidth={2} />}
           <List.TextContainer class="flex-grow">
               <List.PrimaryText class="text-sm font-medium text-primary">{primary}</List.PrimaryText>
               {secondary && <List.SecondaryText class="text-xs text-secondary">{secondary}</List.SecondaryText>}
           </List.TextContainer>
       </div>
       <div class="flex-shrink-0 ml-2">
        {actionComponent ? actionComponent : (onClick ? <ChevronRight class="w-4 h-4 text-secondary" strokeWidth={2} /> : null)}
       </div>
   </List.Item>
);

const Profile = () => {
  const [config, setConfig] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentGuiTheme, setCurrentGuiTheme] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(GUI_THEME_STORAGE_KEY) || AVAILABLE_THEMES[0].id;
    }
    return AVAILABLE_THEMES[0].id;
  });

  const [newBodyweight, setNewBodyweight] = useState('');
  const [addBodyweightMessage, setAddBodyweightMessage] = useState({ text: '', type: '' });
  
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState({ text: '', type: '' });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      AVAILABLE_THEMES.forEach(theme => document.documentElement.classList.remove(`theme-${theme.id}`));
      document.documentElement.classList.add(`theme-${currentGuiTheme}`);
      localStorage.setItem(GUI_THEME_STORAGE_KEY, currentGuiTheme);
    }
  }, [currentGuiTheme]);

  const fetchConfig = useCallback(async () => {
      try {
        setIsLoading(true);
        const fetchedConfig = await invoke('get_config');
        setConfig(fetchedConfig);
        setError('');
      } catch (err) {
        console.error("Failed to load config:", err);
        setError(`Failed to load config: ${err.toString()}`);
      } finally {
        setIsLoading(false);
      }
  }, []);

  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  const handleSettingChange = useCallback(async (command, payload, updateFn) => {
    try {
      await invoke(command, payload);
      setConfig(prevConfig => updateFn(prevConfig, payload));
      setError('');
    } catch (err) {
      console.error(`Failed to update setting (${command}):`, err);
      setError(`Failed to update ${command}: ${err.toString()}`);
    }
  }, []);

  const handleThemeChange = (event) => {
    setCurrentGuiTheme(AVAILABLE_THEMES[event.target.selectedIndex].id);
  };

  const handleAddBodyweightEntry = async () => {
    const weightVal = parseFloat(newBodyweight);
    if (!newBodyweight || isNaN(weightVal) || weightVal <= 0) {
      setAddBodyweightMessage({ text: 'Please enter a valid positive bodyweight.', type: 'error' });
      setTimeout(() => setAddBodyweightMessage({ text: '', type: '' }), 3000);
      return;
    }
    setAddBodyweightMessage({ text: '', type: '' });
    try {
      await invoke('add_bodyweight_entry', { weight: weightVal });
      setAddBodyweightMessage({ text: `Bodyweight ${weightVal} ${config.units === 'metric' ? 'kg' : 'lbs'} logged.`, type: 'success' });
      setNewBodyweight('');
      await fetchConfig(); // Re-fetch to update latest recorded weight display
    } catch (err) {
      console.error("Failed to add bodyweight entry:", err);
      setAddBodyweightMessage({ text: `Error: ${err.toString()}`, type: 'error' });
    }
    setTimeout(() => setAddBodyweightMessage({ text: '', type: '' }), 5000);
  };

  const handleSync = async () => {
    setIsSyncing(true);
    setSyncMessage({ text: 'Syncing...', type: 'info' });
    try {
        const result = await invoke('perform_sync', { serverUrlOverride: null });
        const { sent, received } = result;

        let summaryItems = [];
        if(sent.config) summaryItems.push("Config sent");
        if(sent.exercises > 0) summaryItems.push(`${sent.exercises} exercises sent`);
        if(sent.workouts > 0) summaryItems.push(`${sent.workouts} workouts sent`);
        if(sent.aliases > 0) summaryItems.push(`${sent.aliases} aliases sent`);
        if(sent.bodyweights > 0) summaryItems.push(`${sent.bodyweights} bodyweights sent`);
        
        if(received.config) summaryItems.push("Config received");
        if(received.exercises > 0) summaryItems.push(`${received.exercises} exercises received`);
        if(received.workouts > 0) summaryItems.push(`${received.workouts} workouts received`);
        if(received.aliases > 0) summaryItems.push(`${received.aliases} aliases received`);
        if(received.bodyweights > 0) summaryItems.push(`${received.bodyweights} bodyweights received`);

        const summaryText = summaryItems.length > 0 ? `Sync complete: ${summaryItems.join(', ')}.` : 'Sync complete. No changes detected.';
        
        setSyncMessage({ text: summaryText, type: 'success' });
        await fetchConfig(); // Refresh config to get new last_sync_timestamp
    } catch (err) {
        console.error("Sync failed:", err);
        setSyncMessage({ text: `Sync failed: ${err.toString()}`, type: 'error' });
    } finally {
        setIsSyncing(false);
        setTimeout(() => setSyncMessage({ text: '', type: '' }), 8000);
    }
  };

  if (isLoading) return <div class="p-4 text-primary">Loading settings...</div>;
  if (error) return <div class="p-4 text-error">Error: {error}</div>;
  if (!config) return <div class="p-4 text-primary">Configuration not available.</div>;

  const selectedThemeIndex = AVAILABLE_THEMES.findIndex(theme => theme.id === currentGuiTheme);

  return (
    <div class="flex flex-col sm:flex-row h-full gap-6 p-4 sm:p-6 bg-primary">
       <div class="flex-grow space-y-6">
            <div>
                <h3 class="text-xs uppercase text-secondary font-semibold mb-2 px-4 sm:px-0">App Preferences</h3>
                <List class="bg-secondary rounded-md border border-border-primary p-0">
                    <SettingsItem icon={Palette} primary="GUI Theme" actionComponent={<Select selectedIndex={selectedThemeIndex === -1 ? 0 : selectedThemeIndex} onChange={handleThemeChange} className="text-sm text-primary bg-input border-border-input rounded-md"> {AVAILABLE_THEMES.map(theme => (<Select.Item key={theme.id} value={theme.id}>{theme.name}</Select.Item>))} </Select>} />
                    <SettingsItem icon={Settings} primary="Measurement Units" actionComponent={<Select selectedIndex={config.units === 'metric' ? 0 : 1} onChange={(e) => handleSettingChange('set_units', { payload: { units: e.target.selectedIndex === 0 ? 'metric' : 'imperial' } }, (prev, p) => ({ ...prev, units: p.payload.units }))} className="text-sm text-primary bg-input border-border-input rounded-md"> <Select.Item>Metric (kg, km)</Select.Item> <Select.Item>Imperial (lbs, miles)</Select.Item> </Select>} />
                    <SettingsItem icon={Weight} primary="Prompt for Bodyweight" secondary="Ask for bodyweight before relevant workouts" actionComponent={<Switch class="scale-75" checked={config.prompt_for_bodyweight} onChange={() => handleSettingChange('set_bodyweight_prompt_enabled', { enabled: !config.prompt_for_bodyweight }, (prev, p) => ({...prev, prompt_for_bodyweight: p.enabled }))} />} />
                    <SettingsItem icon={Target} primary="Target Bodyweight" secondary={config.target_bodyweight ? `${config.target_bodyweight} ${config.units === 'metric' ? 'kg' : 'lbs'}` : "Not set"} actionComponent={<input type="number" placeholder="e.g., 70" step="0.1" defaultValue={config.target_bodyweight ?? ''} onBlur={(e) => { const v = e.target.value; const w = v === '' ? null : parseFloat(v); if (v === '' || (!isNaN(w) && w > 0)) handleSettingChange('set_target_bodyweight', { weight: w }, (prev, p) => ({...prev, target_bodyweight: p.weight })); else if (v !== '') alert("Invalid target bodyweight."); }} class="bg-input border border-border-input text-primary text-sm rounded-md p-2 w-24 text-right focus:ring-accent-primary focus:border-accent-primary" />} />
                    <SettingsItem icon={Repeat} primary="Streak Interval (Days)" secondary={`Workouts within ${config.streak_interval_days} day(s) count as a streak`} actionComponent={<input type="number" min="1" defaultValue={config.streak_interval_days} onBlur={(e) => { const d = parseInt(e.target.value, 10); if (!isNaN(d) && d >= 1) handleSettingChange('set_streak_interval', { days: d }, (prev, p) => ({...prev, streak_interval_days: p.days })); else alert("Streak interval must be at least 1 day."); }} class="bg-input border border-border-input text-primary text-sm rounded-md p-2 w-16 text-right focus:ring-accent-primary focus:border-accent-primary" />} />
                </List>
            </div>

            {/* Data Sync Section */}
            <div>
                <h3 class="text-xs uppercase text-secondary font-semibold mb-2 px-4 sm:px-0">Data Sync</h3>
                <div class="bg-secondary rounded-md border border-border-primary p-4 space-y-4">
                    <SettingsItem
                        icon={Settings}
                        primary="Sync Server URL"
                        secondary={config.sync_server_url || "Not set"}
                        actionComponent={
                            <input
                                type="url"
                                placeholder="http://127.0.0.1:3030"
                                defaultValue={config.sync_server_url || ''}
                                onBlur={(e) => {
                                    const newUrl = e.target.value.trim() === '' ? null : e.target.value.trim();
                                    if (newUrl !== config.sync_server_url) {
                                        handleSettingChange('set_sync_server_url', { url: newUrl }, (prev, p) => ({...prev, sync_server_url: p.url }));
                                    }
                                }}
                                class="bg-input border border-border-input text-primary text-sm rounded-md p-2 w-48 sm:w-64 text-right focus:ring-accent-primary focus:border-accent-primary"
                            />
                        }
                    />
                    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-border-secondary">
                        <p class="text-xs text-secondary flex-grow">
                            Last synced:
                            <span class="block sm:inline font-medium text-sm ml-0 sm:ml-1 text-primary">
                                {config.last_sync_timestamp ? new Date(config.last_sync_timestamp).toLocaleString() : 'Never'}
                            </span>
                        </p>
                        <button
                            onClick={handleSync}
                            disabled={isSyncing || !config.sync_server_url}
                            class="bg-accent-emphasis hover:bg-accent-emphasis-hover text-on-accent font-semibold py-2 px-4 rounded-md text-sm flex-shrink-0 transition-colors disabled:opacity-50 disabled:cursor-wait flex items-center justify-center"
                        >
                            <RefreshCw class={`w-4 h-4 mr-2 ${isSyncing ? 'animate-spin' : ''}`} />
                            {isSyncing ? 'Syncing...' : 'Sync Now'}
                        </button>
                    </div>
                    {syncMessage.text && (
                        <div class={`text-xs mt-1 text-center sm:text-left ${syncMessage.type === 'error' ? 'text-error' : syncMessage.type === 'success' ? 'text-accent-success' : 'text-secondary'}`}>
                            {syncMessage.text}
                        </div>
                    )}
                </div>
            </div>

            <div>
                <h3 class="text-xs uppercase text-secondary font-semibold mb-2 px-4 sm:px-0">Bodyweight Log</h3>
                <div class="bg-secondary rounded-md border border-border-primary p-4 space-y-3">
                    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <p class="text-xs text-secondary flex-grow">
                            Log your current bodyweight.
                            {config.current_bodyweight && <span class="block mt-1">Latest: {config.current_bodyweight} {config.units === 'metric' ? 'kg' : 'lbs'}</span>}
                        </p>
                    </div>
                    <div class="flex items-center gap-2 w-full">
                        <Weight class="w-5 h-5 text-secondary mr-2 flex-shrink-0" strokeWidth={2} />
                        <input type="number" placeholder={`New Bodyweight (${config.units === 'metric' ? 'kg' : 'lbs'})`} step="0.1" min="0" value={newBodyweight} onChange={(e) => setNewBodyweight(e.target.value)} class="bg-input border border-border-input text-primary text-sm rounded-md p-2 flex-grow focus:ring-accent-primary focus:border-accent-primary" />
                        <button onClick={handleAddBodyweightEntry} class="bg-accent-emphasis hover:bg-accent-emphasis-hover text-on-accent font-semibold py-2 px-4 rounded-md text-sm flex-shrink-0 transition-colors">Log Entry</button>
                    </div>
                    {addBodyweightMessage.text && <div class={`text-xs mt-2 ${addBodyweightMessage.type === 'error' ? 'text-error' : 'text-accent-success'}`}>{addBodyweightMessage.text}</div>}
                </div>
            </div>

            <div>
                <h3 class="text-xs uppercase text-secondary font-semibold mb-2 px-4 sm:px-0">Notifications</h3>
                <List class="bg-secondary rounded-md border border-border-primary p-0">
                    <SettingsItem icon={Bell} primary="Personal Best Notifications" secondary={config.pb_notifications.enabled === null ? "Prompt on first PB" : (config.pb_notifications.enabled ? "Enabled" : "Disabled")} actionComponent={<Switch class="scale-75" checked={config.pb_notifications.enabled === true} onChange={() => handleSettingChange('set_pb_notification_enabled', { enabled: config.pb_notifications.enabled !== true }, (prev, p) => ({ ...prev, pb_notifications: {...prev.pb_notifications, enabled: p.enabled }}))} />} />
                    {config.pb_notifications.enabled !== false && ( <>
                        <SettingsItem icon={Weight} primary="Notify for Weight PBs" className="!pl-12" actionComponent={<Switch class="scale-75" checked={config.pb_notifications.notify_weight} onChange={() => handleSettingChange('set_pb_notify_weight', { enabled: !config.pb_notifications.notify_weight }, (prev, p) => ({...prev, pb_notifications: {...prev.pb_notifications, notify_weight: p.enabled}}))} />} />
                        <SettingsItem icon={Repeat} primary="Notify for Reps PBs" className="!pl-12" actionComponent={<Switch class="scale-75" checked={config.pb_notifications.notify_reps} onChange={() => handleSettingChange('set_pb_notify_reps', { enabled: !config.pb_notifications.notify_reps }, (prev, p) => ({...prev, pb_notifications: {...prev.pb_notifications, notify_reps: p.enabled}}))} />} />
                        <SettingsItem icon={Clock} primary="Notify for Duration PBs" className="!pl-12" actionComponent={<Switch class="scale-75" checked={config.pb_notifications.notify_duration} onChange={() => handleSettingChange('set_pb_notify_duration', { enabled: !config.pb_notifications.notify_duration }, (prev, p) => ({...prev, pb_notifications: {...prev.pb_notifications, notify_duration: p.enabled}}))} />} />
                        <SettingsItem icon={Route} primary="Notify for Distance PBs" className="!pl-12" actionComponent={<Switch class="scale-75" checked={config.pb_notifications.notify_distance} onChange={() => handleSettingChange('set_pb_notify_distance', { enabled: !config.pb_notifications.notify_distance }, (prev, p) => ({...prev, pb_notifications: {...prev.pb_notifications, notify_distance: p.enabled}}))} />} />
                    </>)}
                </List>
            </div>

            <div>
                <h3 class="text-xs uppercase text-secondary font-semibold mb-2 px-4 sm:px-0">Support</h3>
                 <List class="bg-secondary rounded-md border border-border-primary p-0">
                    <SettingsItem icon={HelpCircle} primary="Help & FAQ" onClick={() => alert("Help & FAQ clicked (not implemented)")} />
                    <SettingsItem icon={Heart} primary="Rate App" onClick={() => alert("Rate App clicked (not implemented)")} />
                 </List>
            </div>
       </div>
    </div>
  );
};

export default Profile;
