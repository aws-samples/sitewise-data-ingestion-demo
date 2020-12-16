// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0
import * as cdk from '@aws-cdk/core';
import * as timestream from '@aws-cdk/aws-timestream';

export interface TimestreamAssetDataTargetProps {
    databaseName: string
    tableName: string,
    memoryStoreRetentionPeriodInHours: number,
    magneticStoreRetentionPeriodInDays: number
}

export class TimestreamAssetDataTarget extends cdk.Construct {
    public readonly database: timestream.CfnDatabase;
    public readonly table: timestream.CfnTable;

    constructor(scope: cdk.Construct, id: string, props: TimestreamAssetDataTargetProps) {
        super(scope, id);



        this.database = new timestream.CfnDatabase(this, 'AssetDataTargetDatabase', {
            databaseName: props.databaseName
        });

        this.table = new timestream.CfnTable(this, 'AssetDataTargetDatabaseTable', {
            databaseName: props.databaseName,
            tableName: props.tableName,
            retentionProperties: {
                memoryStoreRetentionPeriodInHours: props.memoryStoreRetentionPeriodInHours,
                magneticStoreRetentionPeriodInDays: props.magneticStoreRetentionPeriodInDays
            }
        });

        this.table.node.addDependency(this.database);
    }
}