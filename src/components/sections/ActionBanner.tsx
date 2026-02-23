import { useAuth } from '../../context/AuthContext';
import { ChevronRight, CheckCircle2, Clock, Upload } from 'lucide-react';
import clsx from 'clsx';

interface ActionBannerProps {
    type: 'FILTER' | 'COMBAT';
    activeTermName: string;
    activeTermStep: number;
    activeTermStatus: string;
    onClickAction: () => void;
}

export const ActionBanner = ({ activeTermName, activeTermStatus, onClickAction }: ActionBannerProps) => {
    const { currentUser } = useAuth();
    const role = currentUser.role;

    if (!activeTermName || activeTermStatus === 'paid') return null;
    if (activeTermStatus === 'locked') return null;

    let bannerMessage = '';
    let buttonText = '';
    let buttonIcon = null;
    let buttonStyle = '';
    let isWaiting = false;

    if (activeTermStatus === 'pending' || activeTermStatus === 'open') {
        if (role === 'team_leader') {
            bannerMessage = `${activeTermName} siap diajukan. Lengkapi dokumen dan submit pengajuan.`;
            buttonText = `Ajukan ${activeTermName}`;
            buttonStyle = 'bg-blue-600 hover:bg-blue-700 text-white';
        } else {
            bannerMessage = `${activeTermName} sedang berjalan. Tim lapangan sedang menyiapkan dokumen.`;
            isWaiting = true;
        }
    } else if (activeTermStatus === 'pengajuan' || activeTermStatus === 'submitted') {
        if (role === 'management') {
            bannerMessage = `${activeTermName} telah diajukan dan menunggu persetujuan Anda.`;
            buttonText = 'Review & Setujui';
            buttonStyle = 'bg-emerald-600 hover:bg-emerald-700 text-white';
        } else {
            bannerMessage = `${activeTermName} sedang direview oleh Management.`;
            isWaiting = true;
        }
    } else if (activeTermStatus === 'approved') {
        if (role === 'finance') {
            bannerMessage = `${activeTermName} telah disetujui. Upload bukti pembayaran untuk menyelesaikan termin.`;
            buttonText = 'Proses Pembayaran';
            buttonIcon = <Upload className="w-4 h-4" />;
            buttonStyle = 'bg-emerald-600 hover:bg-emerald-700 text-white';
        } else {
            bannerMessage = `${activeTermName} telah disetujui, menunggu pembayaran dari Finance.`;
            isWaiting = true;
        }
    } else if (activeTermStatus === 'rejected') {
        if (role === 'team_leader') {
            bannerMessage = `Pengajuan ${activeTermName} ditolak. Harap perbaiki dokumen Anda.`;
            buttonText = 'Revisi Sekarang';
            buttonStyle = 'bg-amber-500 hover:bg-amber-600 text-white';
        } else {
            bannerMessage = `Pengajuan ${activeTermName} ditolak. Menunggu revisi dari tim lapangan.`;
            isWaiting = true;
        }
    } else {
        return null;
    }

    if (!bannerMessage) return null;

    return (
        <div className="w-full bg-blue-600/[0.08] border border-blue-600/20 border-l-[3px] border-l-blue-600 rounded-r-lg p-5 mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm animate-in fade-in slide-in-from-top-2">
            <div>
                <h4 className="font-bold text-blue-600 flex items-center gap-2 mb-1">
                    {isWaiting ? <Clock className="w-4 h-4 text-blue-600" /> : <CheckCircle2 className="w-4 h-4 text-blue-600" />}
                    Action Required
                </h4>
                <p className="text-blue-600/90 text-sm">{bannerMessage}</p>
            </div>
            {!isWaiting && buttonText && (
                <button 
                    onClick={onClickAction}
                    className={clsx("px-4 py-2.5 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 transition-colors shadow-sm", buttonStyle)}
                >
                    {buttonIcon}
                    {buttonText} {(!buttonIcon) && <ChevronRight className="w-4 h-4" />}
                </button>
            )}
        </div>
    );
};
