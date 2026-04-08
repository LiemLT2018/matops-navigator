import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useTheme } from '@/hooks/useTheme';
import { Sun, Moon } from 'lucide-react';
import { toast } from 'sonner';

export default function SettingsPage() {
  const { t, i18n } = useTranslation();
  const { theme, toggleTheme } = useTheme();
  const [config, setConfig] = useState(() => {
    const stored = localStorage.getItem('matops_config');
    return stored ? JSON.parse(stored) : { BASE_URL: '/api', DPS_CERT: 'MATOPS_DEFAULT_CERT_2024' };
  });

  const handleSave = () => {
    localStorage.setItem('matops_config', JSON.stringify(config));
    toast.success(t('common.save') + ' ' + t('errors.success'));
    // apiClient is created once at startup; reload to apply new BASE_URL immediately.
    setTimeout(() => window.location.reload(), 300);
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <h1 className="text-2xl font-bold">{t('settings.title')}</h1>

      <Card className="industrial-shadow">
        <CardHeader><CardTitle className="text-base">API</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>{t('settings.baseUrl')}</Label>
            <Input value={config.BASE_URL} onChange={e => setConfig({ ...config, BASE_URL: e.target.value })} className="font-mono" />
          </div>
          <div className="space-y-2">
            <Label>{t('settings.dpsCert')}</Label>
            <Input type="password" value={config.DPS_CERT} onChange={e => setConfig({ ...config, DPS_CERT: e.target.value })} className="font-mono" />
          </div>
          <Button onClick={handleSave}>{t('common.save')}</Button>
        </CardContent>
      </Card>

      <Card className="industrial-shadow">
        <CardHeader><CardTitle className="text-base">{t('settings.language')} & {t('settings.theme')}</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            <Label>{t('settings.language')}:</Label>
            <div className="flex border border-border rounded-md overflow-hidden">
              <Button variant={i18n.language === 'vi' ? 'default' : 'ghost'} size="sm" onClick={() => i18n.changeLanguage('vi')} className="rounded-none">Tiếng Việt</Button>
              <Button variant={i18n.language === 'en' ? 'default' : 'ghost'} size="sm" onClick={() => i18n.changeLanguage('en')} className="rounded-none">English</Button>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Label>{t('settings.theme')}:</Label>
            <Button variant="outline" size="sm" onClick={toggleTheme}>
              {theme === 'dark' ? <><Sun className="h-4 w-4 mr-1" />{t('settings.light')}</> : <><Moon className="h-4 w-4 mr-1" />{t('settings.dark')}</>}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
