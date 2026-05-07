import { useState } from 'react';
import { atpWorkOrders, siteMasterRecords } from '../data/mockData';
import { db } from '../db';

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

        let success = false;
        try {
            if (entityType === 'site') {
                const record = siteMasterRecords.find(s => s.site_id === recordId);
                if (record) {
                    (record as any)[fieldName] = newValue;
                    success = true;

                    // Sync back to SurrealDB (sites table)
                    const surrealId = record.id;
                    if (surrealId && surrealId.includes(':')) {
                        // Map local UI fields back to SurrealDB column names if needed
                        let dbFieldName = fieldName;
                        if (fieldName === 'status') dbFieldName = 'permit_status';
                        
                        await db.query(`UPDATE ${surrealId} MERGE $data`, { data: { [dbFieldName]: newValue } });
                        console.log(`Saved to SurrealDB sites record ${surrealId}:`, { [dbFieldName]: newValue });
                    }

                    // If updating stage on site, also sync the work order if it exists
                    if (fieldName === 'stage') {
                        const wo = atpWorkOrders.find(w => w.site_id === recordId && w.status === 'active');
                        if (wo) {
                            wo.stage = newValue;
                            const woSurrealId = wo.id;
                            if (woSurrealId && woSurrealId.includes(':')) {
                                await db.query(`UPDATE ${woSurrealId} MERGE { stage: $newValue }`, { newValue });
                                console.log(`Synced stage back to SurrealDB active workOrder ${woSurrealId}: ${newValue}`);
                            }
                        }
                    }
                }
            } else if (entityType === 'workOrder') {
                const record = atpWorkOrders.find(w => w.id === recordId);
                if (record) {
                    (record as any)[fieldName] = newValue;
                    success = true;

                    // Sync back to SurrealDB (sites table)
                    const surrealId = record.id;
                    if (surrealId && surrealId.includes(':')) {
                        // Map local UI fields back to SurrealDB column names if needed
                        let dbFieldName = fieldName;
                        if (fieldName === 'po_number') dbFieldName = 'po_id';
                        if (fieldName === 'atp_number') dbFieldName = 'atp_number';
                        if (fieldName === 'sow_id') dbFieldName = 'sow_id';
                        if (fieldName === 'team_id') dbFieldName = 'team';

                        await db.query(`UPDATE ${surrealId} MERGE $data`, { data: { [dbFieldName]: newValue } });
                        console.log(`Saved to SurrealDB work order record ${surrealId}:`, { [dbFieldName]: newValue });
                    }

                    // One active ATP logic: only one WO per site can be 'active'
                    if (fieldName === 'status' && newValue === 'active') {
                        for (const wo of atpWorkOrders) {
                            if (wo.site_id === record.site_id && wo.id !== recordId && wo.status === 'active') {
                                wo.status = 'historical' as any;
                                const otherSurrealId = wo.id;
                                if (otherSurrealId && otherSurrealId.includes(':')) {
                                    await db.query(`UPDATE ${otherSurrealId} MERGE { status: "historical" }`);
                                }
                            }
                        }
                    }
                }
            }
        } catch (err) {
            console.error('Failed to save to SurrealDB:', err);
            success = false;
        } finally {
            setSaving(prev => ({ ...prev, [cellKey]: false }));
        }

        return success;
    };

    return { saving, saveField };
};
