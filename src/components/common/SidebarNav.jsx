// src/components/common/SidebarNav.jsx
import { h } from 'preact';
// NO Link import needed from preact-iso
import { LineChart, ListChecks, Timer, User, LogOut } from 'lucide-preact';
import classNames from 'classnames';


export const SidebarNav = ({ currentPath, class: className }) => {
  const navItems = [
    { path: '/log', label: 'Log Workout', icon: Timer },
    { path: '/history', label: 'History', icon: ListChecks },
    { path: '/stats', label: 'Stats', icon: LineChart },
    { path: '/profile', label: 'Profile', icon: User },
  ];

  const getLinkClass = (path) => classNames(
    'flex items-center w-full px-4 py-3 text-left text-sm rounded-md hover:bg-gray-200 transition-colors duration-150',
    {
      'bg-primary/10 text-primary font-semibold': currentPath === path || (path === '/log' && currentPath === '/'),
      'text-secondary': currentPath !== path && !(path === '/log' && currentPath === '/'),
    }
  );

  const iconClass = "w-5 h-5 mr-3 flex-shrink-0";

  return (
    <aside class={classNames("w-64 bg-bg-light flex-shrink-0 p-4 flex flex-col border-r border-gray-200", className)}>
       {/* ... (Profile header) ... */}

      <nav class="flex-grow space-y-2">
        {navItems.map(item => (
          // Use standard <a> tag
          <a key={item.path} href={item.path} class={getLinkClass(item.path)}>
            <item.icon class={iconClass} strokeWidth={2} />
            <span>{item.label}</span>
          </a>
        ))}
      </nav>

      {/* ... (Logout Button) ... */}
    </aside>
  );
};
