import React, { useState, useRef } from 'react';
import { X, FileSpreadsheet, AlertCircle, ArrowRight, CheckCircle2 } from 'lucide-react';
import clsx from 'clsx';
import * as XLSX from 'xlsx';

interface TeamPeopleImportModalProps {
    isOpen: boolean;
    onClose: () => void;
    onImportComplete: (results: any) => void;
    targetType: 'people' | 'teams';
}

type Step = 'upload' | 'mapping' | 'normalize' | 'preview';

interface ColumnMapping {
    [systemField: string]: string; // Maps system field (e.g., 'nama') to Excel header (e.g., 'Name')
}

export default function TeamPeopleImportModal({ isOpen, onClose, onImportComplete, targetType }: TeamPeopleImportModalProps) {
    const [step, setStep] = useState<Step>('upload');
    const [file, setFile] = useState<File | null>(null);
    const [rawData, setRawData] = useState<any[]>([]);
    const [headers, setHeaders] = useState<string[]>([]);
    
    // Config
    const [headerRowIdx, setHeaderRowIdx] = useState<number>(1); // 1-indexed for user
    
    // Mapping
    const [mapping, setMapping] = useState<ColumnMapping>({});
    
    // Normalization Map (Excel Value -> System Role)
    const [roleMap, setRoleMap] = useState<Record<string, string>>({});
    const [uniqueRoles, setUniqueRoles] = useState<string[]>([]);

    const fileInputRef = useRef<HTMLInputElement>(null);

    if (!isOpen) return null;

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (!selectedFile) return;
        setFile(selectedFile);
        
        const reader = new FileReader();
        reader.onload = (evt) => {
            const bstr = evt.target?.result;
            const wb = XLSX.read(bstr, { type: 'binary' });
            const wsname = wb.SheetNames[0];
            const ws = wb.Sheets[wsname];
            
            // Read raw array of arrays to let user pick header row
            const data = XLSX.utils.sheet_to_json(ws, { header: 1 });
            setRawData(data);
            
            // Auto-detect headers from first non-empty row
            let initialHeaderIdx = 0;
            for (let i = 0; i < Math.min(10, data.length); i++) {
                if ((data[i] as any[]).length > 2) { // arbitrary guess for header row
                    initialHeaderIdx = i;
                    break;
                }
            }
            setHeaderRowIdx(initialHeaderIdx + 1);
            extractHeaders(data, initialHeaderIdx);
        };
        reader.readAsBinaryString(selectedFile);
    };

    const extractHeaders = (data: any[], rowIdx: number) => {
        if (data[rowIdx]) {
            const h = (data[rowIdx] as any[]).map(String);
            setHeaders(h);
            
            // Auto mapping guess
            const autoMap: ColumnMapping = {};
            h.forEach(header => {
                const hl = header.toLowerCase();
                if (hl.includes('nama') || hl.includes('name')) autoMap['name'] = header;
                if (hl.includes('ktp') || hl.includes('nik')) autoMap['nik'] = header;
                if (hl.includes('hp') || hl.includes('telp')) autoMap['phone'] = header;
                if (hl.includes('email')) autoMap['email'] = header;
                if (hl.includes('jabatan') || hl.includes('posisi')) autoMap['role'] = header;
                if (hl.includes('regional')) autoMap['regional'] = header;
                if (hl.includes('pekerjaan') || hl.includes('project')) autoMap['project_type'] = header;
                if (hl.includes('tanggal') && hl.includes('lahir')) autoMap['birth_date'] = header;
                if (hl.includes('tempat') && hl.includes('lahir')) autoMap['birth_place'] = header;
                if (hl.includes('agama')) autoMap['religion'] = header;
                if (hl.includes('kelamin')) autoMap['gender'] = header;
                if (hl.includes('sertifikat')) autoMap['certificate'] = header;
                if (hl.includes('expired')) autoMap['certificate_expired'] = header;
                if (hl.includes('alamat') && !hl.includes('email')) autoMap['address'] = header;
            });
            setMapping(autoMap);
        }
    };

    const handleHeaderRowChange = (val: number) => {
        setHeaderRowIdx(val);
        extractHeaders(rawData, val - 1);
    };

    const goToMapping = () => {
        setStep('mapping');
    };

    const goToNormalize = () => {
        if (!mapping['role']) {
            // If no role mapped, skip normalization
            goToPreview();
            return;
        }

        const roleColIdx = headers.indexOf(mapping['role']);
        const roles = new Set<string>();
        
        for (let i = headerRowIdx; i < rawData.length; i++) {
            const row = rawData[i];
            if (row && row[roleColIdx]) {
                roles.add(String(row[roleColIdx]).trim());
            }
        }
        
        setUniqueRoles(Array.from(roles));
        
        // Auto-guess role mapping
        const initialRoleMap: Record<string, string> = {};
        Array.from(roles).forEach(r => {
            const rl = r.toLowerCase();
            if (rl.includes('lead') || rl.includes('koor')) initialRoleMap[r] = 'Leader';
            else if (rl.includes('eng') || rl.includes('teknisi')) initialRoleMap[r] = 'Engineer';
            else if (rl.includes('sitac')) initialRoleMap[r] = 'SITAC';
            else if (rl.includes('trans')) initialRoleMap[r] = 'Transport';
            else initialRoleMap[r] = 'Member';
        });
        setRoleMap(initialRoleMap);
        
        setStep('normalize');
    };

    const goToPreview = () => {
        setStep('preview');
    };

    const processImport = () => {
        // In reality, we'd send mapped data + role map to backend.
        // For mock:
        let processedCount = 0;
        for (let i = headerRowIdx; i < rawData.length; i++) {
            if (rawData[i] && rawData[i].length > 0) processedCount++;
        }
        
        onImportComplete({
            success: true,
            totalRows: processedCount,
            message: `Berhasil memproses ${processedCount} baris data.`
        });
        onClose();
    };

    // --- Render Helpers ---
    
    const requiredSystemFields = targetType === 'people' 
        ? ['name', 'nik'] 
        : ['name', 'role']; // Just examples

    const systemFields = [
        { id: 'name', label: 'Nama / Name', required: true },
        { id: 'birth_date', label: 'Tanggal Lahir', required: false },
        { id: 'birth_place', label: 'Tempat Lahir', required: false },
        { id: 'religion', label: 'Agama', required: false },
        { id: 'gender', label: 'Jenis Kelamin', required: false },
        { id: 'nik', label: 'No. KTP / NIK', required: targetType === 'people' },
        { id: 'phone', label: 'No. HP', required: false },
        { id: 'email', label: 'Email', required: false },
        { id: 'role', label: 'Jabatan Lapangan', required: false },
        { id: 'certificate', label: 'Sertifikat', required: false },
        { id: 'certificate_expired', label: 'Expired Sertifikat', required: false },
        { id: 'regional', label: 'Regional', required: false },
        { id: 'project_type', label: 'Pekerjaan / Project Type', required: false },
        { id: 'address', label: 'Alamat', required: false },
    ];

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl flex flex-col max-h-[90vh] overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-slate-200">
                    <div>
                        <h2 className="text-xl font-bold text-slate-800">
                            Import {targetType === 'people' ? 'Data Orang/Pekerja' : 'Data Tim & Anggota'}
                        </h2>
                        <p className="text-sm text-slate-500 mt-1">Multi-step excel importer with dynamic column mapping</p>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-2 rounded-full hover:bg-slate-100 transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Stepper */}
                <div className="bg-slate-50 border-b border-slate-200 px-6 py-3 flex gap-2 overflow-x-auto text-sm">
                    {['Upload', 'Mapping', 'Normalize', 'Preview'].map((s, i) => {
                        const sLower = s.toLowerCase() as Step;
                        const isActive = step === sLower;
                        const isPast = ['upload', 'mapping', 'normalize', 'preview'].indexOf(step) > i;
                        
                        return (
                            <div key={s} className="flex items-center gap-2">
                                <div className={clsx(
                                    "px-3 py-1 rounded-full font-medium border text-xs",
                                    isActive ? "bg-blue-600 text-white border-blue-600" :
                                    isPast ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                                    "bg-white text-slate-500 border-slate-200"
                                )}>
                                    {isPast ? <CheckCircle2 className="w-3.5 h-3.5 inline mr-1" /> : (i+1)} {s}
                                </div>
                                {i < 3 && <ArrowRight className="w-4 h-4 text-slate-300" />}
                            </div>
                        )
                    })}
                </div>

                {/* Content Body */}
                <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50 h-[500px]">
                    
                    {step === 'upload' && (
                        <div className="space-y-6 max-w-2xl mx-auto mt-8">
                            <div className="border-2 border-dashed border-slate-300 rounded-xl p-12 text-center bg-white hover:border-blue-500 transition-colors cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                                <FileSpreadsheet className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                                <h3 className="text-lg font-semibold text-slate-700">Pilih File Excel (.xlsx)</h3>
                                <p className="text-sm text-slate-500 mt-2">Dukung format apapun. Mapping kolom dilakukan di tahap selanjutnya.</p>
                                <input type="file" ref={fileInputRef} className="hidden" accept=".xlsx, .xls, .csv" onChange={handleFileUpload} />
                            </div>

                            {file && rawData.length > 0 && (
                                <div className="bg-white p-6 rounded-xl border border-blue-100 ring-4 ring-blue-50 animate-in fade-in slide-in-from-bottom-4">
                                    <h4 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
                                        <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                                        File {file.name} Terbaca ({rawData.length} baris)
                                    </h4>
                                    
                                    <div className="space-y-3">
                                        <label className="block text-sm font-medium text-slate-700">Pilih Baris Header (Judul Kolom):</label>
                                        <div className="flex gap-4 items-center">
                                            <input 
                                                type="number" 
                                                min={1} 
                                                max={15} 
                                                value={headerRowIdx}
                                                onChange={(e) => handleHeaderRowChange(parseInt(e.target.value))}
                                                className="w-20 px-3 py-2 border border-slate-300 rounded focus:border-blue-500"
                                            />
                                            <span className="text-sm text-slate-500">Pilih baris ke berapa yang berisi judul kolom.</span>
                                        </div>

                                        {headers.length > 0 && (
                                            <div className="mt-4 p-4 bg-slate-50 rounded border border-slate-200">
                                                <p className="text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wider">Preview Header:</p>
                                                <div className="flex flex-wrap gap-2">
                                                    {headers.map((h, i) => (
                                                        <span key={i} className="px-2 py-1 bg-white border border-slate-200 rounded text-xs text-slate-700 font-mono shadow-sm">
                                                            {h}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    <div className="mt-6 flex justify-end">
                                        <button onClick={goToMapping} className="px-6 py-2 bg-blue-600 text-white rounded font-medium hover:bg-blue-700 transition flex items-center gap-2 shadow-sm relative overflow-hidden group">
                                            Lanjut Mapping Kolom <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {step === 'mapping' && (
                        <div className="space-y-6">
                            <div className="bg-blue-50 border border-blue-100 p-4 rounded-lg flex items-start gap-3">
                                <AlertCircle className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                                <div>
                                    <h4 className="font-medium text-blue-900">Petakan Kolom Excel ke Sistem</h4>
                                    <p className="text-sm text-blue-700 mt-1">Sistem otomatis menebak kolom berdasarkan nama header. Sesuaikan jika ada yang salah.</p>
                                </div>
                            </div>

                            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                                <table className="w-full text-left text-sm">
                                    <thead className="bg-slate-50 border-b border-slate-200">
                                        <tr>
                                            <th className="px-6 py-3 font-semibold text-slate-700 w-1/3">Field Sistem</th>
                                            <th className="px-6 py-3 font-semibold text-slate-700 w-1/3">Kolom di Excel</th>
                                            <th className="px-6 py-3 font-semibold text-slate-700">Preview Data (Baris Pertama)</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {systemFields.filter(sf => targetType === 'teams' ? true : sf.id !== 'team_name').map((sf) => {
                                            const selectedHeader = mapping[sf.id] || '';
                                            const headerIdx = headers.indexOf(selectedHeader);
                                            // Get first data row preview
                                            const previewData = headerIdx >= 0 && rawData[headerRowIdx] ? String(rawData[headerRowIdx][headerIdx] || '') : '-';

                                            return (
                                                <tr key={sf.id} className={clsx("hover:bg-slate-50 transition-colors", sf.required && !selectedHeader ? "bg-red-50/50" : "")}>
                                                    <td className="px-6 py-4">
                                                        <span className="font-medium text-slate-800">{sf.label}</span>
                                                        {sf.required && <span className="text-red-500 ml-1">*</span>}
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <select 
                                                            className={clsx(
                                                                "w-full px-3 py-2 rounded text-sm transition-colors",
                                                                sf.required && !selectedHeader ? "border-red-300 ring-2 ring-red-100 bg-white" : "border-slate-300 border bg-white focus:border-blue-500"
                                                            )}
                                                            value={selectedHeader}
                                                            onChange={(e) => setMapping({ ...mapping, [sf.id]: e.target.value })}
                                                        >
                                                            <option value="">-- Abaikan (Tidak diimport) --</option>
                                                            {headers.map(h => (
                                                                <option key={h} value={h}>{h}</option>
                                                            ))}
                                                        </select>
                                                    </td>
                                                    <td className="px-6 py-4 text-slate-500 font-mono text-xs truncate max-w-[200px]" title={previewData}>
                                                        {selectedHeader ? previewData : '-'}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {step === 'normalize' && (
                        <div className="space-y-6">
                            <div className="bg-amber-50 border border-amber-100 p-4 rounded-lg flex items-start gap-3">
                                <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                                <div>
                                    <h4 className="font-medium text-amber-900">Normalisasi Jabatan Lapangan</h4>
                                    <p className="text-sm text-amber-800 mt-1">Sistem mendeteksi {uniqueRoles.length} nilai unik pada kolom peran. Petakan ke peran standar sistem agar logic Leader/Anggota berjalan benar.</p>
                                </div>
                            </div>

                            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                                <table className="w-full text-left text-sm">
                                    <thead className="bg-slate-50 border-b border-slate-200">
                                        <tr>
                                            <th className="px-6 py-3 font-semibold text-slate-700 w-1/2">Nama Jabatan di Excel</th>
                                            <th className="px-6 py-3 font-semibold text-slate-700 w-1/2">Jabatan Baku Sistem</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {uniqueRoles.map(roleStr => (
                                            <tr key={roleStr}>
                                                <td className="px-6 py-4 font-mono text-slate-600 bg-slate-50/50">
                                                    "{roleStr}"
                                                </td>
                                                <td className="px-6 py-4">
                                                    <select 
                                                        className="w-full px-3 py-2 border border-slate-300 rounded focus:border-blue-500 text-sm bg-white"
                                                        value={roleMap[roleStr] || 'Member'}
                                                        onChange={(e) => setRoleMap({...roleMap, [roleStr]: e.target.value})}
                                                    >
                                                        <option value="Leader">Leader (👑 Otomatis jadi Field Lead)</option>
                                                        <option value="Engineer">Engineer</option>
                                                        <option value="Member">Member Biasa</option>
                                                        <option value="Transport">Transport / Supir</option>
                                                        <option value="SITAC">SITAC / Perizinan</option>
                                                        <option value="Lainnya">Lainnya</option>
                                                    </select>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {step === 'preview' && (
                        <div className="space-y-6">
                            <div className="bg-emerald-50 border border-emerald-100 p-6 rounded-xl text-center">
                                <h3 className="text-xl font-bold text-emerald-800 mb-2">Data Siap Diimpor!</h3>
                                <p className="text-emerald-700">
                                    Ditemukan <strong>{rawData.length - headerRowIdx}</strong> baris data valid.
                                    Sistem akan otomatis mengekstrak informasi <strong>PEKERJAAN / Project Type</strong> untuk mengelompokkan personel, dengan nama Tim dibuat otomatis mengikuti nama Leader-nya (misal: "Tim Ervin").
                                </p>
                            </div>
                            
                            <div className="bg-white rounded-xl border border-slate-200 p-6">
                                <h4 className="font-semibold text-slate-800 mb-4">Summary Mapping</h4>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    {Object.entries(mapping).filter(([_, h]) => !!h).map(([sys, h]) => (
                                        <div key={sys} className="bg-slate-50 p-3 rounded border border-slate-100">
                                            <div className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold mb-1">{sys}</div>
                                            <div className="text-sm font-medium text-slate-800 truncate">{h}</div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                </div>

                {/* Footer Actions */}
                <div className="p-4 border-t border-slate-200 bg-white flex justify-between">
                    <div>
                        {step !== 'upload' && (
                            <button 
                                onClick={() => {
                                    if (step === 'preview' && mapping['role']) setStep('normalize');
                                    else if (step === 'preview' || step === 'normalize') setStep('mapping');
                                    else if (step === 'mapping') setStep('upload');
                                }} 
                                className="px-4 py-2 text-slate-600 font-medium hover:bg-slate-100 rounded transition"
                            >
                                Kembali
                            </button>
                        )}
                    </div>
                    <div>
                        {step === 'mapping' && (
                            <button 
                                onClick={goToNormalize}
                                disabled={requiredSystemFields.some(req => !mapping[req])}
                                className="px-6 py-2 bg-blue-600 text-white rounded font-medium hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Lanjut Normalisasi Peran
                            </button>
                        )}
                        {step === 'normalize' && (
                            <button 
                                onClick={goToPreview}
                                className="px-6 py-2 bg-blue-600 text-white rounded font-medium hover:bg-blue-700 transition"
                            >
                                Submit Preview
                            </button>
                        )}
                        {step === 'preview' && (
                            <button 
                                onClick={processImport}
                                className="px-8 py-2 bg-emerald-600 text-white rounded font-bold shadow-md shadow-emerald-600/20 hover:bg-emerald-700 hover:-translate-y-0.5 transition-all"
                            >
                                Eksekusi Import
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
