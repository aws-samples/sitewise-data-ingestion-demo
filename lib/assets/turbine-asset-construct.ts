// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0
import * as cdk from '@aws-cdk/core';

import * as sitewise from '@aws-cdk/aws-iotsitewise';

export interface TurbineAssetProps {
    name: string
    modelId: string
    windFarmId: string
}

export class TurbineAsset extends cdk.Construct {
    public readonly turbine: sitewise.CfnAsset;
    public readonly ref: string;

    constructor(scope: cdk.Construct, id: string, props: TurbineAssetProps) {
        super(scope, id);

        this.turbine = new sitewise.CfnAsset(this, 'TurbineAsset', {
            assetName: props.name,
            assetModelId: props.modelId,
            assetProperties: [
                {
                    logicalId: 'TurbineAssetModelTorqueTransform',
                    alias: `windfarms/${props.windFarmId}/turbines/${props.name}/torque`,
                    notificationState: 'ENABLED'
                },
                {
                    logicalId: 'TurbineAssetModelRPSTransform',
                    alias: `windfarms/${props.windFarmId}/turbines/${props.name}/rps`,
                    notificationState: 'ENABLED'
                },
                {
                    logicalId: 'TurbineAssetModelOverdriveStateTransform',
                    alias: `windfarms/${props.windFarmId}/turbines/${props.name}/overdrive-state`,
                    notificationState: 'ENABLED'
                },
                {
                    logicalId: 'TurbineAssetModelAverageWindSpeedMetric',
                    alias: `windfarms/${props.windFarmId}/turbines/${props.name}/average-wind-speed`,
                    notificationState: 'ENABLED'
                },
                {
                    logicalId: 'TurbineAssetModelOverdriveStateTimeMetric',
                    alias: `windfarms/${props.windFarmId}/turbines/${props.name}/overdrive-state-time`,
                    notificationState: 'ENABLED'
                }
            ]
        });

        this.ref = this.turbine.ref;
    }
}