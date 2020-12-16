// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0
import * as cdk from '@aws-cdk/core';
import * as sitewise from '@aws-cdk/aws-iotsitewise';
import {TurbineAssetModel} from "./turbine-asset-model-construct";

export interface WindFarmAssetModelProps {
    turbineAssetModel: TurbineAssetModel
}

export class WindFarmAssetModel extends cdk.Construct {
    public readonly ref: string;
    public readonly windFarmTurbineHierarchyLogicalId: string;
    public turbineAssetModel: TurbineAssetModel;

    private assetModel: sitewise.CfnAssetModel;

    private composeLogicalId(idStub: string): string {
        return `${this.node.id}-${idStub}`;
    }

    constructor(scope: cdk.Construct, id: string, props: WindFarmAssetModelProps) {
        super(scope, id);
        this.turbineAssetModel = props.turbineAssetModel;

        this.windFarmTurbineHierarchyLogicalId = this.composeLogicalId('WindFarmAssetModelTurbineHierarchy');

        this.assetModel = new sitewise.CfnAssetModel(this, 'WindFarmAssetModel', {
            assetModelName: 'Demo Wind Farm Asset Model',
            assetModelDescription: 'This is an asset model used in the IoT SiteWise Demo for representing a wind farm. It will be deleted at the end of the demo.',
            assetModelProperties: [
                {
                    name: 'Reliability Manager',
                    dataType: 'STRING',
                    logicalId: 'WindFarmAssetModelReliabilityManagerAttribute',
                    type: {
                        typeName: 'Attribute',
                        attribute: { defaultValue: 'Mary Major' } }
                },
                {
                    name: 'Code',
                    dataType: 'INTEGER',
                    logicalId: 'WindFarmAssetModelCodeAttribute',
                    type: {
                        typeName: 'Attribute',
                        attribute: { defaultValue: '300' } }
                },
                {
                    name: 'Location',
                    dataType: 'STRING',
                    logicalId: 'WindFarmAssetModelLocationAttribute',
                    type: {
                        typeName: 'Attribute',
                        attribute: { defaultValue: 'Renton' } }
                },
                {
                    name: 'Total Average Power',
                    dataType: 'DOUBLE',
                    logicalId: 'WindFarmAssetModelTotalAveragePowerMetric',
                    unit: "Watts",
                    type: {
                        typeName: 'Metric',
                        metric: {
                            expression: "sum(turbine_avg_power)",
                            variables: [
                                {
                                    name: 'turbine_avg_power',
                                    value:
                                        {
                                            propertyLogicalId: this.turbineAssetModel.averagePowerLogicalId,
                                            hierarchyLogicalId: this.windFarmTurbineHierarchyLogicalId
                                        }
                                }
                            ],
                            window: { tumbling: { interval: '5m' } }
                        }
                    }
                },
                {
                    name: 'Total Overdrive State Time',
                    dataType: 'DOUBLE',
                    logicalId: 'WindFarmAssetModelTotalOverdriveStateTimeMetric',
                    unit: "seconds",
                    type: {
                        typeName: 'Metric',
                        metric: {
                            expression: "sum(overdrive_state_time)",
                            variables: [
                                {
                                    name: 'overdrive_state_time',
                                    value:
                                        {
                                            propertyLogicalId: this.turbineAssetModel.overdriveStateTimeLogicalId,
                                            hierarchyLogicalId: this.windFarmTurbineHierarchyLogicalId
                                        }
                                }
                            ],
                            window: { tumbling: { interval: '5m' } }
                        }
                    }
                }
            ],
            assetModelHierarchies: [
                {
                    childAssetModelId: this.turbineAssetModel.ref,
                    logicalId: this.windFarmTurbineHierarchyLogicalId,
                    name: 'Turbine Asset Model'
                }
            ]
        });

        new cdk.CfnOutput(this, 'WindFarmTurbineHierarchyLogicalId', {
            value: this.windFarmTurbineHierarchyLogicalId,
            description: 'LogicalID of hierarchical association between Wind Farm asset model and Turbine asset model.'
        });

        new cdk.CfnOutput(this, 'WindFarmAssetModelId', {
            value: this.assetModel.ref,
            description: 'LogicalID of Wind Farm asset model.'
        });

        this.ref = this.assetModel.ref;
    }
}