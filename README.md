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

# install jq
https://stedolan.github.io/jq/download/
```

### Commands
```sh
# If you follow the steps below you will not need to 
# use any of these params because they are all set 
# via environment variables.
node dist/device.js \
  -d <device id> \
  -e <mqtt endpoint> \
  -a <initial fw version> \
  -cr <certs response from API> \
  -c <location of device cert> \
  -k <location of device key> \
```

### Connect a device and subscribe to the job updates MQTT topic

1. Login to [nrfcloud dev site](https://dev.nrfcloud.com) and go to the accounts page and grab your API key
1. Install [AWS CLI](https://docs.aws.amazon.com/cli/latest/userguide/cli-chap-install.html)
1. If running this on your own AWS account, ensure that Event-based Messages for jobs are enabled in [AWS IoT Settings](https://us-east-1.console.aws.amazon.com/iot/home?region=us-east-1#/settings).
1. Setup your environment:

```sh
# setup environment variables
export API_KEY=<your_api_key>
export API_HOST=<your_api_host, e.g., https://api.dev.nrfcloud.com>
export AWS_REGION=us-east-1 #if your region is different, change it here
export DEVICE_RAND=$(node -e 'process.stdout.write(Math.floor(1000000000 + Math.random() * 9000000000).toString())')
export DEVICE_ID=nrf-$DEVICE_RAND
export DEVICE_PIN=123456

# create device certificates
export CERTS_RESPONSE=$(curl -X POST $API_HOST/v1/devices/$DEVICE_ID/certificates -d "$DEVICE_PIN" -H "Authorization: Bearer $API_KEY")

# set the MQTT_ENDPOINT
export MQTT_ENDPOINT=$(aws iot describe-endpoint --endpoint-type iot:Data-ATS | grep endpointAddress | awk '{ print  $2; }' | tr -d '"')
```

5. Run the simulator, which will just-in-time provision (JITP) the device on nRFCloud and subscribe it to the job updates topic (*NOTE*: JITP can take 20-30 seconds, so be patient...):
```sh
node dist/device.js
```
You should see some JSON output, with something like this at the end:
```sh
reported firmware version 1
```
This indicates that the device connected to AWS, was provisioned, and updated its shadow.

### Associate the device with your account (tenant)
1. Open a new terminal window/tab.
2. Set up the environment variables (see above, but use the same `DEVICE_ID` that you had generated).
3. Call the `association` endpoint:
```sh
curl -X PUT $API_HOST/v1/association/$DEVICE_ID -d "$DEVICE_PIN" -H "Authorization: Bearer $API_KEY"
```
In the other tab you should see a new line of JSON output indicating that your device has successfully subscribed to the jobs topic for DFU:
```sh
subscribed to $aws/things/<deviceId>/jobs/notify-next
```
4. View your device:
```sh
curl $API_HOST/v1/devices/$DEVICE_ID -H "Authorization: Bearer $API_KEY" | jq
```

### Create a new DFU job
1. Upload a dummy firmware file as a base64-encoded string.
```sh
curl -X POST $API_HOST/v1/firmwares -H "Authorization: Bearer $API_KEY" -d '{"file": "ewogICAgIm9wZXJhdGlvbiI6ImN1c3RvbUpvYiIsCiAgICAib3RoZXJJbmZvIjoic29tZVZhbHVlIgp9Cg==", "filename": "my-firmware.bin"}'
```

2. Set the `FILENAME` variable by calling the `firmwares` endpoint:
```sh
export FILENAME=$(curl $API_HOST/v1/firmwares -H "Authorization: Bearer $API_KEY" | jq -r '.items[0].filename')
```

3. Enable DFU on the device (if not already enabled)
```sh
curl -X PATCH $API_HOST/v1/devices/$DEVICE_ID/state -d '{ "reported": { "device": { "serviceInfo": ["dfu"] } } }' -H "Authorization: Bearer $API_KEY"
```

4. Create the DFU job
```sh
curl -X POST $API_HOST/v1/dfu-jobs -H "Authorization: Bearer $API_KEY" -d '{ "deviceIdentifiers": ["'$DEVICE_ID'"], "filename": "'$FILENAME'", "version": "1.1" }'
```

5. View your DFU job
```sh
curl $API_HOST/v1/dfu-jobs -H "Authorization: Bearer $API_KEY" | jq
```

6. Verify the job succeeded in the other tab where you ran `node dist/device.js`. You should see something like:
```sh
< $aws/things/nrf-9354733136/jobs/notify-next
<
{
  "timestamp": 1568062501
}
```
If you do not see this it's possible that a previously created job has not succeeded. This will block any newly created jobs from running. You can check this by using the `GET /dfu-jobs` endpoint (as you did above) and then using `DELETE $API_HOST/v1/dfu-jobs/<your-jobId>` for any 
previously created jobs that has a status other than `SUCCEEDED`.

### Clean up (if desired)

```sh
curl -X DELETE $API_HOST/v1/dfu-jobs/<your-jobId> -H "Authorization: Bearer $API_KEY"
curl -X DELETE $API_HOST/v1/firmwares/$FILENAME -H "Authorization: Bearer $API_KEY"
curl -X DELETE $API_HOST/v1/devices/$DEVICE_ID -H "Authorization: Bearer $API_KEY"
```
