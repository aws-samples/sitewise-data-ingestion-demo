// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0
const aws = require('aws-sdk');
const _ = require('lodash');
const https = require("https");
const url = require("url");

const flatten = _.flatten;
const filter = _.filter;

const SiteWise = new aws.IoTSiteWise();

const s3 = new aws.S3();

const assetModelId = process.env.ASSET_MODEL_ID;
const s3BucketName = process.env.S3_BUCKET_NAME;


const getAssetPages = async function(nextToken) {
    const listAssetResponse = await SiteWise.listAssets({assetModelId: assetModelId, nextToken: nextToken}).promise();
    let assetSummaries = listAssetResponse.assetSummaries;

    if (typeof listAssetResponse.nextToken !== 'undefined') {
        const nextPageResults = await getAssetPages(listAssetResponse.nextToken);
        assetSummaries = assetSummaries.concat(nextPageResults);
    }

    return assetSummaries;
};

const extractAssetIds = (result) => result.map(assetSummary => assetSummary.id);

const create = async function (event) {
    return getAssetPages()
        .then(extractAssetIds)
        .then((assetIds) => {

            return Promise.all(assetIds.map((assetId, i) => {
                return new Promise((resolve, reject) => {
                    setTimeout(() => {
                        resolve();
                    }, i * 50)
                }).then(() => {
                    return SiteWise.describeAsset({assetId: assetId}).promise().then(result => {
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

            let finalMap = {};
            const collection = filter(flatten(toFlatten), item => typeof item.alias !== 'undefined');
            collection.forEach((item) => {
                if (typeof finalMap[item.assetId] === 'undefined') {
                    finalMap[item.assetId] = {[item.propertyId]: item.alias}
                } else {
                    finalMap[item.assetId][item.propertyId] = item.alias;
                }
            });
            return finalMap;
        })
        .then(mapping => {
            console.log('Writing to S3');

            return s3.putObject({
                Bucket: s3BucketName,
                Body: JSON.stringify(mapping),
                Key: 'mapping.json'
            }).promise().then(result => {
                console.log(`Written to S3. Result: ${JSON.stringify(result)}`);
            });
        });
};

const update = async function (event) {
    return await create(event); // Update is just to redo the mapping.
};

const destroy = async function (event) {

};

const successPayload = function (event) {
    const payload = {
        Status: 'SUCCESS',
        RequestId: event.RequestId,
        LogicalResourceId: 'AssetMap',
        StackId: event.StackId,
        PhysicalResourceId: `${process.env.S3_BUCKET_NAME}AssetMap`,
        Data: {
            "Url": `s3://${process.env.S3_BUCKET_NAME}/mapping.json`
        }
    };

    console.log(`Response payload: ${JSON.stringify(payload)}`);
    return payload;
};

const failPayload = function (event, error) {
    const payload = {
        Status: 'ERROR',
        Reason: `${error}`,
        RequestId: event.RequestId,
        LogicalResourceId: 'AssetMap',
        StackId: event.StackId,
        PhysicalResourceId: `${process.env.S3_BUCKET_NAME}AssetMap`
    };

    console.log(`Response payload: ${JSON.stringify(payload)}`);
    return payload;
};

const sendResponse = (event, success, payload) => new Promise((resolve, reject) => {
    const parsedUrl = url.parse(event.ResponseURL);
    const responseBody = JSON.stringify(payload);

    const options = {
        hostname: parsedUrl.hostname,
        port: 443,
        path: parsedUrl.path,
        method: "PUT",
        headers: {
            "content-type": "",
            "content-length": responseBody.length
        }
    };

    const request = https.request(options, function(response) {
        resolve();
    });

    request.on("error", function(error) {
        reject();
    });

    // write data to request body
    request.write(responseBody);
    request.end();
});

module.exports.handler = async function (event) {
    console.log('ASSET MAPPER INVOKED');
    console.log(JSON.stringify(event));

    if (event.RequestType === 'Create') {
        try {
            await create(event);
            return await sendResponse(event, true, successPayload(event));
        } catch (e) {
            return await sendResponse(event, false, failPayload(event, e));
        }
    } else if (event.RequestType === 'Update') {
        try {
            await update(event);
            return await sendResponse(event, true, successPayload(event));
        } catch (e) {
            return await sendResponse(event, false, failPayload(event, e));
        }
    } else if (event.RequestType === 'Delete') {
        // Do nothing
        return await sendResponse(event, true, successPayload(event));
    } else {
        return await sendResponse(event, false, failPayload(event, e));
    }
}