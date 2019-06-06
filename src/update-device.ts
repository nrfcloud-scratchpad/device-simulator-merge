import * as program from 'commander';
import * as colors from 'colors';
import * as dotenv from 'dotenv';
import * as url from 'url';
import { S3, IotData, Iot } from 'aws-sdk';
import * as uuid from 'uuid';

dotenv.config();

const s3 = new S3();
const iot = new Iot();

const main = async ({
  id,
  nextAppFwVersion,
  s3Bucket: bucket,
  endpoint,
  firmware,
}: program.Command) => {
  if (!firmware) {
    throw new Error('Must provide firmware file');
  }
  if (!nextAppFwVersion) {
    throw new Error('Must provide next app firmware version!');
  }
  if (nextAppFwVersion.lenght > 128) {
    throw new Error('version string length must not be greater than 128!');
  }
  console.log({
    id,
    bucket,
    firmware,
    nextAppFwVersion,
  });

  console.log(
    colors.cyan(
      `checking if firmware exists ${colors.yellow(
        `s3://${bucket}/${firmware}`,
      )}...`,
    ),
  );
  const { ContentLength } = await s3
    .headObject({
      Bucket: bucket,
      Key: firmware,
    })
    .promise();
  console.log(
    colors.green(`Exists: ${colors.yellow(`${ContentLength} bytes`)}.`),
  );

  const iotData = new IotData({ endpoint });
  console.log(
    colors.cyan(
      `checking if app firmware version ${colors.yellow(
        nextAppFwVersion,
      )} can be applied to device ${colors.yellow(id)}...`,
    ),
  );
  const { payload } = await iotData.getThingShadow({ thingName: id }).promise();
  const reportedAppFwVersion = JSON.parse(payload!.toString()).state.reported
    .nrfcloud__dfu_v1__app_v;
  if (reportedAppFwVersion === undefined) {
    throw new Error(
      `device ${colors.yellow(
        id,
      )} has unknown app firmware version. Make sure it reports it in ${colors.magenta(
        'nrfcloud__dfu_v1__app_v',
      )}`,
    );
  }
  console.log(
    colors.cyan(
      `device app firmware version: ${colors.yellow(reportedAppFwVersion)}`,
    ),
  );

  const jobId = uuid.v4();
  console.log(colors.cyan(`creating job ${colors.yellow(jobId)} ...`));

  const { protocol, host, path } = url.parse(
    await s3.getSignedUrl('getObject', {
      Bucket: bucket,
      Key: firmware,
      Expires: 60 * 60 * 24 * 30,
    }),
  );

  await iot
    .createJob({
      jobId,
      targets: [
        `arn:aws:iot:${process.env.AWS_REGION}:${
          process.env.AWS_ACCOUNT
        }:thing/${id}`,
      ],
      document: JSON.stringify({
        operation: 'app_fw_update',
        fwversion: nextAppFwVersion,
        size: ContentLength,
        location: { protocol, host, path },
      }),
      description: `Update ${id} to app version ${nextAppFwVersion}`,
      targetSelection: 'SNAPSHOT',
    })
    .promise();
  console.log(
    colors.yellow(
      `You can cancel this job with ${colors.magenta(
        `aws iot cancel-job --job-id ${jobId}`,
      )}`,
    ),
  );
};

program
  .option('-d, --id <id>', 'id of the device', process.env.DEVICE_ID)
  .option('-b, --s3-bucket <bucket>', 'S3 bucket', process.env.S3_BUCKET)
  .option('-f, --firmware <firmware>', 'name of the firmware file')
  .option(
    '-e, --endpoint <endpoint>',
    'AWS IoT MQTT endpoint',
    process.env.MQTT_ENDPOINT,
  )
  .option(
    '-a, --next-app-fw-version <nextAppFwVersion>',
    'Next version of the app firmware',
  )
  .parse(process.argv);

main(program).catch(error => {
  process.stderr.write(`${colors.red(error)}\n`);
});
