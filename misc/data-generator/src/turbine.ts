// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0
import {DataGenerator} from "./data-generator";

export interface TurbineData {
    torque: number;
    windDirection: number;
    rotationsPerMinute: number;
    windSpeed: number;
}

export interface TurbineProps {
    assetId: string
    torquePropertyId: string
    windDirectionPropertyId: string
    rotationsPerMinutePropertyId: string
    windSpeedPropertyId: string
}

export class Turbine {
    public torqueDataGenerator: DataGenerator;
    public windDirectionDataGenerator: DataGenerator;
    public rotationsPerMinuteDataGenerator: DataGenerator;
    public windSpeedDataGenerator: DataGenerator;

    public assetId: string;

    constructor(props: TurbineProps) {
        this.torqueDataGenerator = new DataGenerator({
            min: 1,
            max: 4,
            minIncrement: 0.0001,
            maxIncrement: 0.05,
            propertyId: props.torquePropertyId
        });

        this.windDirectionDataGenerator = new DataGenerator({
            min: 0,
            max: 360,
            minIncrement: 0.1,
            maxIncrement: 5,
            propertyId: props.windDirectionPropertyId
        });
        this.rotationsPerMinuteDataGenerator = new DataGenerator({
            min: 10,
            max: 40,
            minIncrement: 0.1,
            maxIncrement: 0.5,
            propertyId: props.rotationsPerMinutePropertyId
        });
        this.windSpeedDataGenerator = new DataGenerator({
            min: 10,
            max: 50,
            minIncrement: 0.1,
            maxIncrement: 10.5,
            propertyId: props.windSpeedPropertyId
        });

        this.assetId = props.assetId;
    }

    public nextValue(): TurbineData {
        return {
            torque: this.torqueDataGenerator.nextValue(),
            windDirection: this.windDirectionDataGenerator.nextValue(),
            rotationsPerMinute: this.rotationsPerMinuteDataGenerator.nextValue(),
            windSpeed: this.windSpeedDataGenerator.nextValue()
        };
    }
}