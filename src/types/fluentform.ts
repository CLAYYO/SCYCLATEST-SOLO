// TypeScript types for FluentForm structure

export interface FluentFormValidationRule {
  value?: boolean | string | number;
  message?: string;
}

export interface FluentFormValidationRules {
  required?: FluentFormValidationRule;
  email?: FluentFormValidationRule;
  numeric?: FluentFormValidationRule;
  min?: FluentFormValidationRule;
  max?: FluentFormValidationRule;
  url?: FluentFormValidationRule;
}

export interface FluentFormAttributes {
  name?: string;
  placeholder?: string;
  class?: string;
  id?: string;
  value?: string;
  type?: string;
  min?: string;
  max?: string;
  step?: string;
  accept?: string;
  multiple?: boolean;
}

export interface FluentFormAdvancedOptions {
  [key: string]: string | { label: string; calc_value?: string };
}

export interface FluentFormSettings {
  label?: string;
  label_placement?: string;
  help_message?: string;
  admin_field_label?: string;
  validation_rules?: FluentFormValidationRules;
  conditional_logics?: any[];
  advanced_options?: FluentFormAdvancedOptions;
  container_class?: string;
  element_class?: string;
  form_title?: string;
  description?: string;
}

export interface FluentFormColumn {
  fields?: { [key: string]: FluentFormField };
  settings?: FluentFormSettings;
}

export interface FluentFormField {
  index: number;
  element: string;
  attributes: FluentFormAttributes;
  settings: FluentFormSettings;
  columns?: { [key: string]: FluentFormColumn };
  editor_options?: {
    title?: string;
    element?: string;
    icon_class?: string;
    template?: string;
  };
}

export interface FluentFormFields {
  [key: string]: FluentFormField;
}

export interface FluentFormNotification {
  name: string;
  sendTo: {
    type: string;
    email?: string;
    field?: string;
  };
  fromName: string;
  fromEmail: string;
  replyTo: string;
  bcc: string;
  subject: string;
  message: string;
  conditionals?: {
    status: boolean;
    type: string;
    conditions: any[];
  };
  settings: {
    footer_text?: string;
    include_attachments?: string;
  };
  enabled: boolean;
}

export interface FluentFormSettings {
  confirmation?: {
    redirectTo?: string;
    messageToShow?: string;
    sameTabRedirect?: boolean;
    allowReSubmission?: boolean;
  };
  restrictions?: {
    limitNumberOfEntries?: {
      enabled: boolean;
      numberOfEntries?: number;
      period?: string;
      limitReachedMsg?: string;
    };
    scheduleForm?: {
      enabled: boolean;
      start?: string;
      end?: string;
      pendingMsg?: string;
      expiredMsg?: string;
    };
    requireLogin?: {
      enabled: boolean;
      requireLoginMsg?: string;
    };
    denyEmptySubmission?: {
      enabled: boolean;
      message?: string;
    };
  };
  layout?: {
    labelPlacement?: string;
    helpMessagePlacement?: string;
    errorMessagePlacement?: string;
    cssClassName?: string;
    asteriskPlacement?: string;
  };
  delete_entry_after_x_days?: number;
  form_title?: string;
  description?: string;
}

export interface FluentForm {
  id: number;
  title: string;
  fields: FluentFormFields;
  settings?: FluentFormSettings;
  notifications?: { [key: string]: FluentFormNotification };
  created_at?: string;
  updated_at?: string;
  status?: string;
  appearance_settings?: any;
  form_fields_count?: number;
  conditions?: any[];
  type?: string;
}

export interface FluentFormExport {
  form: FluentForm;
  entries?: any[];
}

export interface FluentFormExportFile {
  forms?: FluentFormExport[];
  form?: FluentForm;
  entries?: any[];
}

// Field type mappings from FluentForm to our system
export const FLUENT_FORM_FIELD_MAPPINGS: { [key: string]: string } = {
  'input_name': 'name',
  'input_email': 'email',
  'input_text': 'text',
  'textarea': 'textarea',
  'select': 'select',
  'input_radio': 'radio',
  'input_checkbox': 'checkbox',
  'input_url': 'url',
  'input_number': 'number',
  'input_date': 'date',
  'input_file': 'file',
  'input_hidden': 'hidden',
  'custom_html': 'html',
  'container': 'container',
  'section_break': 'section'
};

// Our internal form field structure
export interface FormField {
  name: string;
  type: string;
  label: string;
  placeholder: string;
  required: boolean;
  options: Array<{ value: string; label: string }>;
  validation: {
    email?: boolean;
    numeric?: boolean;
    min_length?: number;
    max_length?: number;
    pattern?: string;
  };
  order_index: number;
}

export interface ImportResult {
  success: boolean;
  title: string;
  reason?: string;
  error?: string;
  fieldsCount?: number;
  formId?: number;
  file?: string;
}

export interface BulkImportResults {
  total: number;
  successful: number;
  failed: number;
  skipped: number;
  details: ImportResult[];
}