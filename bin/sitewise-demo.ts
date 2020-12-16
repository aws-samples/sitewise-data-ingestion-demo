#!/usr/bin/env node
// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0
import 'source-map-support/register';
import * as fs from 'fs';
import * as path from 'path';
import { promisify } from 'util';

import * as cdk from '@aws-cdk/core';

import { AssetModelStack } from '../lib/stacks/asset-model-stack';
import {WindFarmStack} from "../lib/stacks/wind-farm-stack";
import {DataLakeStack} from "../lib/stacks/data-lake-stack";

const readFile = promisify(fs.readFile);

const app = new cdk.App();

new AssetModelStack(app, 'AssetModelsStack');

const getWindFarmState = async function () {
    try {
        const contents = await readFile(path.join('.state', 'current-state.json'));
        const windFarmStackCount = JSON.parse(contents.toString('ascii')).windFarmStackCount;
        return windFarmStackCount;
    } catch (e) {
        if (e.code === 'ENOENT') {
            throw new Error('No ascertained current state for Wind Farms. Try `cd misc/windfarm-stack-manager && node dist/index.js init`');
        } else {
            throw new Error(e);
        }
    }
}
// Always allow creating yet another five Wind Farms. Gets the current number of Wind Farm stacks and adds one.
const limit  = 1;

getWindFarmState().then(limit => {
    for (let i = 0; i < limit; i++) {
        new WindFarmStack(app, `WindFarmStack${i}`);
    }

    new DataLakeStack(app, 'DataLakeStack');
}).catch(err => {
    console.error(err);
});
