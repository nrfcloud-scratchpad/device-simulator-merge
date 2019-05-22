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
  appFwVersion,
  bucket,
  endpoint,
  firmware,
}: program.Command) => {
  const nextAppFwVersion = parseInt(appFwVersion, 10);
  if (!firmware) {
    throw new Error('Must provide firmware file');
  }
  console.log({
    id,
    bucket,
    firmware,
    appFwVersion: nextAppFwVersion,
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
        `${nextAppFwVersion}`,
      )} can be applied to device ${colors.yellow(id)}...`,
    ),
  );
  const { payload } = await iotData.getThingShadow({ thingName: id }).promise();
  const reportedAppFwVersion = parseInt(
    JSON.parse(payload!.toString()).state.reported.nrfcloud__app_fw_version,
    10,
  );
  if (reportedAppFwVersion === undefined) {
    throw new Error(
      `device ${colors.yellow(
        id,
      )} has unknown app firmware version. Make sure it reports it in ${colors.magenta(
        'nrfcloud__app_fw_version',
      )}`,
    );
  }
  console.log(
    colors.cyan(
      `device app firmware version: ${colors.yellow(
        `${reportedAppFwVersion}`,
      )}`,
    ),
  );
  if (!reportedAppFwVersion || reportedAppFwVersion >= nextAppFwVersion) {
    throw new Error(
      `app firmware version ${colors.yellow(
        `${nextAppFwVersion}`,
      )} cannot be applied to device ${colors.yellow(
        id,
      )} because it is not greater than the device app firmware version ${colors.yellow(
        `${reportedAppFwVersion}`,
      )}...`,
    );
  }
  console.log(
    colors.green(
      `Update to ${colors.yellow(`${nextAppFwVersion}`)} can be applied.`,
    ),
  );

  console.log(
    colors.cyan(
      `checking if app firmware update jobs are  ${colors.yellow(
        `${nextAppFwVersion}`,
      )} can be applied to device ${colors.yellow(id)}...`,
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
  .option('-b, --bucket <bucket>', 'S3 bucket', process.env.S3_BUCKET)
  .option('-f, --firmware <firmware>', 'name of the firmware file')
  .option(
    '-e, --endpoint <endpoint>',
    'AWS IoT MQTT endpoint',
    process.env.MQTT_ENDPOINT,
  )
  .option(
    '-a, --app-fw-version <appFwVersion>',
    'Version of the app firmware',
    0,
  )
  .parse(process.argv);

main(program).catch(error => {
  process.stderr.write(`${colors.red(error)}\n`);
});
