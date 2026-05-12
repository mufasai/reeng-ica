import { useState } from 'react';
import { atpWorkOrders, siteMasterRecords } from '../data/mockData';
import { db, connectDB } from '../db';

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
            await connectDB();

            const now = new Date().toISOString();

            if (entityType === 'site') {
                const record = siteMasterRecords.find(s => s.site_id === recordId);
                if (record) {
                    (record as any)[fieldName] = newValue;
                    // Only stamp updated_at on this specific record
                    (record as any).updated_at = now;
                    if (fieldName === 'stage') (record as any).stage_updated_at = now;
                    success = true;

                    const surrealId = record.id;
                    if (surrealId && surrealId.includes(':')) {
                        let dbFieldName = fieldName;
                        if (fieldName === 'status') dbFieldName = 'permit_status';

                        const mergeData: any = { [dbFieldName]: newValue, updated_at: now };
                        if (fieldName === 'stage') mergeData.stage_updated_at = now;

                        await db.query(`UPDATE ${surrealId} MERGE $data`, { data: mergeData });
                        console.log(`Saved to SurrealDB sites record ${surrealId}:`, mergeData);
                    }

                    // Sync stage to the matching work order too
                    if (fieldName === 'stage') {
                        const wo = atpWorkOrders.find(w => w.site_id === recordId && w.status === 'active');
                        if (wo) {
                            wo.stage = newValue;
                            (wo as any).updated_at = now;
                            (wo as any).stage_updated_at = now;
                            const woSurrealId = wo.id;
                            if (woSurrealId && woSurrealId.includes(':')) {
                                await db.query(`UPDATE ${woSurrealId} MERGE $data`, { data: { stage: newValue, stage_updated_at: now, updated_at: now } });
                            }
                        }
                    }
                }
            } else if (entityType === 'workOrder') {
                const record = atpWorkOrders.find(w => w.id === recordId);
                if (record) {
                    (record as any)[fieldName] = newValue;
                    // Only stamp updated_at on this specific work order
                    (record as any).updated_at = now;
                    if (fieldName === 'stage') (record as any).stage_updated_at = now;
                    success = true;

                    const surrealId = record.id;
                    if (surrealId && surrealId.includes(':')) {
                        let dbFieldName = fieldName;
                        if (fieldName === 'po_number') dbFieldName = 'po_id';
                        if (fieldName === 'atp_number') dbFieldName = 'atp_number';
                        if (fieldName === 'sow_id') dbFieldName = 'sow_id';
                        if (fieldName === 'team_id') dbFieldName = 'team';

                        const mergeData: any = { [dbFieldName]: newValue, updated_at: now };
                        if (fieldName === 'stage') mergeData.stage_updated_at = now;

                        await db.query(`UPDATE ${surrealId} MERGE $data`, { data: mergeData });
                        console.log(`Saved to SurrealDB work order record ${surrealId}:`, mergeData);
                    }

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
