export interface Filters<TOptions = null, TCreate = null, TEdit = null> {
  options: TOptions | null;
  optionsCreateModal: TCreate | null;
  optionsEditModal: TEdit | null;
}