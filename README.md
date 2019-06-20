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
# if using -cr, -c and -k are not needed.
node dist/device.js \
  -d <device id> \
  -e <mqtt endpoint> \
  -a <initial fw version> \
  -cr <certs response from API> \
  -c <location of device cert> \
  -k <location of device key> \

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
# setup API variables
export API_KEY=<your_api_key>
export API_HOST=<your_api_host, e.g., https://api.dev.nrfcloud.com>

# create a new generic device
curl -X POST $API_HOST/v1/devices -H "Authorization: Bearer $API_KEY"

# find the device id of the new device and export it (remember this for next step)
curl $API_HOST/v1/devices -H "Authorization: Bearer $API_KEY" | jq
export DEVICE_ID=<your_device_id>

# create a device cert and store the JSON response in CERTS_RESPONSE:
export CERTS_RESPONSE=$(curl -X POST $API_HOST/v1/devices/$DEVICE_ID/certificates -H "Authorization: Bearer $API_KEY")

# store the id from the response, which is the ARN for the newly created device certificate:
echo $CERTS_RESPONSE
export CERT_ID=<your_cert_id>

# create and attach an IoT policy to the cert which will allow the device to connect and communicate over all the necessary topics
export POLICY_NAME=$(aws iot create-policy --policy-name dfu_$DEVICE_ID --policy-document file://data/policy.json | jq -r '.policyName')
aws iot attach-policy --policy-name $POLICY_NAME --target $CERT_ID

# either export 'MQTT_ENDPOINT' manually or via the 'aws iot' command (remember for next step)
export MQTT_ENDPOINT=$(aws iot describe-endpoint --endpoint-type iot:Data-ATS | grep endpointAddress | awk '{ print  $2; }' | tr -d '"')
```

4. Run the simulator:
```sh
node dist/device.js
```

### Create a new job using the update-device script
1. Open a new terminal window
1. Install [AWS CLI](https://docs.aws.amazon.com/cli/latest/userguide/cli-chap-install.html)
1. If running this on your own AWS account, ensure that Event-based Messages for jobs are enabled in [AWS IoT Settings](https://us-east-1.console.aws.amazon.com/iot/home?region=us-east-1#/settings).
1. Setup your environment:

```sh
# export device id and mqtt endpoint from previous steps
export DEVICE_ID=<device id>
export MQTT_ENDPOINT=<mqtt endpoint>

# export region
export AWS_REGION=us-east-1

# export aws account id
export AWS_ACCOUNT=$(aws sts get-caller-identity | jq -r '.Account')

# s3 bucket
export S3_BUCKET=<s3 bucket name>
```

5. Run the simulator
```sh
node dist/update-device.js -f <firmware file in s3 bucket>.json -a <new firmware version string>
```

### Create a new job using the Device API
1. Open a new terminal window

```sh
# setup API variables
export API_KEY=<your_api_key>
export API_HOST=<your_api_host, e.g., https://api.dev.nrfcloud.com>
```

2. Upload a dummy firmware file as a base64-encoded string.
```sh
curl -X POST $API_HOST/v1/firmwares -H "Authorization: Bearer $API_KEY" -d '{"file": "ewogICAgIm9wZXJhdGlvbiI6ImN1c3RvbUpvYiIsCiAgICAib3RoZXJJbmZvIjoic29tZVZhbHVlIgp9Cg==", "filename": "my-firmware.hex"}'
```

3. Verify the file was uploaded
```sh
curl $API_HOST/v1/firmwares -H "Authorization: Bearer $API_KEY" | jq
```

4. Export the filename
```sh
export FILENAME=<filename from above, to the right of the "/", e.g., ae8a992c-0588-4dab-bb26-5ba47e45ecc7-my-firmware.hex>
```

5. Create the DFU job
```sh
export DEVICE_ID=<device id from previous steps>
curl -X POST $API_HOST/v1/dfu-jobs -H "Authorization: Bearer $API_KEY" -d '{ "deviceIdentifiers": ["'$DEVICE_ID'"], "filename": "'$FILENAME'", "version": "1.1" }'
```

6. View your DFU job
```sh
curl $API_HOST/v1/dfu-jobs -H "Authorization: Bearer $API_KEY" | jq
```

7. Verify the job succeeded in the other tab where you ran `node dist/device.js`.

### Clean up (if desired)

```sh
curl -X DELETE $API_HOST/v1/dfu-jobs/<jobId from GET /dfu-jobs> -H "Authorization: Bearer $API_KEY"
curl -X DELETE $API_HOST/v1/firmwares/$FILENAME -H "Authorization: Bearer $API_KEY"
curl -X DELETE $API_HOST/v1/devices/$DEVICE_ID -H "Authorization: Bearer $API_KEY"
```
