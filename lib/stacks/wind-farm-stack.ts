// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0
import * as cdk from "@aws-cdk/core";
import {WindFarmAsset} from "../assets/wind-farm-asset";
import {WindFarmAssetModel} from "../asset-models/wind-farm-asset-model-construct";

export interface WindFarmAssetIdentification {
    name: string;
    num: number;
    guid: string;
}

export class WindFarmStack extends cdk.Stack {
    public readonly windFarm: WindFarmAsset;

    constructor(scope: cdk.Construct, id: string) {
        super(scope, id);

        const windFarmAssetModelIdParameter = new cdk.CfnParameter(this, 'WindFarmAssetModelIdParameter', {
            type: 'String',
            description: 'Provide a logical ID for the hierarchy between the Wind Farm asset model and the Turbine asset model.'
        });

        const turbineAssetModelIdParameter = new cdk.CfnParameter(this, 'TurbineAssetModelIdParameter', {
            type: 'String',
            description: 'Provide a logical ID for the hierarchy between the Wind Farm asset model and the Turbine asset model.'
        });

        const windFarmTurbineHierarchyLogicalIdParameter = new cdk.CfnParameter(this, 'WindFarmTurbineHierarchyLogicalIdParameter', {
            type: 'String',
            description: 'Provide a logical ID for the hierarchy between the Wind Farm asset model and the Turbine asset model.'
        });

        this.windFarm = new WindFarmAsset(this, 'WindFarmStack', {
            windFarmAssetModelId: windFarmAssetModelIdParameter.valueAsString,
            turbineAssetModelId: turbineAssetModelIdParameter.valueAsString,
            numberOfTurbines: this.node.tryGetContext('numTurbines'),
            windFarmTurbineHierarchyLogicalId: windFarmTurbineHierarchyLogicalIdParameter.valueAsString
        });
    }
}