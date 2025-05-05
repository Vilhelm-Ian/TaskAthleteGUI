import { h } from 'preact';
import List from 'preact-material-components/List';
import Switch from 'preact-material-components/Switch';
import Button from 'preact-material-components/Button';
import 'preact-material-components/List/style.css';
import 'preact-material-components/Switch/style.css';
import 'preact-material-components/Button/style.css';
// Import Lucide icons
import { UserCircle2, Bell, Palette, HelpCircle, Heart, ChevronRight } from 'lucide-preact'; // Using UserCircle2
// import { SettingsItem } from '../components/common/SettingsItem'; // Defined below

// Placeholder avatar remains the same
// const PlaceholderAvatar = ({ sizeClass = "w-20 h-20" }) => ( /* ... */ );

const Profile = () => {
  return (
    <div class="flex flex-col sm:flex-row h-full gap-6">
        <div class="sm:w-1/3 lg:w-1/4 text-center sm:text-left sm:bg-bg-light sm:p-6 sm:rounded-md sm:border sm:border-gray-200 sm:self-start">
           {/* ... (Profile Header content) ... */}
        </div>

       <div class="flex-grow space-y-6">
            {/* Account Section */}
            <div>
                <h3 class="text-xs uppercase text-secondary font-semibold mb-2 px-4 sm:px-0">Account</h3>
                <List twoLine class="bg-bg-light rounded-md border border-gray-200 p-0">
                    {/* Use Lucide icons */}
                    <SettingsItem icon={UserCircle2} primary="Edit Profile" secondary="Manage your public profile" />
                    <SettingsItem icon={Bell} primary="Notifications" secondary="Manage push notifications" />
                </List>
            </div>

             {/* App Preferences Section */}
            <div>
                <h3 class="text-xs uppercase text-secondary font-semibold mb-2 px-4 sm:px-0">App Preferences</h3>
                <List class="bg-bg-light rounded-md border border-gray-200 p-0">
                    {/* Use Lucide icons */}
                    <SettingsItem icon={Palette} primary="Theme">
                       <div class="flex items-center gap-2 text-sm">
                          Light <Switch class="scale-75" /> Dark
                       </div>
                    </SettingsItem>
                </List>
            </div>

            {/* Support Section */}
            <div>
                <h3 class="text-xs uppercase text-secondary font-semibold mb-2 px-4 sm:px-0">Support</h3>
                 <List class="bg-bg-light rounded-md border border-gray-200 p-0">
                    {/* Use Lucide icons */}
                    <SettingsItem icon={HelpCircle} primary="Help & FAQ" />
                    <SettingsItem icon={Heart} primary="Rate App" />
                 </List>
            </div>

             {/* ... (Mobile Logout Button) ... */}
       </div>
    </div>
  );
};

// --- Updated Placeholder Sub-Component ---
const SettingsItem = ({ icon: Icon, primary, secondary, children }) => (
   <List.Item className="!py-3 !px-4 flex items-center justify-between w-full">
       <div class="flex items-center">
           {/* Use Lucide icon */}
           {Icon && <Icon class="w-5 h-5 text-secondary mr-4 flex-shrink-0" strokeWidth={2} />}
           <List.TextContainer>
               <List.PrimaryText class="text-sm font-medium text-gray-800">{primary}</List.PrimaryText>
               {secondary && <List.SecondaryText class="text-xs text-secondary">{secondary}</List.SecondaryText>}
           </List.TextContainer>
       </div>
       {/* Use Lucide ChevronRight */}
       {children ? children : <ChevronRight class="w-4 h-4 text-secondary flex-shrink-0" strokeWidth={2} />}
   </List.Item>
);

export default Profile;
