'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRole } from '@/hooks/use-role';
import { hasMinRole } from '@/lib/api-client';
import {
  createWorkflow,
  deleteWorkflow,
  fetchWorkflowMeta,
  listWorkflowExecutions,
  listWorkflows,
  retryWorkflowExecution,
  toggleWorkflow,
  updateWorkflow,
  type WorkflowActionType,
  type WorkflowCondition,
  type WorkflowConfigField,
  type WorkflowExecutionItem,
  type WorkflowExecutionStatus,
  type WorkflowItem,
  type WorkflowMeta,
  type WorkflowTemplate,
  type WorkflowTriggerType,
} from '@/lib/workflows-api';
import { useAuth } from '@/lib/auth';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { Badge, type BadgeVariant } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input, Label, Select } from '@/components/ui/form';
import { PageHeader } from '@/components/ui/page-header';
import {
  IconHistory,
  IconLock,
  IconPlus,
  IconRefresh,
  IconWorkflow,
} from '@/components/ui/icons';

const EXECUTION_VARIANT: Record<WorkflowExecutionStatus, BadgeVariant> = {
  pending: 'gray',
  running: 'blue',
  success: 'green',
  failed: 'red',
  retried: 'amber',
};

const STATUS_LABEL: Record<WorkflowExecutionStatus, string> = {
  pending: 'Pending',
  running: 'Running',
  success: 'Success',
  failed: 'Failed',
  retried: 'Retried',
};

interface ConditionRow {
  field: string;
  operator: string;
  value: string;
}

interface ActionRow {
  type: string;
  config: Record<string, unknown>;
}

interface FormState {
  name: string;
  description: string;
  triggerType: string;
  triggerConfig: Record<string, unknown>;
  conditions: ConditionRow[];
  actions: ActionRow[];
}

function emptyForm(): FormState {
  return {
    name: '',
    description: '',
    triggerType: '',
    triggerConfig: {},
    conditions: [],
    actions: [],
  };
}

function valueToInput(value: unknown): string {
  if (Array.isArray(value)) return value.join(', ');
  if (value === null || value === undefined) return '';
  return String(value);
}

function parseConditionValue(
  row: ConditionRow,
  fieldMeta: { type: 'text' | 'select' | 'number' | 'date' } | undefined,
): string | number | string[] {
  const raw = row.value.trim();
  if (row.operator === 'in') {
    return raw
      .split(',')
      .map((part) => part.trim())
      .filter(Boolean);
  }
  if (fieldMeta?.type === 'number') {
    const num = Number(raw);
    return raw === '' || Number.isNaN(num) ? 0 : num;
  }
  return raw;
}

