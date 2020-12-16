// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0
import * as cdk from '@aws-cdk/core';
import * as kinesis from "@aws-cdk/aws-kinesis";
import * as iam from "@aws-cdk/aws-iam";

export interface DataLakeIngestionStreamProps {
    name: string,
    shardCount: number
}

export class DataLakeIngestionStream extends cdk.Construct {
    public readonly stream: kinesis.Stream;
    public readonly serviceRole: iam.Role;

    constructor(scope: cdk.Construct, id: string, props: DataLakeIngestionStreamProps) {
        super(scope, id);

        this.stream = new kinesis.Stream(this, 'DataLakeIngestStream', {
            streamName: props.name,
            shardCount: props.shardCount
        });



    }
}