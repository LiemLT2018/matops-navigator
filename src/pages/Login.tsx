import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Factory, Eye, EyeOff, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { authService } from "@/api/services";
import { MatOpsApiError } from "@/lib/apiClient";
import {
  getAccessToken,
  isAccessTokenExpired,
  setAuthSession,
} from "@/lib/authStorage";
import { encryptPasswordRSA } from "@/utils/rsa";

type LoginLocationState = {
  from?: string;
  authRedirectReason?: "no_token" | "expired";
};

export default function LoginPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  useEffect(() => {
    const token = getAccessToken();
    if (token && !isAccessTokenExpired()) {
      navigate("/", { replace: true });
    }
  }, [navigate]);

  /** RequireAuth / hết phiên: hiện toast (trước đây redirect im lặng). */
  useEffect(() => {
    const st = location.state as LoginLocationState | null;
    const reason = st?.authRedirectReason;
    if (!reason) return;
    const msg =
      reason === "expired" ? t("errors.unauthorized") : t("errors.loginRequired");
    toast.error(msg, { id: "matops-auth-redirect" });
    navigate("/login", {
      replace: true,
      state: st?.from ? { from: st.from } : undefined,
    });
  }, [location.state, navigate, t]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      toast.error(t("login.fillAll"));
      return;
    }
    setLoading(true);
    try {
      const { publicKeyPem } = await authService.getLoginPublicKey();
      const encrypted = await encryptPasswordRSA(publicKeyPem, password);
      const res = await authService.login(username.trim(), encrypted);
      if (!res.accessToken?.trim()) {
        toast.error(t("errors.system"));
        return;
      }
      setAuthSession({
        accessToken: res.accessToken.trim(),
        user: {
          ...res.user,
          allowedCompanies: res.allowedCompanies ?? [],
        },
        expiresAtUtc: res.expiresAtUtc,
        rememberMe,
      });
      toast.success(t("login.success"));
      navigate("/", { replace: true });
    } catch (e) {
      if (e instanceof MatOpsApiError && e.errorMessage) {
        toast.error(e.errorMessage);
      } else if (e instanceof Error && e.message !== "Unauthorized") {
        toast.error(t("errors.system"));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm space-y-6">
        {/* Logo */}
        <div className="flex flex-col items-center gap-2">
          <div className="h-12 w-12 rounded-lg bg-primary flex items-center justify-center">
            <Factory className="h-7 w-7 text-primary-foreground" />
          </div>
          <h1 className="text-xl font-bold text-foreground tracking-tight">
            MatOps Platform
          </h1>
          <p className="text-sm text-muted-foreground">
            {t("login.subtitle")}
          </p>
        </div>

        <Card className="border-border">
          <CardHeader className="pb-4">
            <h2 className="text-lg font-semibold text-foreground text-center">
              {t("login.title")}
            </h2>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username">{t("login.username")}</Label>
                <Input
                  id="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder={t("login.usernamePlaceholder")}
                  autoComplete="username"
                  autoFocus
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">{t("login.password")}</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={t("login.passwordPlaceholder")}
                    autoComplete="current-password"
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="remember"
                  checked={rememberMe}
                  onCheckedChange={(v) => setRememberMe(v === true)}
                />
                <Label htmlFor="remember" className="text-sm font-normal cursor-pointer">
                  {t("login.rememberMe")}
                </Label>
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                <LogIn className="h-4 w-4 mr-2" />
                {loading ? t("login.loggingIn") : t("login.submit")}
              </Button>
            </form>
          </CardContent>
        </Card>

        <p className="text-xs text-center text-muted-foreground">
          © 2024 MatOps Platform
        </p>
      </div>
    </div>
  );
}
