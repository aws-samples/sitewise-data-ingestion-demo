// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0
import * as cdk from '@aws-cdk/core';
import * as iot from "@aws-cdk/aws-iot";
import * as iam from "@aws-cdk/aws-iam";
import {DataLakeIngestionStream} from "../kinesis/data-lake-ingestion-stream-construct";

export interface SendToDataLakeRuleProps {
    dataLakeIngestStream: DataLakeIngestionStream
    assetModelId: string
}

export class SendToDataLakeRule extends cdk.Construct {
    public readonly iotRule: iot.CfnTopicRule;
    public readonly serviceRole: iam.Role;

    constructor(scope: cdk.Construct, id: string, props: SendToDataLakeRuleProps) {
        super(scope, id);

        this.serviceRole = new iam.Role(this, 'WriteToDataIngestStreamRole', {
            assumedBy: new iam.ServicePrincipal('iot.amazonaws.com'),
            inlinePolicies: {
                WriteToDataIngestStreamPolicy: iam.PolicyDocument.fromJson({
                    Statement: [
                        {
                            Effect: 'Allow',
                            Action: ['kinesis:PutRecord'],
                            Resource: props.dataLakeIngestStream.stream.streamArn
                        }
                    ],
                    Version: '2012-10-17'
                })
            }
        });

        this.iotRule = new iot.CfnTopicRule(this, 'SendToDataLakeRule', {
            topicRulePayload: {
                sql: 'SELECT topic(6) as assetId, ' +
                    'topic(8) as propertyId, ' +
                    'get(payload.values,0).timestamp.timeInSeconds as timestamp, ' +
                    'get(payload.values,0).value.doubleValue as value ' +
                    `FROM '$aws/sitewise/asset-models/${props.assetModelId}/assets/+/properties/+'`,
                awsIotSqlVersion: '2016-03-23',
                ruleDisabled: false,
                description: 'Send {assetId, propertyId, timestamp, value} to data lake.',
                actions: [{
                    kinesis: {
                        roleArn: this.serviceRole.roleArn,
                        streamName: props.dataLakeIngestStream.stream.streamName,
                        partitionKey: 'assetId'
                    }
                }]
            },
            ruleName: 'Send_To_Data_Lake'
        });


    }
}