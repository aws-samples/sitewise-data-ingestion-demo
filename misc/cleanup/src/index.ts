// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0
import {IoTSiteWise} from 'aws-sdk';

const SiteWise = new IoTSiteWise({
    region: 'us-east-1'
});

const assetModelId : string = process.env.ASSET_MODEL_ID || '';

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

const extractAssetIds = (result: IoTSiteWise.AssetSummary[]) => result.map(assetSummary => assetSummary.id);

const deleteAsset = async function(assetId: string) {
    return await SiteWise.deleteAsset({
        assetId: assetId
    }).promise();
};

const deleteAssetModel = async function() {
    return await SiteWise.deleteAssetModel({
        assetModelId: assetModelId
    }).promise();
};

getAssetPages()
    .then((assetSummaries) => {
        console.log('');
        console.log(`Obtained ${assetSummaries.length} assets.`);
        return assetSummaries;
    })
    .then(extractAssetIds)
    .then((assetIds: string[]) => {
        assetIds.forEach(deleteAsset);
    })
    .then(() => {
        return deleteAssetModel
    });
