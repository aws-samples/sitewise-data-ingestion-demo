// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0
import * as cdk from "@aws-cdk/core";
import {CustomResource, RemovalPolicy} from "@aws-cdk/core";
import * as s3 from '@aws-cdk/aws-s3';
import * as cr from '@aws-cdk/custom-resources';
import * as cfn from '@aws-cdk/aws-cloudformation';
import * as logs from '@aws-cdk/aws-logs';

import {UidGenerator} from '../util/uid';
import {DataLakeIngestionStream} from "../kinesis/data-lake-ingestion-stream-construct";
import {FirehoseToS3DeliveryStream} from "../kinesis/firehose-to-s3-delivery-stream-construct";
import {TimestreamAssetDataTarget} from "../timestream/timestream-asset-data-target-construct";
import {SendToDataLakeRule} from "../iot-rules/send-to-data-lake-rule-construct";
import {DataLakeIngestionForkLambda} from "../lambda/data-lake-ingestion-fork-lambda-construct";
import {AssetMapperLambda} from "../lambda/asset-mapper-lambda-construct";

const uid = new UidGenerator();

export class DataLakeStack extends cdk.Stack {
    private readonly ingestionStream: DataLakeIngestionStream;
    private readonly iotRule: SendToDataLakeRule;
    private readonly forkLambda: DataLakeIngestionForkLambda;
    private readonly targetBucket: s3.Bucket;
    private readonly mapBucket: s3.Bucket;
    private readonly deliveryStream: FirehoseToS3DeliveryStream;
    private readonly targetTimestream: TimestreamAssetDataTarget



    constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
        super(scope, id);

        /* PARAMETERS */
        const assetModelId = new cdk.CfnParameter(this, 'TurbineAssetModelID', {
            type: 'String',
            description: 'Provide an ID for a Turbine asset model.'
        });

        const shardCount = new cdk.CfnParameter(this, 'DataLakeIngestStreamShardCount', {
            type: 'Number',
            description: 'Provide an ID for a Turbine asset model.',
            default: 1
        });

        const bufferingIntervalSeconds = new cdk.CfnParameter(this, 'BufferingIntervalSeconds', {
            type: 'Number',
            description: 'Provide a buffering interval in seconds for delivery to S3.',
            default: 60
        });

        const bufferingIntervalMB = new cdk.CfnParameter(this, 'BufferingIntervalMB', {
            type: 'Number',
            description: 'Provide a buffering interval in MB for delivery to S3.',
            default: 1
        });

        const memoryStoreRetentionPeriodInHours = new cdk.CfnParameter(this, 'MemoryStoreRetentionPeriodInHours', {
            type: 'Number',
            description: 'Numbner of hours to store data in memory in Timestream.',
            default: 24
        });

        const magneticStoreRetentionPeriodInDays = new cdk.CfnParameter(this, 'MagneticStoreRetentionPeriodInDays', {
            type: 'Number',
            description: 'Number of days to store data on magnetic volumes in Timestream..',
            default: 7
        });

        /* RESOURCES */
        this.ingestionStream = new DataLakeIngestionStream(this, 'DataLakeIngestionStream', {
            name: 'data-lake-ingest-stream',
            shardCount: shardCount.valueAsNumber
        });

        this.iotRule = new SendToDataLakeRule(this, 'SendToDataLakeIoTRule', {
            dataLakeIngestStream: this.ingestionStream,
            assetModelId: assetModelId.valueAsString
        });

        this.targetTimestream = new TimestreamAssetDataTarget(this, 'TimestreamAssetDataTarget', {
            tableName: 'TimestreamAssetDataTargetTable',
            databaseName: 'TimestreamAssetDataTargetDatabase',
            memoryStoreRetentionPeriodInHours: memoryStoreRetentionPeriodInHours.valueAsNumber,
            magneticStoreRetentionPeriodInDays: magneticStoreRetentionPeriodInDays.valueAsNumber
        });

        this.targetBucket = new s3.Bucket(this, 'S3AssetDataTarget', {
            bucketName: `${uid.vend().toLowerCase()}-asset-data`
        });

        this.mapBucket = new s3.Bucket(this, 'AssetPropertyAliasMapBucket', {
            bucketName: `${uid.vend().toLowerCase()}-asset-property-alias-map-bucket`
        });


        this.deliveryStream = new FirehoseToS3DeliveryStream(this, 'DataLakeFirehoseToS3', {
            name: 'DataLakeFirehoseToS3',
            targetS3Bucket: this.targetBucket,
            bufferingIntervalSeconds: bufferingIntervalSeconds.valueAsNumber,
            bufferingIntervalMB: bufferingIntervalMB.valueAsNumber
        });

        this.forkLambda = new DataLakeIngestionForkLambda(this, 'DataLakeIngestionForkLambda', {
            assetMapBucket: this.mapBucket,
            dataLakeIngestStream: this.ingestionStream.stream,
            firehoseToS3DeliveryStream: this.deliveryStream.deliveryStream,
            timestreamTargetTable: this.targetTimestream.table
        });

        const assetMapperLambda = new AssetMapperLambda(this, 'AssetMapperLambda', {
            assetModelId: assetModelId.valueAsString,
            assetMapBucket: this.mapBucket
        });

        const assetMapProvider = new cr.Provider(this, 'AssetMapProvider', {
            onEventHandler: assetMapperLambda.lambda,
            logRetention: logs.RetentionDays.ONE_DAY
        });

        const assetMap = new cdk.CustomResource(this, 'AssetMap', {
            serviceToken: assetMapProvider.serviceToken
        });

        /* OUTPUTS */
        new cdk.CfnOutput(this, 'TargetS3BucketName', {
            value: this.targetBucket.bucketName,
            description: 'Name of S3 bucket for accumulating asset data.'
        });

        new cdk.CfnOutput(this, 'MapBucketName', {
            value: this.mapBucket.bucketName,
            description: 'Name of S3 bucket for accumulating asset data.'
        });

        new cdk.CfnOutput(this, 'TargetTimestreamDatabaseName', {
            value: this.targetTimestream.database.databaseName || '',
            description: 'Name of Timestream database for accumulating asset data.'
        });

        new cdk.CfnOutput(this, 'TargetTimestreamTableName', {
            value: this.targetTimestream.table.tableName || '',
            description: 'Name of Timestream table for accumulating asset data.'
        });
    }
}