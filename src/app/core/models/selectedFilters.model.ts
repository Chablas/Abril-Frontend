export interface SelectedFilters<TOptions = null, TCreate = null, TEdit = null> {
  selectedOptions: TOptions | null;
  selectedOptionsCreateModal: TCreate | null;
  selectedOptionsEditModal: TEdit | null;
}