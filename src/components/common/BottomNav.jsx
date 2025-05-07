// src/components/common/BottomNav.jsx
import { h } from 'preact';
// NO Link import needed from preact-iso
import { LineChart, ListChecks, Timer, User } from 'lucide-preact';
import classNames from 'classnames';

export const BottomNav = ({ currentPath, class: className }) => {
  const navItems = [
    { path: '/log', label: 'Log', icon: Timer },
    { path: '/history', label: 'History', icon: ListChecks },
    { path: '/stats', label: 'Stats', icon: LineChart },
    { path: '/profile', label: 'Profile', icon: User },
  ];

  const getLinkClass = (path) => classNames(
     'flex flex-col items-center justify-center flex-grow pt-2 pb-1 text-xs transition-colors duration-150',
    {
      'text-primary': currentPath === path || (path === '/log' && currentPath === '/'),
      'text-secondary hover:text-gray-800': currentPath !== path && !(path === '/log' && currentPath === '/'),
    }
  );

  const iconClass = "w-6 h-6 mb-1";

  return (
    <nav class={classNames(
      "fixed bottom-0 left-0 right-0 h-16 bg-primary border-t border-gray-200 flex items-stretch justify-around z-50",
      className
    )}>
      {navItems.map(item => (
        // Use standard <a> tag
        <a key={item.path} href={item.path} class={getLinkClass(item.path)}>
          <item.icon class={iconClass} strokeWidth={2} />
          <span>{item.label}</span>
        </a>
      ))}
    </nav>
  );
};
