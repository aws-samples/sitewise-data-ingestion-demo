// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0
export interface DataGeneratorProps {
    min: number;
    max: number;
    minIncrement: number;
    maxIncrement: number;
    propertyId: string;
}

export enum Operation {
    Add = 0,
    Subtract = 1
}

export class DataGenerator {
    public lastValue: number;
    public propertyId: string;

    private readonly min: number;
    private readonly max: number;
    private readonly minIncrement: number;
    private readonly maxIncrement: number;

    constructor(props: DataGeneratorProps) {
        this.min = props.min;
        this.max = props.max;
        this.minIncrement = props.minIncrement;
        this.maxIncrement = props.maxIncrement;

        this.propertyId = props.propertyId;

        this.lastValue = this.generateRandomWithinBounds(this.min, this.max);
    }

    public nextValue(): number {
        const increment = this.generateRandomWithinBounds(this.minIncrement, this.maxIncrement);
        const operation = this.randomOperation();

        if (operation === Operation.Add) {
            if (this.lastValue + increment > this.max) {
                this.lastValue -= increment;
            } else {
                this.lastValue += increment;
            }
        }

        if (operation === Operation.Subtract) {
            if (this.lastValue - increment < this.min) {
                this.lastValue += increment;
            } else {
                this.lastValue -= increment;
            }
        }

        return this.lastValue;
    }

    private generateRandomWithinBounds(min: number, max: number): number {
        return Math.floor(Math.random() * max) + min;
    }

    private randomOperation(): Operation {
        return this.generateRandomWithinBounds(0, 2) === 0 ? Operation.Add : Operation.Subtract;
    }
}