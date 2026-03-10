import { useState, useEffect } from 'react';
import { X, DollarSign, Clock, ChevronDown, ChevronUp } from 'lucide-react';
import clsx from 'clsx';
import { type Site, type TerminPengajuan, type SiteFile } from '../../data/mockData';

// Stage → Termin unlock mapping
export const STAGE_TERMIN_MAP: {
    stage: string;
    terminKey: 'T1' | 'T2a' | 'T2b' | 'T2c' | 'T3' | 'T4';
    label: string;
    pct: number;
    triggerLabel: string;
    contextKeys: string[];
}[] = [
    { stage: 'permit_ready',  terminKey: 'T1',  label: 'T1 (30%)', pct: 30, triggerLabel: 'Permit sudah ready', contextKeys: ['permit'] },
    { stage: 'rfi_done',      terminKey: 'T2a', label: 'T2a (15%)', pct: 15, triggerLabel: 'CI/CO selesai', contextKeys: ['rfi', 'implementasi'] },
    { stage: 'rfs_done',      terminKey: 'T2b', label: 'T2b (25%)', pct: 25, triggerLabel: 'RFS selesai', contextKeys: ['rfs'] },
    { stage: 'dokumen_done',  terminKey: 'T2c', label: 'T2c (10%)', pct: 10, triggerLabel: 'Dokumen pekerjaan submit', contextKeys: ['dokumen'] },
    { stage: 'bast',          terminKey: 'T3',  label: 'T3 (10%)', pct: 10, triggerLabel: 'BAST selesai', contextKeys: ['bast'] },
    { stage: 'invoice',       terminKey: 'T4',  label: 'T4 (10%)', pct: 10, triggerLabel: 'Invoice dikirim', contextKeys: ['invoice'] },
];

const STAGE_ORDER_LIST = [
    'imported', 'assigned', 'permit_process', 'permit_ready',
    'akses_process', 'akses_ready', 'implementasi',
    'rfi_done', 'rfs_done', 'dokumen_done', 'bast', 'invoice', 'completed'
] as const;

function isStageReached(currentStage: string, targetStage: string): boolean {
    const currentIdx = STAGE_ORDER_LIST.indexOf(currentStage as typeof STAGE_ORDER_LIST[number]);
    const targetIdx = STAGE_ORDER_LIST.indexOf(targetStage as typeof STAGE_ORDER_LIST[number]);
    if (currentIdx === -1 || targetIdx === -1) return false;
    return currentIdx >= targetIdx;
}

interface PaymentPromptCardProps {
    site: Site;
    localStage: string;
    localPengajuan: TerminPengajuan[];
    localFiles: SiteFile[];
    onAjukan: (terminKey: 'T1' | 'T2a' | 'T2b' | 'T2c' | 'T3' | 'T4', nominal: number, contextKeys: string[]) => void;
}

interface PromptItem {
    terminKey: 'T1' | 'T2a' | 'T2b' | 'T2c' | 'T3' | 'T4';
    label: string;
    pct: number;
    triggerLabel: string;
    contextKeys: string[];
    pengajuan?: TerminPengajuan;
}

