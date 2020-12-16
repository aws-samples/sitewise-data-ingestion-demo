// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0
import * as fs from 'fs';
import * as path from 'path';
import {promisify} from 'util';

import {CloudFormation} from 'aws-sdk';
import {filter} from "lodash";
const yargs = require('yargs/yargs');
const { hideBin } = require('yargs/helpers');

const cfn = new CloudFormation({
    region: 'us-east-1'
});

const argv = yargs(hideBin(process.argv))
    .command('init', 'add the number of WindFarm stacks to the project that reflect the current stazte in Cloudformation', (yargs: any) => {

    })
    .command('add [count]', 'add the specified number of WindFarm stacks to the project, enabling them to be deployed subsequently to AWS', (yargs: any) => {
        yargs.positional('count', {
            describe: 'number of WindFarm stacks to add',
            default: 1
        });
    })
    .command('remove [count]', 'remove the specified number of WindFarm stacks from the project, provided that they are not already deployed to AWS', (yargs: any) => {
        yargs.positional('count', {
            describe: 'number of WindFarm stacks to remove',
            default: 1
        });
    })
    .argv;

const command = argv._[0];


const getWindFarmStacks = async function () {
    const stacks = await cfn.listStacks({ StackStatusFilter: ['CREATE_COMPLETE'] }).promise();
    return filter(stacks.StackSummaries, (stack: CloudFormation.StackSummary) => {
        return /WindFarmStack\d*/.exec(stack.StackName);
    }).length;
};

const writeFile = promisify(fs.writeFile);
const readFile = promisify(fs.readFile);
const mkdir = promisify(fs.mkdir);
const filePath = path.join(__dirname, '..', '..', '..', '.state');

const writeWindFarmStackCount = async function (count: number) {
    const fileBody = JSON.stringify({windFarmStackCount: count})
    try {
        await writeFile(path.join(filePath, 'current-state.json'), fileBody);
    } catch (e) {
        if (e.code === 'ENOENT') {
            await mkdir(filePath);
            await writeFile(path.join(filePath, 'current-state.json'), fileBody);
        } else {
            throw new Error(e);
        }
    }
}

const init = async function () {
    const stackCount = await getWindFarmStacks();
    await writeWindFarmStackCount(stackCount);
};

const add = async function (count: number) {
    const contents = (await readFile(path.join(filePath, 'current-state.json'))).toString('ascii');
    const numStacks = JSON.parse(contents).windFarmStackCount;
    await writeWindFarmStackCount(numStacks + count);
};

const remove = async function (count : number) {
    const numWindFarmStacks = await getWindFarmStacks();
    const contents = (await readFile(path.join(filePath, 'current-state.json'))).toString('ascii');
    const numStacks = JSON.parse(contents).windFarmStackCount;

    if (numStacks - count < numWindFarmStacks) {
        throw new Error('Cannot remove this many stacks without bringing application out of sync with Cloudformation. Try removing fewer stacks.');
    }

    await writeWindFarmStackCount(numStacks - count);

}

if (command === 'init') {
    init().then(() => {console.log('done')}).catch(console.error);
}

if (command === 'add') {
    add(argv.count).then(() => {console.log('done')}).catch(console.error);
}

if (command === 'remove') {
    remove(argv.count).then(() => console.log('done')).catch(console.error);
}
//
//
// getWindFarmStacks().then((stacks) => {
//     const limit = stacks.length + 5;
// });
//
