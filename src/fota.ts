import { device } from 'aws-iot-device-sdk';
import { green, yellow, magenta, blue } from 'colors';

enum JobExecutionStatus {
  QUEUED = 'QUEUED',
  IN_PROGRESS = 'IN_PROGRESS',
  SUCCEEDED = 'SUCCEEDED',
  FAILED = 'FAILED',
  TIMED_OUT = 'TIMED_OUT',
  REJECTED = 'REJECTED',
  REMOVED = 'REMOVED',
  CANCELED = 'CANCELED',
}

enum JobDocumentOperation {
  app_fw_update = 'app_fw_update',
}

type JobDocument = {
  operation: JobDocumentOperation;
  fwversion: number;
  size: number;
  location: string;
};

type JobExecutionState = {
  status: JobExecutionStatus;
  statusDetails: { nextState: FotaStatus };
  versionNumber: number;
};

type JobExecution = {
  jobId: string;
  status: JobExecutionStatus;
  queuedAt: number;
  lastUpdatedAt: number;
  versionNumber: number;
  executionNumber: number;
  jobDocument: JobDocument;
};

enum FotaStatus {
  downloadFirmware = 'downloadFirmware',
  applyUpdate = 'applyUpdate',
  none = 'none',
}

const topics = (deviceId: string) => ({
  jobs: {
    notifyNext: `$aws/things/${deviceId}/jobs/notify-next`,
    update: (jobId: string) => ({
      _: `$aws/things/${deviceId}/jobs/${jobId}/update`,
      accepted: `$aws/things/${deviceId}/jobs/${jobId}/update/accepted`,
    }),
  },
  shadow: {
    update: {
      _: `$aws/things/${deviceId}/shadow/update`,
    },
  },
});

export const fota = (deviceId: string, connection: device) => {
  const publish = (topic: string, payload: object) =>
    new Promise((resolve, reject) => {
      connection.publish(topic, JSON.stringify(payload), undefined, error => {
        if (error) {
          return reject(error);
        }
        console.log(blue(`> ${topic}`));
        console.log(blue(`>`));
        console.log(blue(JSON.stringify(payload, null, 2)));
        return resolve();
      });
    });

  const subscribe = (topic: string) =>
    new Promise((resolve, reject) => {
      connection.subscribe(topic, undefined, (error, granted) => {
        if (error) {
          return reject(error);
        }
        console.log(
          green(
            `subscribed to ${yellow(
              granted.map(({ topic }) => topic).join(', '),
            )}`,
          ),
        );
        return resolve();
      });
    });

  const listeners = {} as {
    [key: string]: (args: { topic: string; payload: object }) => void;
  };

  const registerListener = (
    topic: string,
    callback: (args: { topic: string; payload: any }) => void,
  ) => {
    listeners[topic] = callback;
  };

  const unregisterListener = (topic: string) => {
    delete listeners[topic];
  };

  connection.on('message', (topic: string, payload: any) => {
    console.log(magenta(`< ${topic}`));
    const p = payload ? JSON.parse(payload.toString()) : {};
    console.log(magenta(`<`));
    console.log(magenta(JSON.stringify(p, null, 2)));
    if (listeners[topic]) {
      listeners[topic]({
        topic,
        payload: p,
      });
    } else {
      throw new Error(`No listener registered for topic ${topic}!`);
    }
  });

  const reportAppFirmwareVersion = async (appFwVersion: number) => {
    // Publish firmware version
    await publish(topics(deviceId).shadow.update._, {
      state: {
        reported: {
          nrfcloud__app_fw_version: appFwVersion,
        },
      },
    });
  };

  const waitForNextUpdateJob = (): Promise<JobExecution> =>
    new Promise(resolve => {
      const jobsNextTopic = topics(deviceId).jobs.notifyNext;
      registerListener(jobsNextTopic, ({ payload }) => {
        if (!payload.execution) {
          return;
        }
        unregisterListener(jobsNextTopic);
        resolve(payload.execution as JobExecution);
      });
      return subscribe(jobsNextTopic);
    });

  const updateJob = async (
    job: JobExecution,
    expectedVersion: number,
    nextState: FotaStatus,
    status: JobExecutionStatus,
  ) => {
    await publish(topics(deviceId).jobs.update(job.jobId)._, {
      status,
      statusDetails: {
        nextState,
      },
      expectedVersion,
      includeJobExecutionState: true,
    });
  };

  const updateJobProgress = async (
    job: JobExecution,
    expectedVersion: number,
    nextState: FotaStatus,
  ) => {
    await updateJob(
      job,
      expectedVersion,
      nextState,
      JobExecutionStatus.IN_PROGRESS,
    );
    console.log(
      green(
        `updated job ${yellow(
          job.jobId,
        )} to in progress. nextState: ${nextState}...`,
      ),
    );
  };

  const main = async (appFwVersion: number) => {
    await reportAppFirmwareVersion(appFwVersion);
    console.log(
      green(`reported firmware version ${yellow(`${appFwVersion}`)}`),
    );
    const job = await waitForNextUpdateJob();
    console.log(job);
    await acceptJob(job);
  };

  const handleJobUpdateAccepted = (job: JobExecution) => async ({
    payload,
  }: {
    payload: {
      timestamp: number;
      executionState: JobExecutionState;
    };
  }) => {
    console.log('handleJobUpdateAccepted', {
      job,
      payload,
    });
    if (payload.executionState.status !== JobExecutionStatus.IN_PROGRESS) {
      return;
    }
    switch (payload.executionState.statusDetails.nextState) {
      case FotaStatus.downloadFirmware:
        console.log(
          magenta(
            `Skipping downloading the firmware from ${yellow(
              job.jobDocument.location,
            )}...`,
          ),
        );
        await updateJobProgress(
          job,
          payload.executionState.versionNumber,
          FotaStatus.applyUpdate,
        );
        break;
      case FotaStatus.applyUpdate:
        console.log(
          magenta(
            `Skipping applying the firmware update to ${yellow(
              `${job.jobDocument.fwversion}`,
            )}...`,
          ),
        );
        await updateJob(
          job,
          payload.executionState.versionNumber,
          FotaStatus.none,
          JobExecutionStatus.SUCCEEDED,
        );
        // handle next job
        await main(job.jobDocument.fwversion);
    }
  };

  const acceptJob = async (job: JobExecution) => {
    const jobUpdateAcceptedTopic = topics(deviceId).jobs.update(job.jobId)
      .accepted;
    await subscribe(jobUpdateAcceptedTopic);
    await registerListener(
      jobUpdateAcceptedTopic,
      handleJobUpdateAccepted(job),
    );
    await updateJobProgress(
      job,
      job.versionNumber,
      FotaStatus.downloadFirmware,
    );
  };

  return {
    subscribe,
    publish,
    registerListener,
    unregisterListener,
    run: async (args: { appFwVersion: number }) => main(args.appFwVersion),
  };
};
