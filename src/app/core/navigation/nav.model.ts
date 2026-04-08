export interface NavItem {
  label: string;
  route: string;
  roles?: string[];
}

export interface NavGroup {
  label: string;
  roles?: string[];
  items: NavItem[];
}

export interface NavModule {
  key: string;
  label: string;
  iconKey: string;
  baseRoute: string;
  roles: string[];
  items: NavItem[];
  groups?: NavGroup[];
}
