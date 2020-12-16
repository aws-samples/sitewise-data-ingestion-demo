// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0
import {Turbine} from "./turbine";
import {IoTSiteWise} from 'aws-sdk';
const ora = require('ora');
const _ = require('lodash');


import {SitewiseBatchPutEntry} from "./sitewise-batch-put-entry";

let entriesCount = 0;

const assetModelId = process.env.ASSET_MODEL_ID;
const frequency = 60 * 1000; // 60 seconds.

const SiteWise = new IoTSiteWise({
    region: 'us-east-1'
});

const extractAssetIds = (result: IoTSiteWise.AssetSummary[]) => result.map(assetSummary => assetSummary.id);
const createTurbinesForAssets = (assetIds: string[]) => {
    process.stdout.write('Obtaining property IDs for all assets');
    return Promise.all(assetIds.map((assetId, i) => {
        return new Promise((resolve, reject) => {
            setTimeout(() => {
                resolve({});
            }, i * 50) // Space these non-bulk calls out by 50ms to avoid exceeding rate limit
        }).then(() => {
            process.stdout.write('.');

            return SiteWise.describeAsset({ assetId: assetId }).promise()
                .then(asset => {
                    const assetProperties = asset.assetProperties;

                    const torqueProperty = _.filter(assetProperties, {name: 'Torque (KiloNewton Meter)'})[0];
                    const windDirectionProperty = _.filter(assetProperties, {name: 'Wind Direction'})[0];
                    const rotationsPerMinuteProperty = _.filter(assetProperties, {name: 'RotationsPerMinute'})[0];
                    const windSpeedProperty = _.filter(assetProperties, {name: 'Wind Speed'})[0];

                    return new Turbine({
                        assetId: assetId,
                        torquePropertyId: torqueProperty.id,
                        windDirectionPropertyId: windDirectionProperty.id,
                        rotationsPerMinutePropertyId: rotationsPerMinuteProperty.id,
                        windSpeedPropertyId: windSpeedProperty.id
                    });
                });
        });

    }));
};


const startDataGenerationForTurbines = (turbines: Turbine[]) => {
    console.log('');
    console.log(`Starting data generation for ${turbines.length} turbines at ${new Date().toDateString()}.`);
    console.log(`Writing data at frequency of one data point per tag per ${frequency/1000} seconds.`);

    const numPages = 6;
    const pages = _.chunk(turbines, turbines.length /numPages);

    pages.forEach((page: Turbine[], i: number) => {
        const offset = frequency / numPages * i;
        console.log(`Setting up ${page.length} turbines to push data at offset ${offset / 1000} seconds.`);

        setTimeout(() => {
            setInterval(() => {
                const entries = generateEntriesForAllTurbines(page);
                sendEntriesToSitewise(entries);
            }, frequency);
        }, offset);
    });
    spinner = ora('Waiting');
    spinner.color = 'white';
    spinner.start();
};

function generateEntriesForAllTurbines(turbines: Turbine[]) {
    const entries: SitewiseBatchPutEntry[] = [];
    const timestamp = Math.round(Date.now() / 1000).toString();

    turbines.forEach(turbine => {
        entries.push(new SitewiseBatchPutEntry({
            assetId: turbine.assetId,
            propertyId: turbine.torqueDataGenerator.propertyId,
            timestamp: timestamp,
            value: turbine.torqueDataGenerator.nextValue()
        }));
        entries.push(new SitewiseBatchPutEntry({
            assetId: turbine.assetId,
            propertyId: turbine.windSpeedDataGenerator.propertyId,
            timestamp: timestamp,
            value: turbine.windSpeedDataGenerator.nextValue()
        }));

        entries.push(new SitewiseBatchPutEntry({
            assetId: turbine.assetId,
            propertyId: turbine.windDirectionDataGenerator.propertyId,
            timestamp: timestamp,
            value: turbine.windDirectionDataGenerator.nextValue()
        }));

        entries.push(new SitewiseBatchPutEntry({
            assetId: turbine.assetId,
            propertyId: turbine.rotationsPerMinuteDataGenerator.propertyId,
            timestamp: timestamp,
            value: turbine.rotationsPerMinuteDataGenerator.nextValue()
        }));
    });

    return entries;
};
const sendEntriesToSitewise = function(entries: SitewiseBatchPutEntry[]) {
    const pageSize = 10;
    const pages = _.chunk(entries, pageSize);
    pages.forEach(sendPageToSitewise);


};
const sendPageToSitewise = function(page: SitewiseBatchPutEntry[]) {
    const params = {
        entries: page.map(entry => entry.toApiEntry())
    };

    SiteWise.batchPutAssetPropertyValue(params).promise()
        .then((result) => {
            entriesCount = entriesCount + params.entries.length;
            spinner.text = `Sent ${entriesCount} data points.`;
        });
};

const getAssetPages = async function(nextToken?: string) {
    const listAssetResponse = await SiteWise.listAssets({assetModelId: assetModelId, nextToken: nextToken}).promise();
    process.stdout.write('.');
    let assetSummaries = listAssetResponse.assetSummaries;

    if (typeof listAssetResponse.nextToken !== 'undefined') {
        const nextPageResults = await getAssetPages(listAssetResponse.nextToken);
        assetSummaries = assetSummaries.concat(nextPageResults);
    }

    return assetSummaries;
};

let spinner: any;
process.stdout.write('Obtaining all asset pages for asset model');
getAssetPages()
    .then((assetSummaries) => {
        console.log('');
        console.log(`Obtained ${assetSummaries.length} assets.`);
        return assetSummaries;
    })
    .then(extractAssetIds)
    .then(createTurbinesForAssets)
    .then(startDataGenerationForTurbines);
