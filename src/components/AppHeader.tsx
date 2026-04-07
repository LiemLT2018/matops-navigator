import { Sun, Moon, Globe, LogOut } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { useTheme } from '@/hooks/useTheme';
import { clearAuthSession } from '@/lib/authStorage';

export function AppHeader() {
  const { theme, toggleTheme } = useTheme();
  const { i18n, t } = useTranslation();
  const navigate = useNavigate();

  const toggleLang = () => {
    i18n.changeLanguage(i18n.language === 'vi' ? 'en' : 'vi');
  };

  const logout = () => {
    clearAuthSession();
    navigate('/login', { replace: true });
  };

  return (
    <header className="h-12 flex items-center justify-between border-b border-border bg-card px-4">
      <div className="flex items-center gap-2">
        <SidebarTrigger />
      </div>
      <div className="flex items-center gap-1">
        <Button variant="ghost" size="icon" onClick={toggleLang} title="Language">
          <Globe className="h-4 w-4" />
          <span className="sr-only">Language</span>
        </Button>
        <span className="text-xs font-medium text-muted-foreground mr-1">{i18n.language.toUpperCase()}</span>
        <Button variant="ghost" size="icon" onClick={toggleTheme} title="Theme">
          {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={logout}
          title={t('app.logout')}
        >
          <LogOut className="h-4 w-4" />
          <span className="sr-only">{t('app.logout')}</span>
        </Button>
      </div>
    </header>
  );
}
