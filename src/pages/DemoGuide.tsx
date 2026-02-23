

const DemoGuide = () => {
    const handleReset = () => {
        if (confirm('Reset demo data to initial state? This will reload the page.')) {
            window.location.reload();
        }
    };

    return (
        <div className="p-8 max-w-4xl mx-auto space-y-8 pb-20">
            <div className="flex justify-between items-center border-b border-slate-200 pb-6">
                <div>
                    <h1 className="text-3xl font-bold text-slate-800">Demo Scenarios Guide</h1>
                    <p className="text-slate-500 mt-1">Follow these steps to demonstrate key features.</p>
                </div>
                <button 
                    onClick={handleReset}
                    className="px-4 py-2 bg-slate-800 text-white rounded-md hover:bg-slate-700 transition-colors shadow-sm font-medium"
                >
                    Reset Demo Data
                </button>
            </div>

            <div className="space-y-6">
                
                {/* STEP 1 */}
                <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm">
                    <h2 className="text-lg font-bold text-blue-600 mb-4">STEP 1 — Input WO dari TI</h2>
                    <div className="space-y-2 text-sm text-slate-700">
                        <div className="flex gap-2">
                            <span className="font-semibold w-24">Login as:</span>
                            <span className="font-mono bg-slate-100 px-1 rounded">backoffice@demo.com</span>
                        </div>
                        <div className="flex gap-2">
                            <span className="font-semibold w-24">Go to:</span>
                            <span>/work-orders → click <span className="px-1.5 py-0.5 bg-blue-600 text-white text-xs rounded">+ Input WO</span></span>
                        </div>
                        <div className="mt-4 bg-slate-50 p-4 rounded border border-slate-100 space-y-2">
                            <p className="font-semibold text-slate-800">Action & Confirm:</p>
                            <ul className="list-disc pl-5 space-y-1">
                                <li>Fill details (WO-DEMO-2024, PT Telkom Indonesia, Tipe: FILTER, Scope: Pekerjaan Pondasi Gedung Demo, Lokasi: Jakarta Selatan, Target Date: 2024-06-30, Nilai: 560M, No Kontrak: CONTRACT-DEMO-2024, upload any doc).</li>
                                <li>Click <span className="px-1.5 py-0.5 bg-blue-600 text-white text-xs rounded">Save</span>.</li>
                                <li>Confirm: WO appears in list with status <strong>"Unassigned"</strong> (gray badge).</li>
                            </ul>
                        </div>
                    </div>
                </div>

                {/* STEP 2 */}
                <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm">
                    <h2 className="text-lg font-bold text-blue-600 mb-4">STEP 2 — Assign Team ke WO</h2>
                    <div className="space-y-2 text-sm text-slate-700">
                        <div className="flex gap-2">
                            <span className="font-semibold w-24">Login as:</span>
                            <span className="font-mono bg-slate-100 px-1 rounded">management@demo.com</span> (or backoffice)
                        </div>
                        <div className="flex gap-2">
                            <span className="font-semibold w-24">Go to:</span>
                            <span>/work-orders → click <span className="px-1.5 py-0.5 bg-blue-600 text-white text-xs rounded">Assign Team</span> on WO-DEMO-2024</span>
                        </div>
                        <div className="mt-4 bg-slate-50 p-4 rounded border border-slate-100 space-y-2">
                            <p className="font-semibold text-slate-800">Action & Confirm:</p>
                            <ul className="list-disc pl-5 space-y-1">
                                <li>Select Team Alpha, Pemberi Tugas: Pak Dipo.</li>
                                <li>Confirm Penerima Tugas auto-fills to Jane Smith.</li>
                                <li>Click <span className="px-1.5 py-0.5 bg-blue-600 text-white text-xs rounded">Assign & Notify</span>.</li>
                                <li>Confirm: WO status changes to <strong>"Assigned"</strong> (blue badge).</li>
                            </ul>
                        </div>
                    </div>
                </div>

                {/* STEP 3 */}
                <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm">
                    <h2 className="text-lg font-bold text-blue-600 mb-4">STEP 3 — Team Leader buat Pengajuan Site</h2>
                    <div className="space-y-2 text-sm text-slate-700">
                        <div className="flex gap-2">
                            <span className="font-semibold w-24">Login as:</span>
                            <span className="font-mono bg-slate-100 px-1 rounded">teamleader@demo.com</span> (Jane Smith)
                        </div>
                        <div className="flex gap-2">
                            <span className="font-semibold w-24">Go to:</span>
                            <span>/work-orders → click <span className="px-1.5 py-0.5 bg-slate-200 text-slate-800 text-xs rounded">View</span> on WO-DEMO-2024</span>
                        </div>
                        <div className="mt-4 bg-slate-50 p-4 rounded border border-slate-100 space-y-2">
                            <p className="font-semibold text-slate-800">Action & Confirm:</p>
                            <ul className="list-disc pl-5 space-y-1">
                                <li>Fill: Site Name (Site Demo Pondasi), Harga (Rp 392JT auto), Start/End Dates, Note.</li>
                                <li>Confirm Termin breakdown shows T1=30%, T2=50%, T3=10%, T4=10%.</li>
                                <li>Click <span className="px-1.5 py-0.5 bg-blue-600 text-white text-xs rounded">Submit Pengajuan Site</span>.</li>
                                <li>Confirm: WO status changes to <strong>"Pending SPK Approval"</strong>.</li>
                            </ul>
                        </div>
                    </div>
                </div>
                
                {/* STEP 4 */}
                <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm">
                    <h2 className="text-lg font-bold text-blue-600 mb-4">STEP 4 — Management Approve & SPK Auto-generated</h2>
                    <div className="space-y-2 text-sm text-slate-700">
                        <div className="flex gap-2">
                            <span className="font-semibold w-24">Login as:</span>
                            <span className="font-mono bg-slate-100 px-1 rounded">management@demo.com</span>
                        </div>
                        <div className="flex gap-2">
                            <span className="font-semibold w-24">Go to:</span>
                            <span>/work-orders → find WO-DEMO-2024</span>
                        </div>
                        <div className="mt-4 bg-slate-50 p-4 rounded border border-slate-100 space-y-2">
                            <p className="font-semibold text-slate-800">Action & Confirm:</p>
                            <ul className="list-disc pl-5 space-y-1">
                                <li>Review site proposal and click <span className="px-1.5 py-0.5 bg-emerald-600 text-white text-xs rounded">Approve & Create SPK</span>.</li>
                                <li>Confirm: SPK auto-generated, new site "Site Demo Pondasi" created under project.</li>
                                <li>Confirm: WO status → <strong>"SPK Created"</strong>. Download SPK button appears.</li>
                            </ul>
                        </div>
                    </div>
                </div>

                {/* STEP 5 */}
                <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm">
                    <h2 className="text-lg font-bold text-blue-600 mb-4">STEP 5 — Buat SKP & Ambil Material</h2>
                    <div className="space-y-2 text-sm text-slate-700">
                        <div className="flex gap-2">
                            <span className="font-semibold w-24">Login as:</span>
                            <span className="font-mono bg-slate-100 px-1 rounded">teamleader@demo.com</span>
                        </div>
                        <div className="flex gap-2">
                            <span className="font-semibold w-24">Go to:</span>
                            <span>/projects/{"{id}"}/sites/{"{site_demo_id}"} → SKP & Material section</span>
                        </div>
                        <div className="mt-4 bg-slate-50 p-4 rounded border border-slate-100 space-y-2">
                            <p className="font-semibold text-slate-800">Action & Confirm:</p>
                            <ul className="list-disc pl-5 space-y-1">
                                <li>Click <span className="px-1.5 py-0.5 bg-blue-600 text-white text-xs rounded">+ Buat SKP</span>, fill data, and click <span className="px-1.5 py-0.5 bg-blue-600 text-white text-xs rounded">Save SKP</span>.</li>
                                <li>Click <span className="px-1.5 py-0.5 bg-emerald-600 text-white text-xs rounded">Mark as Received</span> on the SKP, upload Bukti Serah Terima Material image.</li>
                                <li>Confirm: SKP status → <strong>"Received"</strong>. Termin 1 is now <strong>UNLOCKED</strong> (from 🔒 to 📋 OPEN).</li>
                            </ul>
                        </div>
                    </div>
                </div>
                
                {/* STEP 6 & 7 */}
                <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm">
                    <h2 className="text-lg font-bold text-blue-600 mb-4">STEP 6 & 7 — Engineer & TL Submit Termin 1</h2>
                    <div className="space-y-2 text-sm text-slate-700">
                        <div className="flex gap-2">
                            <span className="font-semibold w-24">Login as:</span>
                            <span className="font-mono bg-slate-100 px-1 rounded">engineer@demo.com</span>, then <span className="font-mono bg-slate-100 px-1 rounded">teamleader@demo.com</span>
                        </div>
                        <div className="flex gap-2">
                            <span className="font-semibold w-24">Go to:</span>
                            <span>Site Demo Pondasi → Termin 1 panel</span>
                        </div>
                        <div className="mt-4 bg-slate-50 p-4 rounded border border-slate-100 space-y-2">
                            <p className="font-semibold text-slate-800">Action & Confirm:</p>
                            <ul className="list-disc pl-5 space-y-1">
                                <li>(Optional) Engineer uploads 2 photos.</li>
                                <li>TL fills Jumlah Pengajuan, No Invoice, Date.</li>
                                <li>TL uploads Surat Pengajuan Termin 1 (SPK and Bukti SKP auto-attached).</li>
                                <li>Click <span className="px-1.5 py-0.5 bg-blue-600 text-white text-xs rounded">Submit Pengajuan</span>. Termin 1 status → <strong>"Pengajuan"</strong>.</li>
                            </ul>
                        </div>
                    </div>
                </div>

                {/* STEP 8 & 9 */}
                <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm">
                    <h2 className="text-lg font-bold text-blue-600 mb-4">STEP 8 & 9 — Management Approve & Finance Paid (Termin 1)</h2>
                    <div className="space-y-2 text-sm text-slate-700">
                        <div className="flex gap-2">
                            <span className="font-semibold w-24">Login as:</span>
                            <span className="font-mono bg-slate-100 px-1 rounded">management@demo.com</span>, then <span className="font-mono bg-slate-100 px-1 rounded">finance@demo.com</span>
                        </div>
                        <div className="flex gap-2">
                            <span className="font-semibold w-24">Go to:</span>
                            <span>Site Demo Pondasi → Termin 1 panel</span>
                        </div>
                        <div className="mt-4 bg-slate-50 p-4 rounded border border-slate-100 space-y-2">
                            <p className="font-semibold text-slate-800">Action & Confirm:</p>
                            <ul className="list-disc pl-5 space-y-1">
                                <li>Management reviews docs and clicks <span className="px-1.5 py-0.5 bg-emerald-600 text-white text-xs rounded">Approve</span> (Status → <strong>"Approved"</strong>).</li>
                                <li>Finance clicks <span className="px-1.5 py-0.5 bg-emerald-600 text-white text-xs rounded">Upload Bukti Transfer</span>, fills data, marks as Paid.</li>
                                <li>Confirm: Termin 1 → <strong>"Paid"</strong>. Termin 2 is now <strong>UNLOCKED</strong>.</li>
                            </ul>
                        </div>
                    </div>
                </div>

                {/* STEP 10 */}
                <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm">
                    <h2 className="text-lg font-bold text-blue-600 mb-4">STEP 10 — Termin 2 (Progress Report)</h2>
                    <div className="space-y-4 text-sm text-slate-700">
                        <p><strong>Engineer Action:</strong> Login as engineer, go to Termin 2. Upload 3 progress photos with tags e.g. "50%". Confirm checklist is 3/3 ✓.</p>
                        <p><strong>Team Leader Action:</strong> Login as TL, go to Termin 2. Confirm Submit is active. Upload Progress Report, fill Persentase (50%), submit pengajuan.</p>
                        <p><strong>Flow:</strong> Continues through Management Approval and Finance Payment.</p>
                    </div>
                </div>

                {/* STEP 11 */}
                <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm">
                    <h2 className="text-lg font-bold text-blue-600 mb-4">STEP 11 — Termin 3 (BAST Required)</h2>
                    <div className="space-y-4 text-sm text-slate-700">
                        <p><strong>Team Leader Action:</strong> Submits Termin 3 with BAST fields, PO, Invoice, and importantly, <strong>Dokumen BAST</strong>.</p>
                        <p><strong>Management Action:</strong> Approval is locked/warned if BAST is not present. Management reviews and approves.</p>
                        <p><strong>Flow:</strong> Finance pays, unlocking Termin 4.</p>
                    </div>
                </div>

                {/* STEP 12 */}
                <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm">
                    <h2 className="text-lg font-bold text-blue-600 mb-4">STEP 12 — Termin 4 & Project Complete</h2>
                    <div className="space-y-2 text-sm text-slate-700">
                        <div className="flex gap-2">
                            <span className="font-semibold w-24">Action:</span>
                            <span>TL submits Termin 4 with Invoice & Warranty. Mgmt approves, Finance pays.</span>
                        </div>
                        <div className="mt-4 bg-slate-50 p-4 rounded border border-slate-100 space-y-2">
                            <p className="font-semibold text-slate-800">Confirm:</p>
                            <ul className="list-disc pl-5 space-y-1">
                                <li>Site status → <strong>"Completed"</strong></li>
                                <li>Project KPI dashboard: Budget Terpakai = 100%, Sisa = 0.</li>
                            </ul>
                        </div>
                    </div>
                </div>

                {/* STEP 13 */}
                <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm">
                    <h2 className="text-lg font-bold text-blue-600 mb-4">STEP 13 — Final Management Monitoring</h2>
                    <div className="space-y-2 text-sm text-slate-700">
                        <div className="flex gap-2">
                            <span className="font-semibold w-24">Login as:</span>
                            <span className="font-mono bg-slate-100 px-1 rounded">management@demo.com</span>
                        </div>
                        <div className="mt-4 bg-slate-50 p-4 rounded border border-slate-100 space-y-2">
                            <p className="font-semibold text-slate-800">Confirm:</p>
                            <ul className="list-disc pl-5 space-y-1">
                                <li><span className="font-mono bg-white px-1 border rounded">/projects/{"{id}"}/dashboard</span> shows correct final state KPIs.</li>
                                <li><span className="font-mono bg-white px-1 border rounded">/spk</span> shows SPK status as <strong>"Completed"</strong>.</li>
                                <li><span className="font-mono bg-white px-1 border rounded">/work-orders</span> shows WO-DEMO-2024 status as <strong>"Completed"</strong>.</li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DemoGuide;
