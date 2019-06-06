## DFU Device Simulator [![npm version](https://img.shields.io/npm/v/@nrfcloud/dfu-device-simulator.svg)](https://www.npmjs.com/package/@nrfcloud/dfu-device-simulator)

[![Build Status](https://codebuild.us-east-1.amazonaws.com/badges?uuid=eyJlbmNyeXB0ZWREYXRhIjoiSUN2dWhRcCs2MnZMQjZ1ay9XcFdUbDVOS1NEQ3Y0dHZlUEZEY1dMK1pZam5hUWhxNmlDVGVaZkIreDJXRGk4emdsY2wxZFp2b3hjOUI2YWJhL04zMGtJPSIsIml2UGFyYW1ldGVyU3BlYyI6Ijl2S0l1bkpLU0NWclU3UWQiLCJtYXRlcmlhbFNldFNlcmlhbCI6MX0%3D&branch=saga)](https://console.aws.amazon.com/codesuite/codebuild/projects/dfu-device-simulator/history?region=us-east-1)  
[![Greenkeeper badge](https://badges.greenkeeper.io/nRFCloud/dfu-device-simulator.svg)](https://greenkeeper.io/)
[![semantic-release](https://img.shields.io/badge/%20%20%F0%9F%93%A6%F0%9F%9A%80-semantic--release-e10079.svg)](https://github.com/semantic-release/semantic-release)
[![Commitizen friendly](https://img.shields.io/badge/commitizen-friendly-brightgreen.svg)](http://commitizen.github.io/cz-cli/)

AWS IoT Thing simulator for nRF91 DFU.

### Getting Started
```sh
# install deps
npm i

# compile to js
npx tsc
```

### Commands
```sh
# create a device and subscribe to jobs topic
node dist/device.js \
  -d <device id> \
  -e <mqtt endpoint> \
  -a <initial fw version> \
  -c <location of device cert> \
  -k <location of device key> \
  -cr <certs response from API>

# create a job for a device
node dist/update-device.js \
  -d <device id> \
  -e <mqtt endpoint> \
  -a <next fw version> \
  -b <s3 bucket> \
  -f <name of the firmware file> 
```

### Create device and subscribe to job updates

1. Login to [nrfcloud dev site](https://dev.nrfcloud.com) and go to the accounts page and grab your API key
1. Install [AWS CLI](https://docs.aws.amazon.com/cli/latest/userguide/cli-chap-install.html)
1. Setup your environment:

```sh
# setup API key
export API_KEY=<your_api_key>

# create a new generic device
curl -X POST https://api.dev.nrfcloud.com/v1/devices -H "Authorization: Bearer $API_KEY"

# find the device id of the new device and export it (remember this for next step)
curl https://api.dev.nrfcloud.com/v1/devices -H "Authorization: Bearer $API_KEY"
export DEVICE_ID=<your_device_id>

# create a device cert and store the JSON response in CERTS_RESPONSE:
export CERTS_RESPONSE=$(curl -X POST https://api.dev.nrfcloud.com/v1/devices/$DEVICE_ID/certificates -H "Authorization: Bearer $API_KEY")

# either export 'MQTT_ENDPOINT' manually or via the 'aws iot' command ()
export MQTT_ENDPOINT=$(aws iot describe-endpoint --endpoint-type iot:Data-ATS | grep endpointAddress | awk '{ print  $2; }' | tr -d '"')
```

4. Run the simulator:
```sh
node dist/device.js
```

5. Clean up your device:
```
curl -X DELETE https://api.dev.nrfcloud.com/v1/devices/$DEVICE_ID -H "Authorization: Bearer $API_KEY"
```

### Create a new job
1. Open a new terminal window
1. Setup your environment:

```sh
# export device id and mqtt endpoint from previous steps
export DEVICE_ID=<device id>
export MQTT_ENDPOINT=<mqtt endpoint>

# export region and aws account
export AWS_REGION=us-east-1

# aws account id can be found in the console
export AWS_ACCOUNT=$(aws sts get-caller-identity | jq -r '.Account')

# s3 bucket
export BUCKET=<s3 bucket name>

# firware name (name of the json file that resides in that s3 bucket). contents just has to be valid json, no format for this testing repo.
export FIRMWARE=<filename.json>

# version of the fw. any string will do.
export NEXT_APP_FW_VERSION=<fw version>
```

3. Run the simulator
```sh
node dist/update-device.js 
```