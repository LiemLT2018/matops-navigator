import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppLayout } from "@/components/AppLayout";
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
import NotFound from "@/pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Sonner />
      <BrowserRouter>
        <Routes>
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
            <Route path="/settings" element={<SettingsPage />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
