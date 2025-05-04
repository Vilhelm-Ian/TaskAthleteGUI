// src/components/NavBar.tsx
import { FunctionalComponent } from 'preact';

export type View = 'workouts' | 'exercises' | 'settings';

interface NavBarProps {
    currentView: View;
    onNavigate: (view: View) => void;
}

export const NavBar: FunctionalComponent<NavBarProps> = ({ currentView, onNavigate }) => {
    const navItemClass = (view: View) =>
        `px-4 py-2 rounded cursor-pointer transition-colors ${
            currentView === view
                ? 'bg-blue-600 text-white'
                : 'text-blue-100 hover:bg-blue-700 hover:text-white'
        }`;

    return (
        <nav class="bg-blue-800 text-white p-4 flex space-x-4 items-center shadow-md">
            <h1 class="text-xl font-bold mr-6">Workout Tracker</h1>
            <button class={navItemClass('workouts')} onClick={() => onNavigate('workouts')}>
                Workouts
            </button>
            <button class={navItemClass('exercises')} onClick={() => onNavigate('exercises')}>
                Exercises
            </button>
            {/* <button class={navItemClass('settings')} onClick={() => onNavigate('settings')}>
                Settings
            </button> */}
             {/* Add more nav items as needed */}
        </nav>
    );
};
