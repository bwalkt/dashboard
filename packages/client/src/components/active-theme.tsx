import {
  ReactNode,
  createContext,
  useContext,
  useEffect,
  useState
} from 'react';

const COOKIE_NAME = 'active_theme';
const DEFAULT_THEME = 'default';

function setThemeCookie(theme: string) {
  if (typeof window === 'undefined') return;

  document.cookie = `${COOKIE_NAME}=${theme}; path=/; max-age=31536000; SameSite=Lax; ${window.location.protocol === 'https:' ? 'Secure;' : ''}`;
  localStorage.setItem(COOKIE_NAME, theme);
}

type ThemeContextType = {
  activeTheme: string;
  setActiveTheme: (theme: string) => void;
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ActiveThemeProvider({
  children,
  initialTheme
}: {
  children: ReactNode;
  initialTheme?: string;
}) {
  const [activeTheme, setActiveTheme] = useState<string>(
    () => initialTheme || DEFAULT_THEME
  );

  useEffect(() => {
    console.log("ActiveThemeProvider - applying theme:", activeTheme);
    setThemeCookie(activeTheme);

    Array.from(document.body.classList)
      .filter((className) => className.startsWith('theme-'))
      .forEach((className) => {
        console.log("ActiveThemeProvider - removing class:", className);
        document.body.classList.remove(className);
      });
    
    console.log("ActiveThemeProvider - adding class:", `theme-${activeTheme}`);
    document.body.classList.add(`theme-${activeTheme}`);
    
    if (activeTheme.endsWith('-scaled')) {
      console.log("ActiveThemeProvider - adding scaled class");
      document.body.classList.add('theme-scaled');
    }
    
    console.log("ActiveThemeProvider - final body classes:", Array.from(document.body.classList).join(', '));
  }, [activeTheme]);

  return (
    <ThemeContext.Provider value={{ activeTheme, setActiveTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useThemeConfig() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error(
      'useThemeConfig must be used within an ActiveThemeProvider'
    );
  }
  return context;
}
