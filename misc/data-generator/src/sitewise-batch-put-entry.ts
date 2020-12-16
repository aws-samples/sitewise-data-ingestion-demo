// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0
const uuidv4 = require('uuid').v4;

export interface SitewiseBatchPutEntryProps {
    assetId: string;
    propertyId: string;
    timestamp: string;
    value: number
}

export class SitewiseBatchPutEntry {
    entryId: string;
    assetId: string;
    propertyId: string;
    timestamp: string;
    value: number;

    constructor(props: SitewiseBatchPutEntryProps) {
        this.entryId = uuidv4();
        this.assetId = props.assetId;
        this.propertyId = props.propertyId;
        this.timestamp = props.timestamp;
        this.value = props.value;
    }

    toApiEntry(): any {
        return {
            entryId: this.entryId,
            propertyValues: [
                {
                    timestamp: {
                        timeInSeconds: this.timestamp,
                        offsetInNanos: 0
                    },
                    value: {
                        doubleValue: this.value
                    }
                }
            ],
            assetId: this.assetId,
            propertyId: this.propertyId
        };
    }
}
