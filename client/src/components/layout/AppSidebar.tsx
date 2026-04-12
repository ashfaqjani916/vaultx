import {
  LayoutDashboard, FileText, ClipboardList, ShieldCheck,
  Award, FileSearch, ScrollText, Settings, Hexagon
} from 'lucide-react';
import { NavLink } from '@/components/NavLink';
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent,
  SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem, useSidebar,
} from '@/components/ui/sidebar';
import { useOnchainUser } from '@/hooks/useOnchainUser';
import { userRoleLabel } from '@/lib/ssiParsers';
import type { UserRole } from '@/types';

const navItems = [
  { title: 'Dashboard', url: '/dashboard', icon: LayoutDashboard, roles: ['citizen', 'approver', 'verifier', 'governance'] },
  { title: 'Claim Registry', url: '/claims', icon: FileText, roles: ['governance'] },
  { title: 'Claim Requests', url: '/claim-requests', icon: ClipboardList, roles: ['citizen', 'approver'] },
  { title: 'Verification', url: '/verification', icon: ShieldCheck, roles: ['approver'] },
  { title: 'Credentials', url: '/credentials', icon: Award, roles: ['citizen', 'approver'] },
  { title: 'Verification Requests', url: '/verification-requests', icon: FileSearch, roles: ['verifier'] },
  { title: 'Audit Logs', url: '/audit-logs', icon: ScrollText, roles: ['governance'] },
  { title: 'Settings', url: '/settings', icon: Settings, roles: ['citizen', 'approver', 'verifier', 'governance'] },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === 'collapsed';
  const { role, isRegistered } = useOnchainUser();
  const currentRole: UserRole = role ?? 'citizen';

  const allowedNav = isRegistered
    ? navItems.filter((item) => item.roles.includes(currentRole))
    : navItems.filter((item) => item.url === '/settings');

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border">
      <SidebarContent className="bg-sidebar">
        {/* Brand */}
        <div className="flex items-center gap-2.5 px-4 py-5 border-b border-sidebar-border">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg gradient-primary">
            <Hexagon className="h-4 w-4 text-primary-foreground" />
          </div>
          {!collapsed && (
            <span className="text-lg font-bold text-sidebar-accent-foreground tracking-tight">
              VaultX
            </span>
          )}
        </div>

        {/* Role Selector */}
        {!collapsed && (
          <div className="px-3 py-3 border-b border-sidebar-border">
            <label className="text-[10px] uppercase tracking-widest text-sidebar-foreground mb-1.5 block font-medium">Role</label>
            <div className="h-8 px-2.5 rounded-md bg-sidebar-accent border border-sidebar-border text-sidebar-accent-foreground text-xs flex items-center">
              {userRoleLabel(role)}
            </div>
          </div>
        )}

        <SidebarGroup>
          <SidebarGroupLabel className="text-sidebar-foreground/60 text-[10px] uppercase tracking-widest">
            Navigation
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {allowedNav.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      end={item.url === '/dashboard'}
                      className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-sm text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors"
                      activeClassName="bg-sidebar-accent text-sidebar-primary font-medium"
                    >
                      <item.icon className="h-4 w-4 shrink-0" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
