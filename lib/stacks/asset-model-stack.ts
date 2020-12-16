// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0
import {TurbineAssetModel} from "../asset-models/turbine-asset-model-construct";
import {WindFarmAssetModel} from "../asset-models/wind-farm-asset-model-construct";
import * as cdk from "@aws-cdk/core";

export class AssetModelStack extends cdk.Stack {
    public turbineAssetModel: TurbineAssetModel;
    public windFarmAssetModel: WindFarmAssetModel;

    constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
        super(scope, id);

        this.turbineAssetModel = new TurbineAssetModel(this, 'TurbineAssetModel', {});
        this.windFarmAssetModel = new WindFarmAssetModel(this, 'WindFarmAssetModel', {
            turbineAssetModel: this.turbineAssetModel
        });

    }
}