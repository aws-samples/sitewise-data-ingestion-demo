#!/bin/bash
# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: MIT-0
cwd=$(pwd)
echo "Installing node modules for main project."
npm install
echo "Installing node modules for asset mapper lambda"
cd lib/lambda/functions/asset-mapper && npm install
echo "Installing node modules for asset map builder utility"
cd $cwd/misc/asset-map-builder && npm install
echo "Installing node modules for cleanup utility"
cd $cwd/misc/cleanup && npm install
echo "Installing node modules for data generator utility"
cd $cwd/misc/data-generator && npm install
