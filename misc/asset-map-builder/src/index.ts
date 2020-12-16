// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0
import {IoTSiteWise, S3} from 'aws-sdk';
import {flatten, filter} from 'lodash';

const SiteWise = new IoTSiteWise({
    region: 'us-east-1'
});

const s3 = new S3({
    region: 'us-east-1'
});

const assetModelId : string = process.env.ASSET_MODEL_ID || '';
const s3BucketName : string = process.env.S3_BUCKET_NAME || '';

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

interface CollectionItem {
    assetId: string
    propertyId: string
    alias?: string
}


getAssetPages()
    .then(extractAssetIds)
    .then((assetIds: string[]) => {
        return Promise.all(assetIds.map((assetId, i) => {
            return new Promise<void>((resolve, reject) => {
                setTimeout(() => {
                    resolve();
                }, i*50)
            }).then(() => {
                return SiteWise.describeAsset({ assetId: assetId}).promise().then(result => {
                    return result;
                });
            });
        }));
    })
    .then(assetDescriptions => {
        const toFlatten = assetDescriptions.map(assetDescription => {
            return assetDescription.assetProperties.map(assetProperty => {
                return {
                    assetId: assetDescription.assetId,
                    propertyId: assetProperty.id,
                    alias: assetProperty.alias
                }
            });
        });

        let finalMap: any = {};
        const collection: CollectionItem[] = filter(flatten(toFlatten), item => typeof item.alias !== 'undefined');
        collection.forEach((item: CollectionItem) => {
            if (typeof finalMap[item.assetId] === 'undefined') {
                finalMap[item.assetId] = {[item.propertyId]: item.alias}
            } else {
                finalMap[item.assetId][item.propertyId] = item.alias;
            }
        });
        return finalMap;
    })
    .then(mapping => {
        return s3.putObject({
            Bucket: s3BucketName,
            Body: JSON.stringify(mapping),
            Key: 'mapping.json'
        }).promise()
    });
