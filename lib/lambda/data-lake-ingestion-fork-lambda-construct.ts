// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0
import * as lambda from "@aws-cdk/aws-lambda";
import * as cdk from "@aws-cdk/core";
import * as lambdaEventSources from "@aws-cdk/aws-lambda-event-sources";
import * as kinesis from '@aws-cdk/aws-kinesis';
import * as firehose from '@aws-cdk/aws-kinesisfirehose';
import * as timestream from '@aws-cdk/aws-timestream';
import * as iam from "@aws-cdk/aws-iam";
import * as s3 from '@aws-cdk/aws-s3';

export interface DataLakeIngestionForkLambdaProps {
    dataLakeIngestStream: kinesis.Stream
    firehoseToS3DeliveryStream: firehose.CfnDeliveryStream
    timestreamTargetTable: timestream.CfnTable,
    assetMapBucket: s3.Bucket
}

export class DataLakeIngestionForkLambda extends cdk.Construct {
    lambda: lambda.Function;
    serviceRole: iam.Role;

    constructor(scope: cdk.Construct, id: string, props: DataLakeIngestionForkLambdaProps) {
        super(scope, id);

        this.serviceRole = new iam.Role(this, 'DataLakeIngestionLambdaRole', {
            assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
            inlinePolicies: {
                WriteToDataTargets: iam.PolicyDocument.fromJson({
                    Statement: [
                        {
                            "Effect": "Allow",
                            "Action": ["logs:CreateLogGroup","logs:CreateLogStream","logs:PutLogEvents"],
                            "Resource": "arn:aws:logs:*:*:*"
                        },
                        {
                            Effect: 'Allow',
                            Action: [
                                "firehose:DeleteDeliveryStream",
                                "firehose:PutRecord",
                                "firehose:PutRecordBatch",
                                "firehose:UpdateDestination"
                            ],
                            Resource: `arn:${cdk.Stack.of(this).partition}:firehose:${cdk.Stack.of(this).region}:${cdk.Stack.of(this).account}:deliverystream/${props.firehoseToS3DeliveryStream.deliveryStreamName}`
                        },
                        {
                            Effect: 'Allow',
                            Action: [ 'timestream:WriteRecords', 'timestream:updateTable' ],
                            Resource: `arn:${cdk.Stack.of(this).partition}:timestream:${cdk.Stack.of(this).region}:${cdk.Stack.of(this).account}:database/${props.timestreamTargetTable.databaseName}/table/${props.timestreamTargetTable.tableName}`
                        },
                        {
                            Effect: 'Allow',
                            Action: [ 'timestream:DescribeEndpoints' ],
                            Resource: '*'
                        },
                        {
                            Effect: 'Allow',
                            Action: ['s3:GetObject'],
                            Resource: `${props.assetMapBucket.bucketArn}/*`
                        }
                    ],
                    Version: '2012-10-17'
                })
            }
        });

        this.lambda = new lambda.Function(this, 'DataLakeIngestionLambda', {
            functionName: 'DataLakeIngestionFork',
            handler: 'index.handler',
            runtime: lambda.Runtime.NODEJS_12_X,
            code: new lambda.AssetCode('lib/lambda/functions/data-lake-ingestion-fork-lambda'),
            memorySize: 512,
            timeout: cdk.Duration.seconds(60),
            role: this.serviceRole,
            environment: {
                ASSET_MAP_BUCKET: props.assetMapBucket.bucketName,
                FIREHOSE_DELIVERY_STREAM_NAME: props.firehoseToS3DeliveryStream.deliveryStreamName || '',
                TIMESTREAM_DATABASE_NAME: props.timestreamTargetTable.databaseName,
                TIMESTREAM_TABLE_NAME: props.timestreamTargetTable.tableName || ''
            }
        });

        this.lambda.addEventSource(new lambdaEventSources.KinesisEventSource(props.dataLakeIngestStream, {
            startingPosition: lambda.StartingPosition.LATEST
        }));


    }
}