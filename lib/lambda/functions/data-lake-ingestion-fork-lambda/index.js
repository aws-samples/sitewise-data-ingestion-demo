// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0
const aws = require('aws-sdk');

const s3 = new aws.S3();
const firehose = new aws.Firehose();
const timestreamWrite = new aws.TimestreamWrite();

let assetMap = {};

async function getMapping() {
    const response = await s3.getObject({
        Bucket: process.env.ASSET_MAP_BUCKET || '',
        Key: 'mapping.json'
    }).promise();

    console.log('Asset map not in cache. Retrieved from S3.');
    assetMap = JSON.parse(response.Body.toString('ascii'));
    return assetMap;
}

getMapping();

const writeToTimestream = async function(dataPoints) {
    const recordsToWrite = dataPoints.map(dp => {
        return {
            Dimensions: [{ Name: 'alias', Value: dp.alias }],
            MeasureName: dp.alias,
            MeasureValue: dp.value.toString(),
            MeasureValueType: 'DOUBLE',
            Time: dp.timestamp.toString(),
            TimeUnit: 'SECONDS'
        }
    });

    const request = timestreamWrite.writeRecords({
        DatabaseName: process.env.TIMESTREAM_DATABASE_NAME || '',
        TableName: process.env.TIMESTREAM_TABLE_NAME || '',
        Records: recordsToWrite
    });

    try {

        const result = await request.promise();
        return result;
    } catch(err) {
        console.error(err);
        const response = JSON.parse(request.response.httpResponse.body.toString());
        console.error(response);
    }

};

module.exports.handler = async function handler(event) {
    if ((typeof assetMap === 'undefined') || (Object.keys(assetMap).length == 0)) {
        await getMapping();
    }

    const recordsForFirehose = [];
    const recordsForTimestream = [];

    event.Records.forEach((record) => {
        try {
            const data = JSON.parse(Buffer.from(record.kinesis.data, 'base64').toString('ascii'));
            const propertyAlias = assetMap[data.assetId][data.propertyId];

            if (/windfarms\/.*?\/turbines\/.*?\/(?:average-wind-speed|overdrive-state-time)/.test(propertyAlias)) {
                recordsForTimestream.push(Object.assign({}, data, {alias: propertyAlias}));
            } else {
                const recordString = `${JSON.stringify(Object.assign({}, data, {alias: propertyAlias}))}\n`;
                recordsForFirehose.push({ Data: recordString });
            }
        } catch(err) {
            // Do something better than this.
            console.error(err);
        }
    });

    const promises = [];

    if(recordsForFirehose.length) {
        promises.push(firehose.putRecordBatch({
            DeliveryStreamName: process.env.FIREHOSE_DELIVERY_STREAM_NAME,
            Records: recordsForFirehose
        }).promise());
    }

    if(recordsForTimestream.length) {
        promises.push(writeToTimestream(recordsForTimestream));
    }

    if(promises.length) {
        await Promise.all(promises);
    }
};