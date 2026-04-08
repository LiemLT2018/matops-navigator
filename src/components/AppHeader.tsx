import { Sun, Moon, Globe, LogOut, Building2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useTenant } from '@/context/TenantContext';
import { useTheme } from '@/hooks/useTheme';
import { clearAuthSession } from '@/lib/authStorage';

export function AppHeader() {
  const { theme, toggleTheme } = useTheme();
  const { i18n, t } = useTranslation();
  const navigate = useNavigate();
  const tenant = useTenant();

  const toggleLang = () => {
    i18n.changeLanguage(i18n.language === 'vi' ? 'en' : 'vi');
  };

  const logout = () => {
    clearAuthSession();
    navigate('/login', { replace: true });
  };

  return (
    <header className="h-12 flex items-center justify-between border-b border-border bg-card px-4">
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <SidebarTrigger />
        <div className="flex items-center gap-2 min-w-0 max-w-[min(320px,50vw)]">
          <Building2 className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
          {tenant.allowedCompanies.length > 1 ? (
            <Select
              value={tenant.activeMdCompanyUuid ?? ""}
              onValueChange={(v) => {
                void tenant.switchCompany(v);
              }}
              disabled={tenant.switching}
            >
              <SelectTrigger className="h-8 text-xs w-full" aria-label={t("app.currentCompany")}>
                <SelectValue placeholder={tenant.activeCompanyLabel} />
              </SelectTrigger>
              <SelectContent>
                {tenant.allowedCompanies.map((c) => (
                  <SelectItem key={c.uuid} value={c.uuid}>
                    {c.name} ({c.code})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <span
              className="text-xs font-medium text-foreground truncate"
              title={tenant.activeCompanyLabel}
            >
              {tenant.activeCompanyLabel}
            </span>
          )}
        </div>
      </div>
      <div className="flex items-center gap-1 shrink-0">
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
