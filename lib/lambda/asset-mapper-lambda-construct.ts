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

export interface AssetMapperLambdaProps {
    assetModelId: string
    assetMapBucket: s3.Bucket
}

export class AssetMapperLambda extends cdk.Construct {
    lambda: lambda.Function;
    serviceRole: iam.Role;

    constructor(scope: cdk.Construct, id: string, props: AssetMapperLambdaProps) {
        super(scope, id);

        this.serviceRole = new iam.Role(this, 'AssetMapperLambdaRole', {
            assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
            inlinePolicies: {
                MapAssets: iam.PolicyDocument.fromJson({
                    Statement: [
                        {
                            "Effect": "Allow",
                            "Action": ["logs:CreateLogGroup","logs:CreateLogStream","logs:PutLogEvents"],
                            "Resource": "arn:aws:logs:*:*:*"
                        },
                        {
                            Effect: 'Allow',
                            Action: [
                                "iotsitewise:Describe*",
                                "iotsitewise:List*",
                                "iotsitewise:Get*"
                            ],
                            Resource: '*'
                        },
                        {
                            Effect: 'Allow',
                            Action: ['s3:putObject'],
                            Resource: [
                                props.assetMapBucket.bucketArn,
                                `${props.assetMapBucket.bucketArn}/*`
                            ]
                        }
                    ],
                    Version: '2012-10-17'
                })
            }
        });

        this.lambda = new lambda.Function(this, 'AssetMapperLambda', {
            functionName: 'DataLakeIngestAssetMapper',
            handler: 'index.handler',
            runtime: lambda.Runtime.NODEJS_12_X,
            code: new lambda.AssetCode('lib/lambda/functions/asset-mapper'),
            memorySize: 512,
            timeout: cdk.Duration.seconds(120),
            role: this.serviceRole,
            environment: {
                S3_BUCKET_NAME: props.assetMapBucket.bucketName,
                ASSET_MODEL_ID: props.assetModelId
            }
        });
    }
}