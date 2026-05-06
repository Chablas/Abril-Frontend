export interface NavItem {
  label: string;
  route: string;
  featureKey?: string;
  roles?: string[];
}

export interface NavGroup {
  label: string;
  items: NavItem[];
}

export interface NavModule {
  key: string;
  label: string;
  iconKey: string;
  baseRoute: string;
  items: NavItem[];
  groups?: NavGroup[];
}
