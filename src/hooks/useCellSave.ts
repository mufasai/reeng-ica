import { useState } from 'react';
import { atpWorkOrders, siteMasterRecords } from '../data/mockData';

export const useCellSave = () => {
    const [saving, setSaving] = useState<Record<string, boolean>>({});

    const saveField = async (
        recordId: string, 
        entityType: 'site' | 'workOrder', 
        fieldName: string, 
        newValue: any
    ): Promise<boolean> => {
        const cellKey = `${entityType}-${recordId}-${fieldName}`;
        setSaving(prev => ({ ...prev, [cellKey]: true }));

        return new Promise((resolve) => {
            setTimeout(() => {
                let success = false;
                if (entityType === 'site') {
                    const record = siteMasterRecords.find(s => s.site_id === recordId);
                    if (record) {
                        (record as any)[fieldName] = newValue;
                        success = true;
                        
                        // If updating stage on site, also sync the work order if it exists
                        if (fieldName === 'stage') {
                            const wo = atpWorkOrders.find(w => w.site_id === recordId && w.status === 'active');
                            if (wo) wo.stage = newValue;
                        }
                    }
                } else if (entityType === 'workOrder') {
                    const record = atpWorkOrders.find(w => w.id === recordId);
                    if (record) {
                        (record as any)[fieldName] = newValue;
                        success = true;
                    }
                }
                
                setSaving(prev => ({ ...prev, [cellKey]: false }));
                resolve(success);
            }, 600); // simulate network delay
        });
    };

    return { saving, saveField };
};
