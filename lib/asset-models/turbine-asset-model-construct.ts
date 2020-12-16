// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0
import * as cdk from '@aws-cdk/core';
import * as sitewise from '@aws-cdk/aws-iotsitewise';


export interface TurbineAssetModelProps {}

export class TurbineAssetModel extends cdk.Construct {
    public readonly ref: string;
    public readonly averagePowerLogicalId: string;
    public readonly overdriveStateTimeLogicalId: string;

    private assetModel: sitewise.CfnAssetModel;

    private composeLogicalId(idStub: string):string {
        return idStub;
    }

    constructor(scope: cdk.Construct, id: string, props: TurbineAssetModelProps) {
        super(scope, id);

        this.averagePowerLogicalId = this.composeLogicalId('TurbineAssetModelAvgPowerMetric');
        this.overdriveStateTimeLogicalId = this.composeLogicalId('TurbineAssetModelOverdriveStateTimeMetric');

        this.assetModel = new sitewise.CfnAssetModel(this, 'TurbineAssetModel', {
            assetModelName: 'Demo Turbine Asset Model',
            assetModelDescription: 'This is an asset model used in the IoT SiteWise Demo for representing a turbine in a wind farm. It will be deleted at the end of the demo.',
            assetModelProperties: [
                // ATTRIBUTES
                {
                    name: 'Make',
                    dataType: 'STRING',
                    logicalId: this.composeLogicalId('TurbineAssetModelMakeAttribute'),
                    type: {
                        typeName: 'Attribute',
                        attribute: { defaultValue: 'Amazon' }
                    }
                },
                {
                    name: 'Model',
                    dataType: 'INTEGER',
                    logicalId: this.composeLogicalId('TurbineAssetModelModelAttribute'),
                    type: {
                        typeName: 'Attribute',
                        attribute: { defaultValue: '500' }
                    }
                },
                {
                    name: 'Location',
                    dataType: 'STRING',
                    logicalId: this.composeLogicalId('TurbineAssetModelLocationAttribute'),
                    type: {
                        typeName: 'Attribute',
                        attribute: { defaultValue: 'Renton' }
                    }
                },

                // MEASUREMENTS
                {
                    name: "Torque (KiloNewton Meter)",
                    dataType: 'DOUBLE',
                    logicalId: this.composeLogicalId('TurbineAssetModelTorqueMeasurement'),
                    unit: 'kNm',
                    type: {
                        typeName: 'Measurement'
                    }
                },
                {
                    name: "Wind Direction",
                    dataType: 'DOUBLE',
                    logicalId: this.composeLogicalId('TurbineAssetModelWindDirectionMeasurement'),
                    unit: 'Degrees',
                    type: { typeName: 'Measurement' }
                },
                {
                    name: 'RotationsPerMinute',
                    dataType: 'DOUBLE',
                    logicalId: this.composeLogicalId('TurbineAssetModelRPMMeasurement'),
                    unit: 'RPM',
                    type: { typeName: 'Measurement' }
                },
                {
                    name: 'Wind Speed',
                    dataType: 'DOUBLE',
                    logicalId: this.composeLogicalId('TurbineAssetModelWindSpeedMeasurement'),
                    unit: 'm/s',
                    type: { typeName: 'Measurement' }
                },

                // TRANSFORMS
                {
                    name: "Torque (Newton Meter)",
                    dataType: 'DOUBLE',
                    logicalId: this.composeLogicalId('TurbineAssetModelTorqueTransform'),
                    unit: 'Nm',
                    type: {
                        typeName: 'Transform',
                        transform: {
                            expression: 'knm * 1000',
                            variables: [
                                {
                                    name: 'knm',
                                    value: { propertyLogicalId: this.composeLogicalId('TurbineAssetModelTorqueMeasurement') }
                                }
                            ]
                        }
                    }
                },
                {
                    name: 'RotationsPerSecond',
                    dataType: 'DOUBLE',
                    logicalId: this.composeLogicalId('TurbineAssetModelRPSTransform'),
                    unit: 'RPS',
                    type: {
                        typeName: 'Transform',
                        transform: {
                            expression: 'rpm / 60',
                            variables: [
                                {
                                    name: 'rpm',
                                    value: { propertyLogicalId: this.composeLogicalId('TurbineAssetModelRPMMeasurement') }
                                }
                            ]
                        }
                    }
                },
                {
                    name: 'Overdrive State',
                    dataType: 'DOUBLE',
                    logicalId: this.composeLogicalId('TurbineAssetModelOverdriveStateTransform'),
                    type: {
                        typeName: 'Transform',
                        transform: {
                            expression: 'gte(torque,3)',
                            variables: [
                                {
                                    name: 'torque',
                                    value: { propertyLogicalId: this.composeLogicalId('TurbineAssetModelTorqueMeasurement') }
                                }
                            ]
                        }
                    }
                },

                // METRICS
                {
                    name: 'Average Wind Speed',
                    dataType: 'DOUBLE',
                    logicalId: this.composeLogicalId('TurbineAssetModelAverageWindSpeedMetric'),
                    unit: 'm/s',
                    type: {
                        typeName: 'Metric',
                        metric: {
                            expression: 'avg(windspeed)',
                            variables: [
                                {
                                    name: 'windspeed',
                                    value: { propertyLogicalId: this.composeLogicalId('TurbineAssetModelWindSpeedMeasurement') }
                                }
                            ],
                            window: { tumbling: { interval: '5m' } }
                        }
                    }
                },
                {
                    name: 'Overdrive State Time',
                    dataType: 'DOUBLE',
                    logicalId: this.overdriveStateTimeLogicalId,
                    unit: 'Seconds',
                    type: {
                        typeName: 'Metric',
                        metric: {
                            expression: 'statetime(overdrive_state)',
                            variables: [
                                {
                                    name: 'overdrive_state',
                                    value: { propertyLogicalId: this.composeLogicalId('TurbineAssetModelOverdriveStateTransform') }
                                }
                            ],
                            window: { tumbling: { interval: '5m' } }
                        }
                    }
                },
                {
                    name: 'Avg Power',
                    dataType: 'DOUBLE',
                    logicalId: this.averagePowerLogicalId,
                    unit: 'Watts',
                    type: {
                        typeName: 'Metric',
                        metric: {
                            expression: 'avg(torque) * avg(rps) * 2 * 3.14',
                            variables: [
                                {
                                    name: 'torque',
                                    value: { propertyLogicalId: this.composeLogicalId('TurbineAssetModelTorqueTransform') }
                                },
                                {
                                    name: 'rps',
                                    value: { propertyLogicalId: this.composeLogicalId('TurbineAssetModelRPSTransform') }
                                }
                            ],
                            window: { tumbling: { interval: '5m' } }
                        }
                    }
                }
            ]
        });

        new cdk.CfnOutput(this, 'TurbineAssetModelId', {
            value: this.assetModel.ref,
            description: 'LogicalID of Turbine asset model.'
        });

        this.ref = this.assetModel.ref;
    }
}