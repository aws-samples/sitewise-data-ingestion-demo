# Sitewise and Data Ingestion Demo with CDK: Monitoring Up to 10,000 Industrial Assets with 40,000 Tags for Just Dollars Per Day

This project provides a demonstration of up to 10,000 industrial assets, each with four tags, that can flow data through 
[AWS IoT SiteWise](https://aws.amazon.com/iot-sitewise/) and into a data lake built across 
[Amazon S3](https://aws.amazon.com/s3/) and [Amazon Timestream](https://aws.amazon.com/timestream/). The project 
contains an application built on the [AWS Cloud Development Kit](https://aws.amazon.com/cdk/), as well as a handful of 
utilities for interacting with the demonstration.

# Basic Usage
```shell script
# Initialize app with existing WindFarm stacks
cd misc/windfarm-stack-manager && node dist/index.js init

# Deploy stacks for AWS IoT SiteWise Asset Models and Assets, 
cdk deploy AssetModelStack
cdk deploy WindFarmStack0 --parameters ... --context ...

# Deploy a stack for a data lake and data ingestion pipeline.
cdk deploy DataLakeStack

# Start generating data
cd /misc/data-generator && npx tsc
ASSET_MODEL_ID="[Turbine Asset Model ID]" node dist/index.js
```

# Architecture
![Architecture Diagram](https://github.com/aws-samples/sitewise-data-ingestion-demo/blob/main/docs/arch.png?raw=true "Architecture Diagram")

A data generator utility pushes measurements for all turbine assets into AWS IoT SiteWise at a rate of one measurement 
per minute per asset. The transforms and calculated metrics on all turbine assets are published to AWS IoT Core topics, 
for which a rule is set to push records into a Kinesis Data Stream. A Lambda function then pulls records off of Kinesis,
hydrates property aliases, and then writes transforms to an Amazon S3 bucket and metrics to Amazon Timestream.

# Example Run: 525 Turbines
![Cloudwatch dashboard for demo](https://github.com/aws-samples/sitewise-data-ingestion-demo/blob/main/docs/cloudwatch-dashboard.png?raw=true "Cloudwatch dashboard for demo")
At ~500 turbine assets (~2,000 tags) with one data point per minute per asset tag flowing into AWS IoT SiteWise, this architecture can easily handle the load, even with a single-sharded Kinesis Data Stream, and, therefore, a maximum Lambda concurrency of 1. 

Several CloudWatch metrics illuminated the success:
1. **PutRecord to Kinesis Latency:** Measures the amount of time it takes to get records into the Kinesis Data Stream. For PutRecord latency into Kinesis, p99 was no more than 139ms.
2. **Data Ingestion Lambda Execution Duration:** Measures the amount of time it took to execute a Lambda function reading records from the Kinesis Data Stream and writing to a Kinesis Firehose Delivery Stream and Amazon Timestream. For duration, p99 was no more than 354ms.
3. **Data Ingestion Lambda Event Source Mapping Iterator Age:** Measures the amount of time that records sat in the Kinesis Data Stream before being picked up by Lambda. Records sat in the stream for between 1 and 3 seconds.
4. **Firehose Delivery Stream to S3 Data Freshness:** Measures the amount of time that records sat in the Kinesis Firehose Delivery Stream before writing to Amazon S3. Ranged from 60-62 seconds, with a configured buffer time of 60 seconds.

# Getting Started
To begin, you must have [Node.js 10.3.0](https://nodejs.org/en/download/) installed on your system as well as the [AWS 
CLI](https://aws.amazon.com/cli/). Additionally, you must have the AWS CLI configured with credentials on your system. 
You must also install the CDK libraries and executable. Instructions to accomplish these steps are beyond the scope of 
the demo.

Next, in the root of the project, install all Node modules for all parts of the project that need them. A `build.sh` 
script has been included for this purpose:
```shell script
./build.sh
```

Once you have done this, you can begin deploying [Cloudformation](https://aws.amazon.com/cloudformation) stacks to 
build up the demo, as detailed in the Basic Usage section. Finally, you can generate semi-random data to the assets 
using the Data Generator utility included in the project.

![Data generator output](https://github.com/aws-samples/sitewise-data-ingestion-demo/blob/main/docs/data-generator.png?raw=true "Data generator output")

# Summary of Key Services Used
The below descriptions are excerpted from the AWS materials describing the services to which they pertain:

1. [AWS Cloud Development Kit](https://aws.amazon.com/cdk/). The AWS Cloud Development Kit (AWS CDK) is an open source software development framework to define your cloud application resources using familiar programming languages.
2. [AWS Cloudformation](https://aws.amazon.com/cloudformation/). AWS CloudFormation gives you an easy way to model a collection of related AWS and third-party resources, provision them quickly and consistently, and manage them throughout their lifecycles, by treating infrastructure as code.
3. [AWS IoT SiteWise](https://aws.amazon.com/iot-sitewise/). AWS IoT SiteWise is a managed service that makes it easy to collect, store, organize and monitor data from industrial equipment at scale to help you make better, data-driven decisions. 
4. [AWS IoT Core](https://aws.amazon.com/iot-core/). AWS IoT Core is a managed cloud service that lets connected devices easily and securely interact with cloud applications and other devices.
5. [AWS IAM](https://aws.amazon.com/iam). AWS Identity and Access Management (IAM) enables you to manage access to AWS services and resources securely. 
6. [Amazon Kinesis Data Streams](https://aws.amazon.com/kinesis). Amazon Kinesis makes it easy to collect, process, and analyze real-time, streaming data so you can get timely insights and react quickly to new information.
7. [AWS Lambda](https://aws.amazon.com/lambda). AWS Lambda is a serverless compute service that lets you run code without provisioning or managing servers, creating workload-aware cluster scaling logic, maintaining event integrations, or managing runtimes.
8. [Amazon Kinesis Data Firehose](https://aws.amazon.com/kinesis/data-firehose). Amazon Kinesis Data Firehose is the easiest way to reliably load streaming data into data lakes, data stores, and analytics services. 
9. [Amazon S3](https://aws.amazon.com/s3). Amazon Simple Storage Service (Amazon S3) is an object storage service that offers industry-leading scalability, data availability, security, and performance.
10. [Amazon Timestream](https://aws.amazon.com/timestream). Amazon Timestream is a fast, scalable, and serverless time series database service for IoT and operational applications that makes it easy to store and analyze trillions of events per day up to 1,000 times faster and at as little as 1/10th the cost of relational databases.
  
# Cloud Development Kit Application
This Cloud Development Kit application containes three different stacks. The first is an `AssetModelStack`, which 
contains definitions for the AWS IoT SiteWise asset models used in this demonstration. This demonstration uses Asset 
Models for wind turbines (the `Turbine` Asset Model) and wind farms (the `WindFarm` Asset Model). Wind farms are 
comprised of turbines.

This Cloud Development Kit application also contains a stack for deploying wind farms. In actuality, the application 
contains a theoretically unlimited number of stacks of this template, each with a different name in the style of `WindFarmStack0`, 
`WindFarmStack1`, `WindFarmStack2`, etc. A utility included in this project allows you to configure the number of 
WindFarm stacks you can deploy and to sync that number with the number of currently deployed WindFarm stacks in 
AWS Cloudformation. There is no limit to how many total wind farms can be deployed using this application, but AWS IoT 
SiteWise and AWS Cloudformation do provide service quotas that may affect your ability to deploy the desired number of 
assets and stacks.

Finally, this Cloud Development Kit application contains a stack for ingesting data from AWS IoT SiteWise by receiving 
data published from assets to topics in AWS IoT Cire and pushing those data into a data ingestion pipeline built on 
Amazon Kinesis Data Streams, Amazon Kinesis Data Firehose and AWS Lambda and, ultimately, into data storage in Amazon 
S3 and Amazon Timestream.

## Available Cloudformation Stacks

### AssetModelStack
The `AssetModelStack` deploys the Asset Models for AWS IoT SiteWise that are used in this demonstration. The demo 
consists of asset models for wind farms (`WindFarmAssetModel`) and turbines (`TurbineAssetModel`).

Asset models are based on those available in the AWS IoT Sitewise demo that is part of the AWS Management Console for 
the service.

#### WindFarmAssetModel
Type      | Name                       | Definition
----------|----------------------------|-----------------------------
Attribute | Reliability Manager        | 
Attribute | Code                       |
Attribute | Location                   |
Metric    | Total Average Power        | `sum(turbine_avg_power)`
Metric    | Total Overdrive State Time | `sum(overdrive_state_time)`
Hierarchy |                            | `TurbineAssetModel`

#### TurbineAssetModel
Type        | Name                      | Definition
------------|---------------------------|-------------------------------------
Attribute   | Make                      | 
Attribute   | Model                     |
Attribute   | Location                  |
Measurement | Torque (KiloNewton Meter) |
Measurement | Wind Direction            |
Measurement | RotationsPerMinute        |
Measurement | Wind Speed                |
Transform   | Torque (Newton Meter)     | `knm * 1000`
Transform   | RotationsPerSecond        | `rpm / 60`
Transform   | Overdrive State           | `gte(torque,3)`
Metric      | Average Wind Speed        | `avg(windspeed)`
Metric      | Overdrive State Time      | `statetime(overdrive_state)`
Metric      | Avg Power                 | `avg(torque) * avg(rps) * 2 * 3.14`

To deploy the `AssetModelStack` try:
```shell script
cdk deploy AssetModelStack
```

## WindFarmStack
The `WindFarmStack` leverages the asset models defined in the `AssetModelStack` to deploy a single wind farm asset as 
well as the desired number of turbine assets associated with it hierarchically. To deploy a `WindFarmStack`, you must 
pass the following parameters:

Parameter                                  | Description                                                   | Appropriate Value
-------------------------------------------|----------------------------------------------------------------|----------------------------------------------------------
WindFarmAssetModelIdParameter              | ID for the wind farm asset model.                             | AssetModelStack.Outputs.WindFarmAssetModelId
TurbineAssetModelIdParameter               | ID for the turbine asset model.                               | AssetModelStack.Outputs.TurbineAssetModelId
WindFarmTurbineHierarchyLogicalIdParameter | Logical ID for the hierarchy between wind farms and turbines. | AssetModelStack.Outputs.WindFarmTurbineHierarchyLogicalId

Additionally, the following context must be provided when calling `cdk deploy` for a `WindFarmStack`:

Context     | Description                                                   | Appropriate Value
------------|---------------------------------------------------------------|-------------------------------------------------------------------
numTurbines | Number of turbine assets to instantiate within the wind farm. | Not more than 100, per SiteWise service quotas. 25 is reasonable.

To deploy a `WindFarmStack` try:
```shell script
cdk deploy WindFarmStack0 \
--parameters WindFarmAssetModelIdParameter="..." \
--parameters TurbineAssetModelIdParameter="..." \
--parameters WindFarmTurbineHierarchyLogicalIdParameter="" \
--context numTurbines=25
```

The `WindFarmStack` also ensures that all turbines enable notifications for all three transforms and both metrics. The 
transforms will publish data to AWS IoT Core every minute and the metrics will publish data to AWS IoT Core every five 
minutes, per the window length defined on each metric in the associated asset model. For all transforms and metrics, 
the stack also defines reasonable property aliases, which can be useful when understanding data.

## DataLakeStack
The `DataLakeStack` deploys a data ingestion pipeline as well as data storage resources in Amazon S3 and Amazon 
Timestream. The stack also deploys a CloudFormation custom resource to generate a mapping between assetId, propertyID, 
and property aliases. The mapping is stored in an Amazon S3 bucket. Because AWS IoT SiteWise does not send property 
aliases with data points published to AWS IoT Core, a Lambda function in the ingestion pipeline is responsible for 
acquiring the mapping from Amazon S3 and rehydrating property aliases onto each data point. The Lambda function then 
pushes data, including property aliases, to the data lake.

All transforms are written to an Amazon S3 bucket via a Kinesis Firehose delivery stream and all metrics are written 
directly to Amazon Timestream. Though any configuration of writes is possible, this provides an interesting set of
qualities to the demonstration, especially when evaluating operational metrics or querying data (more on this, below).


Parameter           | Description                                                                      | Appropriate Value
--------------------|----------------------------------------------------------------------------------|------------------------------
TurbineAssetModelID | Provide an ID for a Turbine asset model.                                         | AssetModelStack.Outputs.TurbineAssetModelId
DataLakeIngestStreamShardCount | Provide an ID for a Turbine asset model.'                             | Default: 1
BufferingIntervalSeconds | Provide a buffering interval in seconds for delivery to S3.'                | Default: 60
BufferingIntervalMB | Provide a buffering interval in MB for delivery to S3.'                          | Default: 1
MemoryStoreRetentionPeriodInHours | Numbner of hours to store data in memory in Timestream.'           | Default: 24
MagneticStoreRetentionPeriodInDays | Number of days to store data on magnetic volumes in Timestream..' | Default: 7

To deploy a `DataLakeStack` try:
```shell script
cdk deploy DataLakeStack \
--parameters TurbineAssetModelID="..." \
--parameters DataLakeIngestStreamShardCount="1" \
--parameters BufferingIntervalSeconds="60" \
--parameters BufferingIntervalMB="1" \
--parameters MemoryStoreRetentionPeriodInHours="24" \
--parameters MagneticStoreRetentionPeriodInDays="7"
```
# Utiliities 
This project contains several utilities which may be useful in running the demonstration. They are located in the 
`misc` directory, and are as follows:

1. `asset-map-builder`: Similar code to the Lambda function in the `DataLakeStack` providing the custom resource to 
generate a map of assetIds and propertyIds to property aliases. If you add additional wind farms after deploying the 
`DataLakeStack`, this utility may be useful to you to rebuild the map. Simply provide an `ASSET_MODEL_ID` environment 
variable the value of which corresponds to the turbine asset model when running this utility. The utility will make 
sequential calls to AWS to identify all assets instantiated off of that asset model, as well as their properties.
2. `cleanup`: If Cloudformation fails to detroy all deployed assets in AWS IoT SiteWise when destroying the stacks, you 
can use this utility to clean them up. When cleaning a demo of thousands of assets, this utility can be a real time 
saver over using the AWS Management Console. Simply provide an `ASSET_MODEL_ID` environment variable the value of which 
corresponds to the turbine asset model when running this utility. The utility will make sequential calls to AWS to 
identify and delete all assets instantiated off of that asset model
3. `data-generator`: Use this utility to drive a load through SiteWise with semi-random data. Simply provide an 
`ASSET_MODEL_ID` environment variable the value of which corresponds to the turbine asset model when running this 
utility. The utility will make sequential calls to AWS to identify all assets instantiated off of that asset model and 
then generate semi-random data for each measurement of those assets at regular intervals.

## Data Generator
The `data-generator` utility can be used to drive data to all turbine assets currently instantiated in the demo. For 
each measurement in each asset, the utility starts by generating a random number within a pre-defined range. At each 
subsequent interval, it will then add or subtract a random increment within specified bounds, ensuring that the value 
stays within the pre-defined range. The data generator can do this for all four measurements of each turbine asset. For 
example:

Parameter Name | Value
---------------|--------
min            | 10
max            | 20
minIncrement   | 1
maxIncrement   | 2

Time | Value
-----|------
0    | 13
1    | 12
2    | 10
3    | 12
4    | 10
5    | 11
6    | 13
7    | 14
8    | 12
9    | 11

Reasonable parameters are established in the utility for torque, wind speed, rotations, and wind direction, based on 
the data sets provided in the demo available in the AWS Management Console for AWS IoT SiteWise.

## WindFarm Stack Manager
The `windfarm-stack-manager` allows you to configure the number of WindFarmStacks you can deploy. This application 
keeps a file in a `.state` directory containing the currently configured number of WindFarm stacks available. Before 
using this CDK application, you should sync this state with Cloudformation:

```shell script
cd misc/windfarm-stack-manager && node dist/index.js init
``` 

You can add additional WindFarmStacks available for deployment:

```shell script
# Add five additional WindFarmStacks
node dist/index.js add 5 
```

You can also remove WindFarmStacks, so long as this does not result in fewer WindFarmStacks available for deployment 
than are actually deployed the Cloudformation:

```shell script
# Remove five WindFarmStacks
node dist/index.js remove 5 
```
