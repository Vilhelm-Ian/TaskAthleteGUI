// src/App.jsx
import { h } from 'preact';
// Import from preact-iso
import { useEffect } from 'preact/hooks';
import { LocationProvider, Router, Route } from 'preact-iso';

// Import Layout and Pages
import { MainLayout } from './components/layout/MainLayout';
import LogWorkout from './pages/LogWorkout';
import History from './pages/History';
import Stats from './pages/Stats';
import Profile from './pages/Profile';
import {GUI_THEME_STORAGE_KEY, AVAILABLE_THEMES  } from './pages/Profile.jsx'
// import NotFound from './pages/NotFound'; // Optional

const App = () => {
    useEffect(() => {
    if (typeof window !== 'undefined') {
      // Remove all theme-prefixed classes
      let currentGuiTheme = localStorage.getItem(GUI_THEME_STORAGE_KEY)
      if(currentGuiTheme != null) {
        AVAILABLE_THEMES.forEach(theme => document.documentElement.classList.remove(`theme-${theme.id}`));
        document.documentElement.classList.add(`theme-${currentGuiTheme}`);
      }
    }
  }, []);


  return (
    // Wrap the entire app in LocationProvider
    <LocationProvider>
      {/* MainLayout now wraps the Router to provide consistent structure */}
      <MainLayout>
        {/* Router defines the routes */}
        <Router>
          {/* Route components now render directly, MainLayout provides the frame */}
          <Route path="/" component={LogWorkout} />
          <Route path="/log" component={LogWorkout} />
          <Route path="/history" component={History} />
          <Route path="/stats" component={Stats} />
          <Route path="/profile" component={Profile} />
        </Router>
      </MainLayout>
    </LocationProvider>
  );
};

export default App;
