// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0
import * as cdk from '@aws-cdk/core';
import * as iam from "@aws-cdk/aws-iam";
import * as kinesisFirehose from "@aws-cdk/aws-kinesisfirehose";
import * as s3 from '@aws-cdk/aws-s3';

export interface FirehoseToS3DeliveryStreamProps {
    name: string
    targetS3Bucket: s3.Bucket
    bufferingIntervalSeconds: number
    bufferingIntervalMB: number
}

export class FirehoseToS3DeliveryStream extends cdk.Construct {
    public readonly serviceRole: iam.Role;
    public readonly deliveryStream: kinesisFirehose.CfnDeliveryStream;

    constructor(scope: cdk.Construct, id: string, props: FirehoseToS3DeliveryStreamProps) {
        super(scope, id);
        const firehoseToS3StreamName = props.name;

        this.serviceRole = new iam.Role(this, 'WriteDataToS3', {
            assumedBy: new iam.ServicePrincipal('firehose.amazonaws.com'),
            inlinePolicies: {
                WriteDataToS3: iam.PolicyDocument.fromJson({
                    Statement: [
                        {
                            Effect: 'Allow',
                            Action: [
                                's3:AbortMultipartUpload',
                                's3:GetBucketLocation',
                                's3:GetObject',
                                's3:ListBucket',
                                's3:ListBucketMultipartUploads',
                                's3:PutObject'
                            ],
                            Resource: [
                                `${props.targetS3Bucket.bucketArn}`,
                                `${props.targetS3Bucket.bucketArn}/*`
                            ]
                        }
                    ],
                    Version: '2012-10-17'
                })
            }
        });


        this.deliveryStream = new kinesisFirehose.CfnDeliveryStream(this, 'FirehoseToS3', {
            deliveryStreamName: firehoseToS3StreamName,
            deliveryStreamType: 'DirectPut',
            s3DestinationConfiguration: {
                bucketArn: props.targetS3Bucket.bucketArn,
                bufferingHints: {
                    intervalInSeconds: props.bufferingIntervalSeconds,
                    sizeInMBs: props.bufferingIntervalMB
                },
                prefix: 'assetData/',
                roleArn: this.serviceRole.roleArn
            }
        });
    }
}