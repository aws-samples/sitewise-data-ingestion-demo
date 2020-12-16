// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0
import * as cdk from '@aws-cdk/core';
import * as sitewise from '@aws-cdk/aws-iotsitewise';
import {UidGenerator} from '../util/uid';

import {TurbineAsset} from "./turbine-asset-construct";
import {WindFarmAssetModel} from "../asset-models/wind-farm-asset-model-construct";
import {WindFarmAssetIdentification} from "../stacks/wind-farm-stack";

const uid = new UidGenerator();

export interface WindFarmAssetProps {
    numberOfTurbines: number,
    turbineAssetModelId: string,
    windFarmAssetModelId: string,
    windFarmTurbineHierarchyLogicalId: string
}

export class WindFarmAsset extends cdk.Construct {
    public readonly turbines: TurbineAsset[];
    public readonly ref: string;
    public readonly windFarmId: string;

    private windFarm: sitewise.CfnAsset;

    constructor(scope: cdk.Construct, id: string, props: WindFarmAssetProps) {
        super(scope, id);

        this.windFarmId = uid.vend();

        this.turbines = [];

        for (let i = 0; i < props.numberOfTurbines; i++) {
            this.turbines.push(new TurbineAsset(this, `TurbineAsset${i+1}`, {
                name: uid.vend(),
                windFarmId: this.windFarmId,
                modelId: props.turbineAssetModelId,
            }));
        }

        const assetHierarchies = this.turbines.map(turbine => {
           return {
               childAssetId: turbine.ref,
               logicalId: props.windFarmTurbineHierarchyLogicalId
           };
        });

        this.windFarm = new sitewise.CfnAsset(this, 'WindFarmAsset', {
            assetName: `Windfarm ${this.windFarmId}`,
            assetModelId: props.windFarmAssetModelId,
            assetHierarchies: assetHierarchies
        });

        this.ref = this.windFarm.ref;
    }
}