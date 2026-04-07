import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppLayout } from "@/components/AppLayout";
import { RequireAuth } from "@/components/RequireAuth";
import DashboardPage from "@/pages/Dashboard";
import SalesOrdersPage from "@/pages/SalesOrders";
import ProductOrdersPage from "@/pages/ProductOrders";
import BOMPage from "@/pages/BOM";
import PurchaseRequestsPage from "@/pages/PurchaseRequests";
import PurchaseOrdersPage from "@/pages/PurchaseOrders";
import WarehousePage from "@/pages/Warehouse";
import ProductionPage from "@/pages/Production";
import QCPage from "@/pages/QC";
import FinishedGoodsPage from "@/pages/FinishedGoods";
import SettingsPage from "@/pages/Settings";
import CustomersPage from "@/pages/Customers";
import SuppliersPage from "@/pages/Suppliers";
import MaterialGroupsPage from "@/pages/MaterialGroups";
import MaterialListPage from "@/pages/MaterialList";
import MaterialAliasesPage from "@/pages/MaterialAliases";
import UndefinedMaterialsPage from "@/pages/UndefinedMaterials";
import ProductGroupsPage from "@/pages/ProductGroups";
import ProductListPage from "@/pages/ProductList";
import UomManagementPage from "@/pages/UomManagement";
import LoginPage from "@/pages/Login";
import NotFound from "@/pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route element={<RequireAuth />}>
            <Route element={<AppLayout />}>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/sales-orders" element={<SalesOrdersPage />} />
            <Route path="/product-orders" element={<ProductOrdersPage />} />
            <Route path="/bom" element={<BOMPage />} />
            <Route path="/purchase-requests" element={<PurchaseRequestsPage />} />
            <Route path="/purchase-orders" element={<PurchaseOrdersPage />} />
            <Route path="/warehouse" element={<WarehousePage />} />
            <Route path="/production" element={<ProductionPage />} />
            <Route path="/qc" element={<QCPage />} />
            <Route path="/finished-goods" element={<FinishedGoodsPage />} />
            <Route path="/customers" element={<CustomersPage />} />
            <Route path="/suppliers" element={<SuppliersPage />} />
            <Route path="/material-groups" element={<MaterialGroupsPage />} />
            <Route path="/material-list" element={<MaterialListPage />} />
            <Route path="/material-aliases" element={<MaterialAliasesPage />} />
            <Route path="/undefined-materials" element={<UndefinedMaterialsPage />} />
            <Route path="/uom" element={<UomManagementPage />} />
            <Route path="/material-units" element={<Navigate to="/uom" replace />} />
            <Route path="/product-groups" element={<ProductGroupsPage />} />
            <Route path="/product-list" element={<ProductListPage />} />
            <Route path="/product-units" element={<Navigate to="/uom" replace />} />
            <Route path="/settings" element={<SettingsPage />} />
            </Route>
          </Route>
          <Route path="/login" element={<LoginPage />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