const PromptCard = ({
    item,
    site,
    onAjukan,
    onDismiss,
}: {
    item: PromptItem;
    site: Site;
    onAjukan: () => void;
    onDismiss: () => void;
}) => {
    const estimatedAmount = site.budget > 0 ? Math.round(site.budget * item.pct / 100) : 0;

    // Already submitted / approved / paid
    if (item.pengajuan) {
        const p = item.pengajuan;
        const isApproved = p.status === 'approved' || p.status === 'paid';
        const dateStr = new Date(p.submitted_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
        return (
            <div className="flex items-center justify-between bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 gap-4">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                        <Clock className="w-4 h-4 text-blue-500" />
                    </div>
                    <div>
                        <span className="font-semibold text-blue-800 text-sm">
                            {item.label} — {isApproved ? '✓ Disetujui' : '⏳ Menunggu Approval'}
                        </span>
                        <p className="text-xs text-blue-600 mt-0.5">
                            Diajukan {dateStr} • Rp {p.nominal.toLocaleString('id-ID')}
                        </p>
                    </div>
                </div>
                <button className="text-xs text-blue-500 hover:text-blue-700 font-medium shrink-0 border border-blue-200 px-2.5 py-1 rounded-lg hover:bg-blue-100 transition-colors">
                    Lihat →
                </button>
            </div>
        );
    }

    // Ready to submit
    return (
        <div className="relative border-l-4 border-amber-400 bg-amber-50 rounded-r-xl rounded-tl-xl px-5 py-4 flex flex-col sm:flex-row sm:items-center gap-4 shadow-sm">
            <div className="flex items-start gap-3 flex-1">
                <div className="w-9 h-9 rounded-full bg-amber-100 flex items-center justify-center shrink-0 mt-0.5">
                    <DollarSign className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                    <p className="font-bold text-amber-900 text-sm flex items-center gap-2">
                        💰 {item.label} Siap Diajukan
                    </p>
                    <p className="text-amber-700 text-xs mt-0.5">
                        {item.triggerLabel}.{estimatedAmount > 0 ? ` Estimasi Rp ${estimatedAmount.toLocaleString('id-ID')}.` : ''} Dapat diajukan sekarang.
                    </p>
                </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
                <button
                    onClick={onAjukan}
                    className="px-4 py-1.5 bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold rounded-lg shadow-sm transition-colors"
                >
                    Ajukan Sekarang →
                </button>
                <button
                    onClick={onDismiss}
                    className="px-3 py-1.5 text-amber-700 hover:bg-amber-100 text-sm font-medium rounded-lg transition-colors border border-amber-200"
                >
                    Nanti saja
                </button>
                <button
                    onClick={onDismiss}
                    className="p-1.5 text-amber-500 hover:text-amber-700 hover:bg-amber-100 rounded-full transition-colors"
                    aria-label="Dismiss"
                >
                    <X className="w-4 h-4" />
                </button>
            </div>
        </div>
    );
};

const PaymentPromptCard = ({ site, localStage, localPengajuan, localFiles: _localFiles, onAjukan }: PaymentPromptCardProps) => {
    const [dismissed, setDismissed] = useState<Set<string>>(() => {
        try {
            const raw = localStorage.getItem(`prompt_dismissed_${site.id}`);
            return raw ? new Set(JSON.parse(raw)) : new Set<string>();
        } catch { return new Set<string>(); }
    });
    const [showAll, setShowAll] = useState(false);

    const dismiss = (terminKey: string) => {
        setDismissed(prev => {
            const next = new Set(prev);
            next.add(`${terminKey}_${localStage}`);
            localStorage.setItem(`prompt_dismissed_${site.id}`, JSON.stringify([...next]));
            return next;
        });
    };

    // Build list of items to show
    const items: PromptItem[] = STAGE_TERMIN_MAP.filter(def => {
        if (!isStageReached(localStage, def.stage)) return false;
        const dismissKey = `${def.terminKey}_${localStage}`;
        if (dismissed.has(dismissKey)) return false;
        return true;
    }).map(def => {
        const pengajuan = localPengajuan.find(p =>
            p.termin_key === def.terminKey &&
            ['submitted', 'approved', 'paid'].includes(p.status)
        );
        return {
            terminKey: def.terminKey,
            label: def.label,
            pct: def.pct,
            triggerLabel: def.triggerLabel,
            contextKeys: def.contextKeys,
            pengajuan,
        };
    });

    // Reset dismissed when stage changes
    useEffect(() => {
        setDismissed(new Set());
    }, [localStage]);

    if (items.length === 0) return null;

    const MAX_VISIBLE = 2;
    const visibleItems = showAll ? items : items.slice(0, MAX_VISIBLE);
    const hiddenCount = items.length - MAX_VISIBLE;

    return (
        <div className="space-y-2">
            {visibleItems.map(item => (
                <PromptCard
                    key={item.terminKey}
                    item={item}
                    site={site}
                    onAjukan={() => {
                        const estimatedAmount = site.budget > 0 ? Math.round(site.budget * item.pct / 100) : 0;
                        onAjukan(item.terminKey, estimatedAmount, item.contextKeys);
                    }}
                    onDismiss={() => dismiss(item.terminKey)}
                />
            ))}
            {!showAll && hiddenCount > 0 && (
                <button
                    onClick={() => setShowAll(true)}
                    className={clsx(
                        "w-full text-center text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200",
                        "rounded-lg py-2 hover:bg-amber-100 transition-colors flex items-center justify-center gap-1"
                    )}
                >
                    <ChevronDown className="w-3.5 h-3.5" />
                    + {hiddenCount} termin lainnya siap diajukan
                </button>
            )}
            {showAll && hiddenCount > 0 && (
                <button
                    onClick={() => setShowAll(false)}
                    className="w-full text-center text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded-lg py-2 hover:bg-amber-100 transition-colors flex items-center justify-center gap-1"
                >
                    <ChevronUp className="w-3.5 h-3.5" />
                    Sembunyikan
                </button>
            )}
        </div>
    );
};

export default PaymentPromptCard;
