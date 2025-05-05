// src/components/layout/MainLayout.jsx
import { h, Fragment } from 'preact'; // Use Fragment if needed
import { useLocation } from 'preact-iso'; // Import the hook
import { SidebarNav } from '../common/SidebarNav';
import { BottomNav } from '../common/BottomNav';
// import { AppHeader } from '../common/AppHeader'; // Keep if using

// MainLayout is now a standard component receiving children
export const MainLayout = ({ children }) => {
  // Get location object using the hook
  const { path } = useLocation(); // Use 'url' or 'path' depending on what you need

  // No need to determine title here anymore, can be done in individual pages or AppHeader if kept

  return (
    <div class="flex flex-col sm:flex-row min-h-screen bg-bg-dark">
      {/* Pass the current path from the hook to Nav components */}
      <SidebarNav currentPath={path} class="hidden sm:flex" />

      <main class="flex-grow flex flex-col pb-16 sm:pb-0">
        {/* Optional Mobile Header - might need path prop if it displays title */}
        {/* <AppHeader currentPath={path} class="sm:hidden" /> */}

        {/* Render the matched Route component passed as children */}
        <div class="flex-grow p-4 overflow-y-auto">
           {children}
        </div>
      </main>

      {/* Pass the current path from the hook to Nav components */}
      <BottomNav currentPath={path} class="sm:hidden" />
    </div>
  );
};
