import {
  LayoutDashboard, ShoppingCart, FileText, Layers, ShoppingBag, Package,
  Factory, ClipboardCheck, Archive, Settings, ChevronDown, Users, Truck,
  Boxes, List, Tag, HelpCircle, Ruler, Box, PackageOpen
} from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { NavLink } from '@/components/NavLink';
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarHeader, SidebarFooter,
  useSidebar,
} from '@/components/ui/sidebar';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

export function AppSidebar() {
  const { t } = useTranslation();
  const { state } = useSidebar();
  const collapsed = state === 'collapsed';
  const location = useLocation();
  const isActive = (path: string) => location.pathname === path || location.pathname.startsWith(path + '/');

  const mainItems = [
    { title: t('nav.dashboard'), url: '/', icon: LayoutDashboard },
  ];

  const orderItems = [
    { title: t('nav.salesOrder'), url: '/sales-orders', icon: ShoppingCart },
    { title: t('nav.productOrder'), url: '/product-orders', icon: FileText },
  ];

  const bomItems = [
    { title: t('nav.bomManagement'), url: '/bom', icon: Layers },
  ];

  const purchasingItems = [
    { title: t('nav.purchaseRequest'), url: '/purchase-requests', icon: ShoppingBag },
    { title: t('nav.purchaseOrder'), url: '/purchase-orders', icon: ShoppingBag },
  ];

  const partnerItems = [
    { title: t('nav.customers'), url: '/customers', icon: Users },
    { title: t('nav.suppliers'), url: '/suppliers', icon: Truck },
  ];

  const materialItems = [
    { title: t('nav.warehouse'), url: '/warehouse', icon: Package },
    { title: t('nav.materialGroups'), url: '/material-groups', icon: Boxes },
    { title: t('nav.materialList'), url: '/material-list', icon: List },
    { title: t('nav.materialAliases'), url: '/material-aliases', icon: Tag },
    { title: t('nav.undefinedMaterials'), url: '/undefined-materials', icon: HelpCircle },
  ];

  const productItems = [
    { title: t('nav.finishedGoods'), url: '/finished-goods', icon: PackageOpen },
    { title: t('nav.productGroups'), url: '/product-groups', icon: Box },
    { title: t('nav.productList'), url: '/product-list', icon: List },
  ];

  const operationItems = [
    { title: t('nav.operationUom'), url: '/uom', icon: Ruler },
    { title: t('nav.production'), url: '/production', icon: Factory },
    { title: t('nav.qc'), url: '/qc', icon: ClipboardCheck },
  ];

  const renderItems = (items: typeof mainItems) => (
    <SidebarMenu>
      {items.map((item) => (
        <SidebarMenuItem key={item.url}>
          <SidebarMenuButton asChild isActive={isActive(item.url)}>
            <NavLink to={item.url} end={item.url === '/'} className="hover:bg-sidebar-accent/50" activeClassName="bg-sidebar-accent text-sidebar-primary font-medium">
              <item.icon className="mr-2 h-4 w-4 shrink-0" />
              {!collapsed && <span className="truncate">{item.title}</span>}
            </NavLink>
          </SidebarMenuButton>
        </SidebarMenuItem>
      ))}
    </SidebarMenu>
  );

  const renderGroup = (label: string, items: typeof mainItems, defaultOpen: boolean = false) => {
    const groupActive = items.some(i => isActive(i.url));
    if (collapsed) {
      return (
        <SidebarGroup>
          <SidebarGroupContent>{renderItems(items)}</SidebarGroupContent>
        </SidebarGroup>
      );
    }
    return (
      <Collapsible defaultOpen={defaultOpen || groupActive} className="group/collapsible">
        <SidebarGroup>
          <SidebarGroupLabel asChild>
            <CollapsibleTrigger className="flex w-full items-center justify-between">
              {label}
              <ChevronDown className="h-4 w-4 transition-transform group-data-[state=open]/collapsible:rotate-180" />
            </CollapsibleTrigger>
          </SidebarGroupLabel>
          <CollapsibleContent>
            <SidebarGroupContent>{renderItems(items)}</SidebarGroupContent>
          </CollapsibleContent>
        </SidebarGroup>
      </Collapsible>
    );
  };

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border">
      <SidebarHeader className="p-4">
        {!collapsed && (
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-sidebar-primary">
              <Factory className="h-4 w-4 text-sidebar-primary-foreground" />
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-bold text-sidebar-foreground">MatOps</span>
              <span className="text-[10px] text-sidebar-foreground/60">Platform</span>
            </div>
          </div>
        )}
        {collapsed && (
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-sidebar-primary mx-auto">
            <Factory className="h-4 w-4 text-sidebar-primary-foreground" />
          </div>
        )}
      </SidebarHeader>
      <SidebarContent className="px-2">
        <SidebarGroup>
          <SidebarGroupContent>{renderItems(mainItems)}</SidebarGroupContent>
        </SidebarGroup>
        {renderGroup(t('nav.orders'), orderItems, true)}
        {renderGroup(t('nav.bom'), bomItems, true)}
        {renderGroup(t('nav.purchasing'), purchasingItems)}
        {renderGroup(t('nav.partners'), partnerItems)}
        {renderGroup(t('nav.materials'), materialItems)}
        {renderGroup(t('nav.productsMenu'), productItems)}
        {renderGroup(t('nav.operations'), operationItems)}
      </SidebarContent>
      <SidebarFooter className="px-2 pb-4">
        {renderItems([{ title: t('nav.settings'), url: '/settings', icon: Settings }])}
      </SidebarFooter>
    </Sidebar>
  );
}
