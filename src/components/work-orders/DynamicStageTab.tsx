import { SaveIndicator, AutoSaveInput } from './AtpShared';
import { FileUploadZone } from './FileUploadZone';
import { GenericChecklist } from './GenericChecklist';
import {
  type StageDef, type StageField,
  getStageFields, getSubstepFields, normaliseFieldType,
} from '../../config/projectTypeConfig';

interface Props {
  stage: StageDef;
  localWo: any;
  handleFieldSave: (field: string, value: any) => Promise<boolean>;
  handleUpdateStage: (stage: string) => Promise<void>;
  saveStatus: 'idle' | 'saving' | 'saved' | 'error';
  canEdit: boolean;
  onFileUpload: (category: 'document' | 'photo', files: FileList | File[] | null, tag?: string) => Promise<void>;
}

// Build an accept attribute from comma-separated extensions
const buildAccept = (csv?: string): string | undefined => {
  if (!csv) return undefined;
  const exts = csv.split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
  if (exts.length === 0) return undefined;
  return exts.map(ext => `.${ext.replace(/^\./, '')}`).join(',');
};

const buildHint = (f: StageField, fallback: string): string => {
  if (f.placeholder) return f.placeholder;
  if (f.accept) {
    return `${f.accept.split(',').map(s => s.trim().toUpperCase()).join(', ')} — drag & drop atau klik`;
  }
  return fallback;
};

const renderField = (
  f: StageField,
  localWo: any,
  handleFieldSave: (field: string, value: any) => Promise<boolean>,
  canEdit: boolean,
  onFileUpload: Props['onFileUpload'],
  tagPrefix: string,
) => {
  const t = normaliseFieldType(f.type);
  const fullTag = `${tagPrefix}_${f.key}`;

  if (t === 'file_upload' || t === 'photo_upload') {
    const isPhoto = t === 'photo_upload';
    const category: 'document' | 'photo' = isPhoto ? 'photo' : 'document';
    return (
      <FileUploadZone
        key={f.key}
        label={f.label}
        hint={buildHint(f, isPhoto ? 'JPG, PNG — drag & drop atau klik' : 'PDF, DOCX, XLSX, JPG, PNG — drag & drop atau klik')}
        accept={isPhoto ? 'image/jpeg,image/png' : buildAccept(f.accept)}
        multiple={f.multiple ?? true}
        capture={isPhoto && f.allow_camera ? 'environment' : undefined}
        icon={isPhoto ? 'image' : 'document'}
        compact={isPhoto}
        onUpload={async files => {
          await onFileUpload(category, files, fullTag);
          const names = files ? Array.from(files).map(file => file.name).join(', ') : '';
          await handleFieldSave(f.key, names);
        }}
      />
    );
  }

  // Map config type → AutoSaveInput type
  const inputType =
    t === 'datetime' ? 'datetime-local'
    : t === 'dropdown' ? 'select'
    : t === 'toggle' ? 'checkbox'
    : t === 'textarea' ? 'textarea'
    : t === 'time' ? 'time'
    : t === 'number' ? 'number'
    : t === 'date' ? 'date'
    : 'text';

  return (
    <AutoSaveInput
      key={f.key}
      label={f.label + (f.required ? ' *' : '')}
      value={localWo[f.key]}
      field={f.key}
      type={inputType}
      options={f.options?.map(o => ({ label: o, value: o }))}
      onSave={handleFieldSave}
      locked={!canEdit}
    />
  );
};

export const DynamicStageTab = ({
  stage,
  localWo,
  handleFieldSave,
  handleUpdateStage,
  saveStatus,
  canEdit,
  onFileUpload,
}: Props) => {
  const stageFields = getStageFields(stage);

  if (stage.has_substeps) {
    const stepsData = localWo[`${stage.key}_steps`] || {};

    return (
      <div className="animate-in fade-in">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-black text-slate-800">{stage.label}</h2>
          <SaveIndicator status={saveStatus} />
        </div>

        {/* Stage-level fields (above checklist) */}
        {stageFields.length > 0 && (
          <div className="mb-6 grid grid-cols-1 lg:grid-cols-2 gap-x-12">
            {stageFields.map(f => renderField(f, localWo, handleFieldSave, canEdit, onFileUpload, stage.key))}
          </div>
        )}

        <GenericChecklist
          siteId={localWo.site_id}
          dbRecordId={localWo.id}
          stageKey={stage.key}
          substepsDef={stage.substeps}
          substepsData={stepsData}
          onUpdate={async (data) => { await handleFieldSave(`${stage.key}_steps`, data); }}
          onMarkSelesai={async () => {
            await handleUpdateStage(`${stage.key}_done`);
            await handleFieldSave(`${stage.key}_status`, 'Selesai');
          }}
          canEdit={canEdit}
          onFileUpload={onFileUpload}
        />

        {/* Per-substep fields (shared schema applied to each substep) */}
        {stage.substeps.some(ss => getSubstepFields(stage, ss).length > 0) && (
          <div className="mt-8 space-y-6">
            {stage.substeps.map(ss => {
              const fields = getSubstepFields(stage, ss);
              if (fields.length === 0) return null;
              const tagPrefix = `${stage.key}_${ss.key}`;
              return (
                <div key={ss.key} className="space-y-3 p-4 border border-slate-200 rounded-xl bg-slate-50">
                  <p className="text-sm font-semibold text-slate-800">{ss.label}</p>
                  {ss.description && <p className="text-[11px] text-slate-500">{ss.description}</p>}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-12">
                    {fields.map(f => {
                      // Field values are namespaced per-substep so multiple substeps don't collide
                      const wrappedWo = { ...localWo, [f.key]: localWo[`${tagPrefix}_${f.key}`] };
                      const wrappedSave = async (key: string, val: any) =>
                        handleFieldSave(`${tagPrefix}_${key}`, val);
                      return renderField(f, wrappedWo, wrappedSave, canEdit, onFileUpload, tagPrefix);
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // Stage without substeps — two-column field grid
  const mid = Math.ceil(stageFields.length / 2);
  const col1 = stageFields.slice(0, mid);
  const col2 = stageFields.slice(mid);

  return (
    <div className="animate-in fade-in">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-black text-slate-800">{stage.label}</h2>
        <SaveIndicator status={saveStatus} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-12 mb-8">
        <div>{col1.map(f => renderField(f, localWo, handleFieldSave, canEdit, onFileUpload, stage.key))}</div>
        <div>{col2.map(f => renderField(f, localWo, handleFieldSave, canEdit, onFileUpload, stage.key))}</div>
      </div>
    </div>
  );
};