function ConfigFields({
  fields,
  config,
  onChange,
}: {
  fields: WorkflowConfigField[];
  config: Record<string, unknown>;
  onChange: (next: Record<string, unknown>) => void;
}) {
  if (fields.length === 0) {
    return <p className="text-xs text-slate-400">No extra configuration needed.</p>;
  }

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {fields.map((field) => {
        const value = config[field.key];
        if (field.type === 'multiselect') {
          const current: string[] = Array.isArray(value) ? (value as string[]) : [];
          const freeText = current.filter((v) => !field.options?.some((o) => o.value === v)).join(', ');
          return (
            <div key={field.key} className="space-y-2 sm:col-span-2">
              <Label>
                {field.label}
                {field.required && <span className="text-red-500"> *</span>}
              </Label>
              <div className="flex flex-wrap gap-1.5">
                {field.options?.map((option) => {
                  const active = current.includes(option.value);
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => {
                        const next = active
                          ? current.filter((v) => v !== option.value)
                          : [...current, option.value];
                        onChange({ ...config, [field.key]: next });
                      }}
                      className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                        active
                          ? 'border-blue-300 bg-blue-50 text-blue-700'
                          : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300'
                      }`}
                    >
                      {option.label}
                    </button>
                  );
                })}
              </div>
              <Input
                placeholder={field.placeholder ?? 'Extra recipients, comma-separated'}
                value={freeText}
                onChange={(e) => {
                  const typed = e.target.value;
                  const selected = current.filter((v) => field.options?.some((o) => o.value === v));
                  const extras = typed
                    .split(',')
                    .map((part) => part.trim())
                    .filter(Boolean);
                  onChange({ ...config, [field.key]: [...selected, ...extras] });
                }}
              />
              {field.hint && <p className="text-[11px] text-slate-400">{field.hint}</p>}
            </div>
          );
        }
        if (field.type === 'select') {
          return (
            <div key={field.key} className="space-y-1.5">
              <Label>
                {field.label}
                {field.required && <span className="text-red-500"> *</span>}
              </Label>
              <Select
                value={typeof value === 'string' ? value : ''}
                onChange={(e) => onChange({ ...config, [field.key]: e.target.value })}
              >
                <option value="">Select…</option>
                {field.options?.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
            </div>
          );
        }
        if (field.type === 'number') {
          return (
            <div key={field.key} className="space-y-1.5">
              <Label>{field.label}</Label>
              <Input
                type="number"
                value={valueToInput(value)}
                onChange={(e) =>
                  onChange({ ...config, [field.key]: e.target.value === '' ? '' : Number(e.target.value) })
                }
              />
            </div>
          );
        }
        return (
          <div key={field.key} className="space-y-1.5">
            <Label>
              {field.label}
              {field.required && <span className="text-red-500"> *</span>}
            </Label>
            <Input
              type={field.type === 'date' ? 'text' : 'text'}
              placeholder={field.placeholder}
              value={valueToInput(value)}
              onChange={(e) => onChange({ ...config, [field.key]: e.target.value })}
            />
            {field.hint && <p className="text-[11px] text-slate-400">{field.hint}</p>}
          </div>
        );
      })}
    </div>
  );
}

function formatDateTime(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export default function AdminWorkflowsPage() {
  const { getToken } = useAuth();
  const { role, isLoading: roleLoading } = useRole();

  const [meta, setMeta] = useState<WorkflowMeta | null>(null);
  const [items, setItems] = useState<WorkflowItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm());

  const [executionsFor, setExecutionsFor] = useState<WorkflowItem | null>(null);
  const [executions, setExecutions] = useState<WorkflowExecutionItem[]>([]);
  const [executionsLoading, setExecutionsLoading] = useState(false);
  const [executionsError, setExecutionsError] = useState<string | null>(null);

  const token = useCallback(async (): Promise<string> => {
    const t = await getToken();
    if (!t) throw new Error('Unable to retrieve session token.');
    return t;
  }, [getToken]);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const t = await token();
      const [workflows, metaData] = await Promise.all([listWorkflows(t), fetchWorkflowMeta(t)]);
      setItems(workflows);
      setMeta(metaData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load workflows.');
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    const timer = setTimeout(() => void load(), 0);
    return () => clearTimeout(timer);
  }, [load]);

  const triggerMeta = useMemo(
    () => meta?.triggers.find((t) => t.type === form.triggerType) ?? null,
    [meta, form.triggerType],
  );

  const templatesById = useMemo(() => {
    const map = new Map<string, WorkflowTemplate>();
    meta?.templates.forEach((template) => map.set(template.id, template));
    return map;
  }, [meta]);

  async function loadExecutions(workflow: WorkflowItem) {
    setExecutionsFor(workflow);
    setExecutionsLoading(true);
    setExecutionsError(null);
    try {
      const page = await listWorkflowExecutions(await token(), workflow.id, { page: 1, limit: 50 });
      setExecutions(page.items);
    } catch (err) {
      setExecutionsError(err instanceof Error ? err.message : 'Failed to load executions.');
    } finally {
      setExecutionsLoading(false);
    }
  }

  async function handleRetry(executionId: string) {
    try {
      await retryWorkflowExecution(await token(), executionId);
      if (executionsFor) await loadExecutions(executionsFor);
    } catch (err) {
      setExecutionsError(err instanceof Error ? err.message : 'Failed to retry execution.');
    }
  }

  function startCreate() {
    setEditingId(null);
    setForm(emptyForm());
    setSaveError(null);
    setIsEditing(true);
  }

  function startEdit(workflow: WorkflowItem) {
    setEditingId(workflow.id);
    setForm({
      name: workflow.name,
      description: workflow.description ?? '',
      triggerType: workflow.triggerType,
      triggerConfig: workflow.triggerConfig ?? {},
      conditions: (workflow.conditions ?? []).map((condition) => ({
        field: condition.field,
        operator: condition.operator,
        value: valueToInput(condition.value),
      })),
      actions: (workflow.actions ?? []).map((action) => ({
        type: action.type,
        config: action.config ?? {},
      })),
    });
    setSaveError(null);
    setIsEditing(true);
  }

  function applyTemplate(templateId: string) {
    if (!templateId) return;
    const template = templatesById.get(templateId);
    if (!template) return;
    setForm((prev) => ({
      ...prev,
      triggerType: template.workflow.triggerType,
      triggerConfig: template.workflow.triggerConfig ?? {},
      conditions: (template.workflow.conditions ?? []).map((condition) => ({
        field: condition.field,
        operator: condition.operator,
        value: valueToInput(condition.value),
      })),
      actions: (template.workflow.actions ?? []).map((action) => ({
        type: action.type,
        config: action.config ?? {},
      })),
    }));
  }

  async function save() {
    if (!form.name.trim()) {
      setSaveError('Name is required.');
      return;
    }
    if (!form.triggerType) {
      setSaveError('Choose a trigger (WHEN).');
      return;
    }
    const conditions: WorkflowCondition[] = form.conditions
      .filter((condition) => condition.field && condition.operator)
      .map((condition) => {
        const fieldMeta = meta?.conditionFields.find((f) => f.key === condition.field);
        return {
          field: condition.field as WorkflowCondition['field'],
          operator: condition.operator as WorkflowCondition['operator'],
          value: parseConditionValue(condition, fieldMeta),
        };
      });
    const actions = form.actions.filter((action) => action.type);
    if (actions.length === 0) {
      setSaveError('Add at least one action (THEN).');
      return;
    }

    setSaving(true);
    setSaveError(null);
    try {
      const t = await token();
      const payload = {
        name: form.name.trim(),
        description: form.description.trim() || undefined,
        triggerType: form.triggerType as WorkflowTriggerType,
        triggerConfig: form.triggerConfig,
        conditions,
        actions: actions.map((action) => ({
          type: action.type as WorkflowActionType,
          config: action.config,
        })),
      };
      if (editingId) {
        await updateWorkflow(t, editingId, payload);
      } else {
        await createWorkflow(t, payload);
      }
      setIsEditing(false);
      await load();
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Failed to save workflow.');
    } finally {
      setSaving(false);
    }
  }

  async function handleToggle(workflow: WorkflowItem) {
    try {
      const t = await token();
      await toggleWorkflow(t, workflow.id, !workflow.enabled);
      setItems((prev) =>
        prev.map((item) => (item.id === workflow.id ? { ...item, enabled: !workflow.enabled } : item)),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to toggle workflow.');
    }
  }

  async function handleDelete(workflow: WorkflowItem) {
    if (!window.confirm(`Delete workflow "${workflow.name}"? This also removes its execution history.`)) return;
    try {
      await deleteWorkflow(await token(), workflow.id);
      setItems((prev) => prev.filter((item) => item.id !== workflow.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete workflow.');
    }
  }

  if (roleLoading) {
    return (
      <div className="page-container">
        <div className="space-y-3">
          <div className="h-10 w-64 animate-pulse rounded-lg bg-slate-200" />
          <div className="h-16 w-full animate-pulse rounded-xl bg-slate-200" />
          <div className="h-24 w-full animate-pulse rounded-xl bg-slate-200" />
        </div>
      </div>
    );
  }

  if (!role || !hasMinRole(role, 'admin')) {
    return (
      <div className="page-container flex flex-col items-center justify-center gap-3 py-16 text-center">
        <div className="brand-gradient flex h-14 w-14 items-center justify-center rounded-2xl text-white shadow-sm">
          <IconLock width={24} height={24} />
        </div>
        <p className="text-lg font-semibold tracking-tight text-slate-900">Access denied</p>
        <p className="text-sm text-slate-500">Only Super Admins and Admins can manage automation workflows.</p>
        <Link href="/dashboard">
          <Button variant="outline">Back to Chat</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="page-container">
      <PageHeader
        title="Automation Workflows"
        subtitle="Declarative rules: WHEN a trigger fires AND conditions match, THEN run actions."
        icon={<IconWorkflow width={20} height={20} />}
        actions={
          <Button onClick={startCreate}>
            <IconPlus width={16} height={16} />
            New Workflow
          </Button>
        }
      />

      {isLoading && (
        <div className="space-y-3">
          <div className="h-24 w-full animate-pulse rounded-xl bg-slate-200" />
          <div className="h-24 w-full animate-pulse rounded-xl bg-slate-200" />
        </div>
      )}
      {!isLoading && error && (
        <ErrorState message={error} onRetry={() => void load()} />
      )}
      {!isLoading && !error && items.length === 0 && (
        <EmptyState
          title="No workflows yet"
          description="Create your first rule to automate notifications, messages, task updates and more."
          action={
            <Button size="sm" onClick={startCreate}>
              <IconPlus width={14} height={14} />
              Create Workflow
            </Button>
          }
        />
      )}

      {!isLoading && !error && items.length > 0 && (
        <div className="space-y-3">
          {items.map((workflow) => {
            const trigger = meta?.triggers.find((t) => t.type === workflow.triggerType);
            return (
              <div key={workflow.id} className="rounded-xl border border-slate-200 bg-white p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate text-sm font-semibold text-slate-900">{workflow.name}</p>
                      <Badge variant={workflow.enabled ? 'green' : 'gray'}>
                        {workflow.enabled ? 'Enabled' : 'Disabled'}
                      </Badge>
                      <Badge variant="blue">{trigger?.label ?? workflow.triggerType}</Badge>
                    </div>
                    {workflow.description && (
                      <p className="mt-1 text-xs text-slate-500">{workflow.description}</p>
                    )}
                  </div>
                  <div className="flex shrink-0 items-center gap-1.5">
                    <Button variant="outline" size="sm" onClick={() => void loadExecutions(workflow)}>
                      <IconHistory width={14} height={14} />
                      Executions
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => startEdit(workflow)}>
                      Edit
                    </Button>
                    <Button
                      variant={workflow.enabled ? 'warning' : 'success'}
                      size="sm"
                      onClick={() => void handleToggle(workflow)}
                    >
                      {workflow.enabled ? 'Disable' : 'Enable'}
                    </Button>
                    <Button variant="danger" size="sm" onClick={() => void handleDelete(workflow)}>
                      Delete
                    </Button>
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-xs text-slate-600">
                  <div className="min-w-0">
                    <span className="text-slate-400">WHEN · </span>
                    {trigger?.label ?? workflow.triggerType}
                    {Object.keys(workflow.triggerConfig ?? {}).length > 0 &&
                      ` (${Object.entries(workflow.triggerConfig ?? {})
                        .map(([key, value]) => `${key}=${valueToInput(value)}`)
                        .join(', ')})`}
                  </div>
                  {workflow.conditions.length > 0 && (
                    <div className="min-w-0">
                      <span className="text-slate-400">IF · </span>
                      {workflow.conditions
                        .map(
                          (condition) =>
                            `${condition.field} ${condition.operator}${condition.value !== undefined ? `=${valueToInput(condition.value)}` : ''}`,
                        )
                        .join(' AND ')}
                    </div>
                  )}
                  <div className="min-w-0">
                    <span className="text-slate-400">THEN · </span>
                    {workflow.actions.map((action) => action.type).join(' → ')}
                  </div>
                  <div className="min-w-0 text-slate-400">
                    by {workflow.createdBy} · updated {formatDateTime(workflow.updatedAt)}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {isEditing && meta && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm" role="dialog" aria-modal="true">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-semibold tracking-tight text-slate-900">
                {editingId ? 'Edit Workflow' : 'New Workflow'}
              </h2>
              <Button variant="ghost" size="sm" onClick={() => setIsEditing(false)}>
                Close
              </Button>
            </div>

            <div className="space-y-5">
              {!editingId && (
                <div className="space-y-1.5">
                  <Label>Start from a template</Label>
                  <Select defaultValue="" onChange={(e) => applyTemplate(e.target.value)}>
                    <option value="">Choose a template…</option>
                    {meta.templates.map((template) => (
                      <option key={template.id} value={template.id}>
                        {template.name}
                      </option>
                    ))}
                  </Select>
                  <p className="text-[11px] text-slate-400">
                    Templates pre-fill the trigger, conditions and actions below.
                  </p>
                </div>
              )}

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>
                    Name <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    value={form.name}
                    onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                    placeholder="e.g. Overdue task reminder"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Description</Label>
                  <Input
                    value={form.description}
                    onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
                    placeholder="What does this rule do?"
                  />
                </div>
              </div>

              <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50/60 p-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  WHEN · Trigger
                </p>
                <Select
                  value={form.triggerType}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      triggerType: e.target.value,
                      triggerConfig: {},
                    }))
                  }
                >
                  <option value="">Choose a trigger…</option>
                  {meta.triggers.map((trigger) => (
                    <option key={trigger.type} value={trigger.type}>
                      {trigger.label}
                    </option>
                  ))}
                </Select>
                {triggerMeta && (
                  <>
                    <p className="text-xs text-slate-500">{triggerMeta.description}</p>
                    <ConfigFields
                      fields={triggerMeta.configFields}
                      config={form.triggerConfig}
                      onChange={(next) => setForm((prev) => ({ ...prev, triggerConfig: next }))}
                    />
                  </>
                )}
              </div>

              <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50/60 p-4">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                    IF · Conditions <span className="font-normal normal-case text-slate-400">(all must match — optional)</span>
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setForm((prev) => ({
                        ...prev,
                        conditions: [...prev.conditions, { field: '', operator: 'eq', value: '' }],
                      }))
                    }
                  >
                    <IconPlus width={13} height={13} />
                    Add condition
                  </Button>
                </div>
                {form.conditions.length === 0 && (
                  <p className="text-xs text-slate-400">No conditions — the workflow runs for every matching event.</p>
                )}
                {form.conditions.map((condition, index) => {
                  const fieldMeta = meta.conditionFields.find((f) => f.key === condition.field);
                  return (
                    <div key={index} className="grid grid-cols-1 gap-2 rounded-lg border border-slate-200 bg-white p-3 sm:grid-cols-[1fr_1fr_1fr_auto]">
                      <Select
                        value={condition.field}
                        onChange={(e) => {
                          const next = [...form.conditions];
                          next[index] = { ...condition, field: e.target.value, value: '' };
                          setForm((prev) => ({ ...prev, conditions: next }));
                        }}
                      >
                        <option value="">Field…</option>
                        {meta.conditionFields.map((field) => (
                          <option key={field.key} value={field.key}>
                            {field.label}
                          </option>
                        ))}
                      </Select>
                      <Select
                        value={condition.operator}
                        onChange={(e) => {
                          const next = [...form.conditions];
                          next[index] = { ...condition, operator: e.target.value };
                          setForm((prev) => ({ ...prev, conditions: next }));
                        }}
                      >
                        {meta.conditionOperators.map((operator) => (
                          <option key={operator.key} value={operator.key}>
                            {operator.label}
                          </option>
                        ))}
                      </Select>
                      {fieldMeta?.type === 'select' && condition.operator !== 'in' ? (
                        <Select
                          value={condition.value}
                          onChange={(e) => {
                            const next = [...form.conditions];
                            next[index] = { ...condition, value: e.target.value };
                            setForm((prev) => ({ ...prev, conditions: next }));
                          }}
                        >
                          <option value="">Value…</option>
                          {fieldMeta.options?.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </Select>
                      ) : (
                        <Input
                          type={fieldMeta?.type === 'number' ? 'number' : 'text'}
                          placeholder={condition.operator === 'in' ? 'Comma-separated values' : fieldMeta?.type === 'number' ? 'Number' : 'Value'}
                          value={condition.value}
                          onChange={(e) => {
                            const next = [...form.conditions];
                            next[index] = { ...condition, value: e.target.value };
                            setForm((prev) => ({ ...prev, conditions: next }));
                          }}
                        />
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          setForm((prev) => ({
                            ...prev,
                            conditions: prev.conditions.filter((_, i) => i !== index),
                          }))
                        }
                      >
                        Remove
                      </Button>
                    </div>
                  );
                })}
              </div>

              <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50/60 p-4">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                    THEN · Actions <span className="font-normal normal-case text-slate-400">(run in order)</span>
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setForm((prev) => ({
                        ...prev,
                        actions: [...prev.actions, { type: '', config: {} }],
                      }))
                    }
                  >
                    <IconPlus width={13} height={13} />
                    Add action
                  </Button>
                </div>
                {form.actions.length === 0 && (
                  <p className="text-xs text-slate-400">No actions yet.</p>
                )}
                {form.actions.map((action, index) => {
                  const actionMeta = meta.actions.find((a) => a.type === action.type);
                  return (
                    <div key={index} className="space-y-3 rounded-lg border border-slate-200 bg-white p-3">
                      <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_auto]">
                        <Select
                          value={action.type}
                          onChange={(e) => {
                            const next = [...form.actions];
                            next[index] = { ...action, type: e.target.value, config: {} };
                            setForm((prev) => ({ ...prev, actions: next }));
                          }}
                        >
                          <option value="">Choose an action…</option>
                          {meta.actions.map((actionOption) => (
                            <option key={actionOption.type} value={actionOption.type}>
                              {actionOption.label}
                            </option>
                          ))}
                        </Select>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            setForm((prev) => ({
                              ...prev,
                              actions: prev.actions.filter((_, i) => i !== index),
                            }))
                          }
                        >
                          Remove
                        </Button>
                      </div>
                      {actionMeta && (
                        <div className="space-y-2">
                          <p className="text-xs text-slate-500">{actionMeta.description}</p>
                          <ConfigFields
                            fields={actionMeta.configFields}
                            config={action.config}
                            onChange={(next) => {
                              const updated = [...form.actions];
                              updated[index] = { ...action, config: next };
                              setForm((prev) => ({ ...prev, actions: updated }));
                            }}
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {saveError && <p className="text-xs font-medium text-red-600">{saveError}</p>}

              <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
                <Button variant="outline" onClick={() => setIsEditing(false)}>
                  Cancel
                </Button>
                <Button onClick={() => void save()} disabled={saving}>
                  {saving ? 'Saving…' : editingId ? 'Save changes' : 'Create workflow'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {executionsFor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm" role="dialog" aria-modal="true">
          <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-base font-semibold tracking-tight text-slate-900">
                  Execution history · {executionsFor.name}
                </h2>
                <p className="text-xs text-slate-400">Latest runs, newest first.</p>
              </div>
              <div className="flex items-center gap-1.5">
                <Button variant="outline" size="sm" onClick={() => void loadExecutions(executionsFor)}>
                  <IconRefresh width={14} height={14} />
                  Refresh
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setExecutionsFor(null)}>
                  Close
                </Button>
              </div>
            </div>

            {executionsLoading && (
              <div className="space-y-2">
                <div className="h-16 w-full animate-pulse rounded-xl bg-slate-200" />
                <div className="h-16 w-full animate-pulse rounded-xl bg-slate-200" />
              </div>
            )}
            {!executionsLoading && executionsError && (
              <ErrorState message={executionsError} onRetry={() => executionsFor && void loadExecutions(executionsFor)} />
            )}
            {!executionsLoading && !executionsError && executions.length === 0 && (
              <EmptyState title="No executions yet" description="Runs recorded here as events trigger this workflow." />
            )}
            {!executionsLoading && !executionsError && executions.length > 0 && (
              <div className="space-y-3">
                {executions.map((execution) => (
                  <div key={execution.id} className="rounded-xl border border-slate-200 p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex min-w-0 flex-wrap items-center gap-2">
                        <Badge variant={EXECUTION_VARIANT[execution.status]}>{STATUS_LABEL[execution.status]}</Badge>
                        <span className="truncate font-mono text-xs text-slate-500">{execution.eventKey}</span>
                        {execution.retryCount > 0 && (
                          <Badge variant="amber">retry ×{execution.retryCount}</Badge>
                        )}
                      </div>
                      <span className="text-xs text-slate-400">{formatDateTime(execution.createdAt)}</span>
                    </div>
                    {execution.error && (
                      <p className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{execution.error}</p>
                    )}
                    {execution.actionResults.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {execution.actionResults.map((result, i) => (
                          <Badge key={i} variant={result.ok ? 'green' : 'red'}>
                            {result.type}: {result.ok ? 'ok' : 'failed'}
                          </Badge>
                        ))}
                      </div>
                    )}
                    <div className="mt-2 flex items-center justify-between gap-2">
                      <span className="text-[11px] text-slate-400">
                        Started {formatDateTime(execution.startedAt)} · Finished {formatDateTime(execution.finishedAt)}
                      </span>
                      {execution.status === 'failed' && (
                        <Button size="sm" variant="outline" onClick={() => void handleRetry(execution.id)}>
                          Retry
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}