import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { authService } from "@/api/services";
import { MatOpsApiError } from "@/lib/apiClient";
import {
  getAccessToken,
  getAuthUser,
  mergeAllowedCompaniesIntoSession,
  updateActiveCompanyInSession,
  type AllowedCompany,
} from "@/lib/authStorage";

export type TenantContextValue = {
  activeMdCompanyUuid: string | null;
  activeCompanyLabel: string;
  allowedCompanies: AllowedCompany[];
  switchCompany: (mdCompanyUuid: string) => Promise<void>;
  refreshMyCompanies: () => Promise<void>;
  switching: boolean;
};

const TenantContext = createContext<TenantContextValue | null>(null);

export function TenantProvider({ children }: { children: React.ReactNode }) {
  const qc = useQueryClient();
  const { t } = useTranslation();
  const [activeUuid, setActiveUuid] = useState<string | null>(() =>
    getAuthUser()?.mdCompanyUuid ?? null,
  );
  const [allowed, setAllowed] = useState<AllowedCompany[]>(
    () => getAuthUser()?.allowedCompanies ?? [],
  );
  const [switching, setSwitching] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const token = getAccessToken();
      const u = getAuthUser();
      if (!token || !u) return;
      if ((u.allowedCompanies?.length ?? 0) > 0) return;
      try {
        const list = await authService.myCompanies();
        if (cancelled) return;
        mergeAllowedCompaniesIntoSession(list);
        setAllowed(list);
      } catch {
        /* Backend may not expose my-companies yet */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const refreshMyCompanies = useCallback(async () => {
    const list = await authService.myCompanies();
    mergeAllowedCompaniesIntoSession(list);
    setAllowed(list);
  }, []);

  const switchCompany = useCallback(
    async (mdCompanyUuid: string) => {
      if (mdCompanyUuid === activeUuid) return;
      setSwitching(true);
      try {
        await authService.switchCompany(mdCompanyUuid);
        updateActiveCompanyInSession(mdCompanyUuid);
        setActiveUuid(mdCompanyUuid);
        await qc.invalidateQueries();
        toast.success(t("app.companySwitched"));
      } catch (e) {
        if (e instanceof MatOpsApiError && e.errorMessage) {
          toast.error(e.errorMessage);
        } else if (e instanceof Error && e.message !== "Unauthorized") {
          toast.error(t("errors.system"));
        }
      } finally {
        setSwitching(false);
      }
    },
    [activeUuid, qc, t],
  );

  const activeCompanyLabel = useMemo(() => {
    const hit = allowed.find((c) => c.uuid === activeUuid);
    return hit?.name ?? hit?.code ?? activeUuid ?? "—";
  }, [allowed, activeUuid]);

  const value = useMemo<TenantContextValue>(
    () => ({
      activeMdCompanyUuid: activeUuid,
      activeCompanyLabel,
      allowedCompanies: allowed,
      switchCompany,
      refreshMyCompanies,
      switching,
    }),
    [activeUuid, activeCompanyLabel, allowed, switchCompany, refreshMyCompanies, switching],
  );

  return (
    <TenantContext.Provider value={value}>{children}</TenantContext.Provider>
  );
}

export function useTenant(): TenantContextValue {
  const v = useContext(TenantContext);
  if (!v) throw new Error("useTenant must be used within TenantProvider");
  return v;
}
