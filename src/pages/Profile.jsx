import { h } from 'preact';
import { useState, useEffect, useCallback } from 'preact/hooks';
import { invoke } from '@tauri-apps/api/core';
import List from 'preact-material-components/List';
import Switch from 'preact-material-components/Switch';
import Select from 'preact-material-components/Select';

import 'preact-material-components/List/style.css';
import 'preact-material-components/Switch/style.css';
import 'preact-material-components/Select/style.css';
// import 'preact-material-components/Menu/style.css'; // May be needed by Select

import { UserCircle2, Bell, Palette, Settings, Target, Weight, Repeat, Clock, Route, HelpCircle, Heart, ChevronRight, Sun, Moon } from 'lucide-preact'; // Added Sun, Moon

export const GUI_THEME_STORAGE_KEY = 'appGuiTheme';

// Define your themes
export const AVAILABLE_THEMES = [
  { id: 'default-light', name: 'Default Light' },
  { id: 'default-dark', name: 'Default Dark' },
  { id: 'catppuccin-latte', name: 'Catppuccin Latte' },
  { id: 'catppuccin-mocha', name: 'Catppuccin Mocha' },
  // Add more themes here e.g. { id: 'nord', name: 'Nord Theme' },
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

  // Apply GUI theme to HTML element
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Remove all theme-prefixed classes
      AVAILABLE_THEMES.forEach(theme => document.documentElement.classList.remove(`theme-${theme.id}`));
      // Add current theme class
      document.documentElement.classList.add(`theme-${currentGuiTheme}`);
      localStorage.setItem(GUI_THEME_STORAGE_KEY, currentGuiTheme);
    }
  }, [currentGuiTheme]);

  // Fetch backend config
  useEffect(() => {
    const loadConfig = async () => {
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
    };
    loadConfig();
  }, []);

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


  if (isLoading) {
    return <div class="p-4 text-primary">Loading settings...</div>;
  }
  if (error) {
    return <div class="p-4 text-error">Error: {error}</div>;
  }
  if (!config) {
    return <div class="p-4 text-primary">Configuration not available.</div>;
  }

  const selectedThemeIndex = AVAILABLE_THEMES.findIndex(theme => theme.id === currentGuiTheme);

  return (
    <div class="flex flex-col sm:flex-row h-full gap-6 p-4 sm:p-6 bg-primary">
       <div class="flex-grow space-y-6">
             {/* App Preferences Section */}
            <div>
                <h3 class="text-xs uppercase text-secondary font-semibold mb-2 px-4 sm:px-0">App Preferences</h3>
                <List class="bg-secondary rounded-md border border-border-primary p-0">
                    <SettingsItem
                        icon={Palette}
                        primary="GUI Theme"
                        actionComponent={
                           <Select
                                selectedIndex={selectedThemeIndex === -1 ? 0 : selectedThemeIndex}
                                onChange={handleThemeChange}
                                // Add custom chevron for select if needed, or style default
                           >
                               {AVAILABLE_THEMES.map(theme => (
                                   <Select.Item key={theme.id} value={theme.id}>{theme.name}</Select.Item>
                               ))}
                           </Select>
                        }
                    />
                    {/* ... other settings items ... */}
                    <SettingsItem
                        icon={Settings}
                        primary="Measurement Units"
                        actionComponent={
                            <Select
                                selectedIndex={config.units === 'metric' ? 0 : 1}
                                onChange={(e) => {
                                    const newUnits = e.target.selectedIndex === 0 ? 'metric' : 'imperial';
                                    handleSettingChange('set_units', { units: newUnits }, (prev, payload) => ({...prev, units: payload.units }));
                                }}
                            >
                                <Select.Item>Metric (kg, km)</Select.Item>
                                <Select.Item>Imperial (lbs, miles)</Select.Item>
                            </Select>
                        }
                    />
                    <SettingsItem
                        icon={Weight}
                        primary="Prompt for Bodyweight"
                        secondary="Ask for bodyweight before relevant workouts"
                        actionComponent={
                            <Switch
                                class="scale-75" // Removed accent-accent-primary and checked:bg-accent-primary
                                checked={config.prompt_for_bodyweight}
                                onChange={() => handleSettingChange('set_bodyweight_prompt_enabled', { enabled: !config.prompt_for_bodyweight },
                                    (prev, payload) => ({...prev, prompt_for_bodyweight: payload.enabled })
                                )}
                            />
                        }
                    />
                     <SettingsItem
                        icon={Target}
                        primary="Target Bodyweight"
                        secondary={config.target_bodyweight ? `${config.target_bodyweight} ${config.units === 'metric' ? 'kg' : 'lbs'}` : "Not set"}
                        actionComponent={
                            <input
                                type="number"
                                placeholder="e.g., 70"
                                step="0.1"
                                value={config.target_bodyweight === null || config.target_bodyweight === undefined ? '' : config.target_bodyweight}
                                onBlur={(e) => {
                                    const val = e.target.value;
                                    const newWeight = val === '' ? null : parseFloat(val);
                                    if (val === '' || (!isNaN(newWeight) && newWeight > 0)) {
                                        handleSettingChange('set_target_bodyweight', { weight: newWeight },
                                            (prev, payload) => ({...prev, target_bodyweight: payload.weight })
                                        );
                                    } else if (val !== '') {
                                        alert("Invalid target bodyweight. Must be a positive number or empty.");
                                        e.target.value = config.target_bodyweight === null || config.target_bodyweight === undefined ? '' : config.target_bodyweight;
                                    }
                                }}
                            />
                        }
                    />
                     <SettingsItem
                        icon={Repeat}
                        primary="Streak Interval (Days)"
                        secondary={`Workouts within ${config.streak_interval_days} day(s) count as a streak`}
                        actionComponent={
                             <input
                                type="number"
                                min="1"
                                value={config.streak_interval_days}
                                onChange={(e) => {
                                    const newDays = parseInt(e.target.value, 10);
                                    if (!isNaN(newDays) && newDays >=1) {
                                      setConfig(prev => ({...prev, streak_interval_days: newDays}));
                                    }
                                }}
                                onBlur={(e) => {
                                    const newDays = parseInt(e.target.value, 10);
                                    if (!isNaN(newDays) && newDays >= 1) {
                                        handleSettingChange('set_streak_interval', { days: newDays },
                                            (prev, payload) => ({...prev, streak_interval_days: payload.days })
                                        );
                                    } else {
                                        alert("Streak interval must be at least 1 day.");
                                        e.target.value = config.streak_interval_days;
                                        setConfig(prev => ({...prev, streak_interval_days: prev.streak_interval_days }));
                                    }
                                }}
                            />
                        }
                    />
                </List>
            </div>

            {/* Notifications Section */}
            <div>
                <h3 class="text-xs uppercase text-secondary font-semibold mb-2 px-4 sm:px-0">Notifications</h3>
                <List class="bg-secondary rounded-md border border-border-primary p-0">
                    <SettingsItem
                        icon={Bell}
                        primary="Personal Best Notifications"
                        secondary={config.pb_notifications.enabled === null ? "Prompt on first PB" : (config.pb_notifications.enabled ? "Enabled" : "Disabled")}
                        actionComponent={
                            <Switch
                                class="scale-75" // Removed accent-accent-primary and checked:bg-accent-primary
                                checked={config.pb_notifications.enabled === true}
                                onChange={() => handleSettingChange('set_pb_notification_enabled', { enabled: config.pb_notifications.enabled !== true },
                                    (prev, payload) => ({
                                        ...prev,
                                        pb_notifications: {...prev.pb_notifications, enabled: payload.enabled }
                                    })
                                )}
                            />
                        }
                    />
                    {config.pb_notifications.enabled !== null && (
                        <>
                            <SettingsItem
                                icon={Weight} primary="Notify for Weight PBs" className="!pl-12"
                                actionComponent={<Switch class="scale-75" checked={config.pb_notifications.notify_weight} onChange={() => handleSettingChange('set_pb_notify_weight', { enabled: !config.pb_notifications.notify_weight }, (prev, p) => ({...prev, pb_notifications: {...prev.pb_notifications, notify_weight: p.enabled}}))} />}
                            />
                            <SettingsItem
                                icon={Repeat} primary="Notify for Reps PBs" className="!pl-12"
                                actionComponent={<Switch class="scale-75" checked={config.pb_notifications.notify_reps} onChange={() => handleSettingChange('set_pb_notify_reps', { enabled: !config.pb_notifications.notify_reps }, (prev, p) => ({...prev, pb_notifications: {...prev.pb_notifications, notify_reps: p.enabled}}))} />}
                            />
                            <SettingsItem
                                icon={Clock} primary="Notify for Duration PBs" className="!pl-12"
                                actionComponent={<Switch class="scale-75" checked={config.pb_notifications.notify_duration} onChange={() => handleSettingChange('set_pb_notify_duration', { enabled: !config.pb_notifications.notify_duration }, (prev, p) => ({...prev, pb_notifications: {...prev.pb_notifications, notify_duration: p.enabled}}))} />}
                            />
                             <SettingsItem
                                icon={Route} primary="Notify for Distance PBs" className="!pl-12"
                                actionComponent={<Switch class="scale-75" checked={config.pb_notifications.notify_distance} onChange={() => handleSettingChange('set_pb_notify_distance', { enabled: !config.pb_notifications.notify_distance }, (prev, p) => ({...prev, pb_notifications: {...prev.pb_notifications, notify_distance: p.enabled}}))} />}
                            />
                        </>
                    )}
                </List>
            </div>

            {/* Support Section */}
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
