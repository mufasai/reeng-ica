-- GROUP A: permit_process (8 sites)
UPSERT sites:JSX898 CONTENT {
  site_id: 'JSX898', project_type: 'RESCOPING',
  region: 'R03 Jakarta & Banten', ioms_registered: true,
  permit_status: '1. Planning', impl_status: 'Awaiting',
  stage: 'permit_process', file_date: '2026-04-16',
  created_at: time::now(), updated_at: time::now()
};

UPSERT sites:JSX802 CONTENT {
  site_id: 'JSX802', project_type: 'RESCOPING',
  region: 'R03 Jakarta & Banten', ioms_registered: true,
  permit_status: '1. Planning', impl_status: 'Awaiting',
  stage: 'permit_process', file_date: '2026-04-16',
  created_at: time::now(), updated_at: time::now()
};

UPSERT sites:JSX832 CONTENT {
  site_id: 'JSX832', project_type: 'RESCOPING',
  region: 'R03 Jakarta & Banten', ioms_registered: true,
  permit_status: '1. Planning', impl_status: 'Awaiting',
  stage: 'permit_process', file_date: '2026-04-16',
  created_at: time::now(), updated_at: time::now()
};

UPSERT sites:JPX338 CONTENT {
  site_id: 'JPX338', site_name: 'JPX338_RelocStmicempakaputih-BMS',
  project_type: 'RESCOPING', tp_name: 'Unknown',
  region: 'R03 Jakarta & Banten', ioms_registered: true,
  permit_status: '1. Planning', impl_status: 'Awaiting',
  priority: 'P2', stage: 'permit_process', file_date: '2026-04-16',
  is_relokasi: true,
  created_at: time::now(), updated_at: time::now()
};

UPSERT sites:JKB585 CONTENT {
  site_id: 'JKB585', site_name: 'JKB585_RelokRukoKebunJeruk',
  project_type: 'RESCOPING', tp_name: 'DMT',
  region: 'R03 Jakarta & Banten', ioms_registered: false,
  permit_status: '1. Planning', impl_status: 'Awaiting',
  priority: 'P3', stage: 'permit_process', file_date: '2026-04-16',
  is_relokasi: true,
  created_at: time::now(), updated_at: time::now()
};

UPSERT sites:JPX002 CONTENT {
  site_id: 'JPX002', site_name: 'E_JPX002_Stmicempakaputih-IFT',
  project_type: 'RESCOPING', tp_name: 'IFT',
  region: 'R03 Jakarta & Banten', ioms_registered: true,
  permit_status: '1. Planning', impl_status: 'Awaiting',
  stage: 'permit_process', file_date: '2026-04-16',
  created_at: time::now(), updated_at: time::now()
};

UPSERT sites:JKB340 CONTENT {
  site_id: 'JKB340', site_name: 'JKB340_CitraTower',
  project_type: 'RESCOPING', tp_name: 'DMT',
  region: 'R03 Jakarta & Banten', ioms_registered: true,
  permit_status: '1. Planning', impl_status: 'Awaiting',
  stage: 'permit_process', file_date: '2026-04-16',
  created_at: time::now(), updated_at: time::now()
};

UPSERT sites:JTX061 CONTENT {
  site_id: 'JTX061', project_type: 'RESCOPING',
  region: 'R03 Jakarta & Banten', ioms_registered: true,
  permit_status: '1. Planning', impl_status: 'Awaiting',
  stage: 'permit_process', file_date: '2026-04-16',
  created_at: time::now(), updated_at: time::now()
};

-- GROUP B: implementasi (2 sites — permit released, On Going)
UPSERT sites:JSX534 CONTENT {
  site_id: 'JSX534', site_name: 'JSX534_PulorayapetogoganBTSH-IFT',
  project_type: 'RESCOPING', tp_name: 'IFT',
  region: 'R03 Jakarta & Banten', ioms_registered: true,
  permit_status: '5. Permit Released', impl_status: 'On Going',
  priority: 'P1', stage: 'implementasi', file_date: '2026-04-16',
  created_at: time::now(), updated_at: time::now()
};

UPSERT sites:JTX283 CONTENT {
  site_id: 'JTX283', site_name: 'JTX283_JludowopondokgedeBTSH-DMT',
  project_type: 'RESCOPING', tp_name: 'DMT',
  region: 'R03 Jakarta & Banten', ioms_registered: true,
  permit_status: '5. Permit Released', impl_status: 'On Going',
  stage: 'implementasi', file_date: '2026-04-16',
  created_at: time::now(), updated_at: time::now()
};

-- GROUP C: rfi_done (3 sites — 'RFS' in Excel = RFI done for Rescoping)
UPSERT sites:JSX572 CONTENT {
  site_id: 'JSX572', site_name: 'JSX572_Jltundaracilandak-IFT',
  project_type: 'RESCOPING', tp_name: 'IFT',
  region: 'R03 Jakarta & Banten', ioms_registered: true,
  permit_status: '5. Permit Released', impl_status: 'RFS',
  atp_status: 'TAGGING N/A', stage: 'rfi_done', file_date: '2026-04-16',
  created_at: time::now(), updated_at: time::now()
};

UPSERT sites:JBX018 CONTENT {
  site_id: 'JBX018', site_name: 'JBX018_PALEMRAJAUTAMAMWHW',
  project_type: 'RESCOPING', tp_name: 'TBG',
  region: 'R03 Jakarta & Banten', ioms_registered: true,
  permit_status: '5. Permit Released', impl_status: 'RFS',
  atp_status: 'TAGGING N/A', stage: 'rfi_done', file_date: '2026-04-16',
  created_at: time::now(), updated_at: time::now()
};

UPSERT sites:JBX062 CONTENT {
  site_id: 'JBX062', site_name: 'JBX062_DURI KOSAMBI',
  project_type: 'RESCOPING', tp_name: 'TBG',
  region: 'R03 Jakarta & Banten', ioms_registered: true,
  permit_status: '5. Permit Released', impl_status: 'RFS',
  atp_status: 'TAGGING N/A', stage: 'rfi_done', file_date: '2026-04-16',
  created_at: time::now(), updated_at: time::now()
};
