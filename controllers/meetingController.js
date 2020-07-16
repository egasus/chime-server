const AWS = require("aws-sdk");
const { v4: uuidv4 } = require("uuid");
const isDev = process.env.NODE_ENV !== "production";

const oneDayFromNow = Math.floor(Date.now() / 1000) + 60 * 60 * 24;

const config = require("../config");
if (isDev) {
  AWS.config.update(config.AWS_KEY_CONFIG);
} else {
  AWS.config.update(config.AWS_KEY_CONFIG);
}

// Store meetings in a DynamoDB table so attendees can join by meeting title
const ddb = new AWS.DynamoDB();
// Create an AWS SDK Chime object. Region 'us-east-1' is currently required.
// Use the MediaRegion property below in CreateMeeting to select the region
// the meeting is hosted in.
const chime = new AWS.Chime({ region: "us-east-1" });
// Set the AWS SDK Chime endpoint. The global endpoint is https://service.chime.aws.amazon.com.
chime.endpoint = new AWS.Endpoint("https://service.chime.aws.amazon.com");

// Read resource names from the environment
const meetingsTableName = config.AWS_DETAILS_CONFIG.MEETINGS_TABLE_NAME;
const attendeesTableName = config.AWS_DETAILS_CONFIG.ATTENDEES_TABLE_NAME;
const logGroupName = config.AWS_DETAILS_CONFIG.BROWSER_LOG_GROUP_NAME;
const sqsQueueArn = config.AWS_DETAILS_CONFIG.SQS_QUEUE_ARN;
const useSqsInsteadOfEventBridge =
  config.AWS_DETAILS_CONFIG.USE_EVENT_BRIDGE === "false";

exports.join = async (req, res) => {
  const query = req.query;
  if (!query.title || !query.name || !query.region) {
    res.status(400).json({
      message: "Need parameters: title, name, region",
    });
  }

  // Look up the meeting by its title. If it does not exist, create the meeting.
  let meeting;
  try {
    meeting = await getMeeting(query.title);
  } catch (error) {
    console.log("error-get-meeting", error);
    // res.status(400).json({
    //   message: "Error while getting meeting info",
    // });
  }
  if (!meeting) {
    const request = {
      // Use a UUID for the client request token to ensure that any request retries
      // do not create multiple meetings.
      ClientRequestToken: uuidv4(),

      // Specify the media region (where the meeting is hosted).
      // In this case, we use the region selected by the user.
      MediaRegion: query.region,

      // Set up SQS notifications if being used
      NotificationsConfiguration: useSqsInsteadOfEventBridge
        ? { SqsQueueArn: sqsQueueArn }
        : {},

      // Any meeting ID you wish to associate with the meeting.
      // For simplicity here, we use the meeting title.
      ExternalMeetingId: query.title.substring(0, 64),
    };
    console.log("Creating new meeting: " + JSON.stringify(request));
    try {
      meeting = await chime.createMeeting(request).promise();
    } catch (error) {
      res.status(400).json({
        message: "Error while creating meeting info",
      });
    }

    // Store the meeting in the table using the meeting title as the key.
    try {
      await putMeeting(query.title, meeting);
    } catch (error) {
      console.log("error ---> put meeting", error);
    }
  }

  // Create new attendee for the meeting
  let attendee = {};
  try {
    attendee = await chime
      .createAttendee({
        // The meeting ID of the created meeting to add the attendee to
        MeetingId: meeting.Meeting.MeetingId,

        // Any user ID you wish to associate with the attendeee.
        // For simplicity here, we use a random UUID for uniqueness
        // combined with the name the user provided, which can later
        // be used to help build the roster.
        ExternalUserId: `${uuidv4().substring(0, 8)}#${query.name}`.substring(
          0,
          64
        ),
      })
      .promise();
  } catch (error) {
    console.log("error-create-attendee", error);
  }

  try {
    putAttendee(query.title, attendee.Attendee.AttendeeId, query.name);
  } catch (error) {
    console.log("error-put-attendee", error);
  }

  // Return the meeting and attendee responses. The client will use these
  // to join the meeting.
  res.json({
    JoinInfo: {
      Title: query.title,
      Meeting: meeting.Meeting,
      Attendee: attendee.Attendee,
    },
  });
};

exports.attendee = async (req, res, next) => {
  const title = req.query.title;
  const attendeeId = req.query.attendee;
  const attendeeInfo = {
    Attendee: {
      AttendeeId: attendeeId,
      Name: await getAttendee(title, attendeeId),
    },
  };
  res.json(attendeeInfo);
};

exports.end = async (req, res) => {
  // Fetch the meeting by title
  let meeting;
  try {
    meeting = await getMeeting(req.query.title);
  } catch (error) {
    console.log("error-end meeting", error);
  }

  // End the meeting. All attendee connections will hang up.
  try {
    await chime
      .deleteMeeting({ MeetingId: meeting.Meeting.MeetingId })
      .promise();
  } catch (error) {
    console.log("error-delete", error);
  }
  res.json({
    message: "Meeting ended",
  });
};

exports.logs = async (req, res) => {
  const body = req.body;
  if (!body.logs || !body.meetingId || !body.attendeeId || !body.appName) {
    res.status(400).json({
      error: "Need properties: logs, meetingId, attendeeId, appName",
    });
  } else if (!body.logs.length) {
    res.json({});
  }

  const logStreamName = `ChimeSDKMeeting_${body.meetingId.toString()}_${body.attendeeId.toString()}`;
  const cloudWatchClient = new AWS.CloudWatchLogs({ apiVersion: "2014-03-28" });
  const putLogEventsInput = {
    logGroupName: logGroupName,
    logStreamName: logStreamName,
  };
  const uploadSequence = await ensureLogStream(cloudWatchClient, logStreamName);
  if (uploadSequence) {
    putLogEventsInput.sequenceToken = uploadSequence;
  }
  const logEvents = [];
  for (let i = 0; i < body.logs.length; i++) {
    const log = body.logs[i];
    const timestamp = new Date(log.timestampMs).toISOString();
    const message = `${timestamp} [${log.sequenceNumber}] [${
      log.logLevel
    }] [meeting: ${body.meetingId.toString()}] [attendee: ${
      body.attendeeId
    }]: ${log.message}`;
    logEvents.push({
      message: message,
      timestamp: log.timestampMs,
    });
  }
  putLogEventsInput.logEvents = logEvents;
  await cloudWatchClient.putLogEvents(putLogEventsInput).promise();
  res.json({});
};

// Called when SQS receives records of meeting events and logs out those records
exports.sqs_handler = async (req, res, next) => {
  console.log("sqs-handling", req.Records);
  return {};
};

// Called when EventBridge receives a meeting event and logs out the event
exports.event_bridge_handler = async (event, context, callback) => {
  console.log("bridge", event);
  return {};
};

// === Helpers ===

// Retrieves the meeting from the table by the meeting title
async function getMeeting(title) {
  const result = await ddb
    .getItem({
      TableName: meetingsTableName,
      Key: {
        Title: {
          S: title,
        },
      },
    })
    .promise();
  return result.Item ? JSON.parse(result.Item.Data.S) : null;
}

// Stores the meeting in the table using the meeting title as the key
async function putMeeting(title, meeting) {
  try {
    const result = await ddb
      .putItem({
        TableName: meetingsTableName,
        Item: {
          Title: { S: title },
          Data: { S: JSON.stringify(meeting) },
          TTL: {
            N: `${Math.floor(Date.now() / 1000) + 60 * 60 * 24}`, // clean up meeting record one day from now
          },
        },
      })
      .promise();
    return result;
  } catch (error) {
    console.log("error---put-meeting", error);
  }
}

const getAttendee = async (title, attendeeId) => {
  const result = await ddb
    .getItem({
      TableName: attendeesTableName,
      Key: {
        AttendeeId: {
          S: `${title}/${attendeeId}`,
        },
      },
    })
    .promise();
  if (!result.Item) {
    return "Unknown";
  }
  return result.Item.Name.S;
};

const putAttendee = async (title, attendeeId, name) => {
  let response;
  try {
    response = await ddb
      .putItem({
        TableName: attendeesTableName,
        Item: {
          AttendeeId: {
            S: `${title}/${attendeeId}`,
          },
          Name: { S: name },
          TTL: {
            N: "" + oneDayFromNow,
          },
        },
      })
      .promise();
  } catch (error) {
    console.log("error-put-attendee-func", error);
  }
};

// Creates log stream if necessary and returns the current sequence token
async function ensureLogStream(cloudWatchClient, logStreamName) {
  const logStreamsResult = await cloudWatchClient
    .describeLogStreams({
      logGroupName: logGroupName,
      logStreamNamePrefix: logStreamName,
    })
    .promise();
  const foundStream = logStreamsResult.logStreams.find(
    (s) => s.logStreamName === logStreamName
  );
  if (foundStream) {
    return foundStream.uploadSequenceToken;
  }
  await cloudWatchClient
    .createLogStream({
      logGroupName: logGroupName,
      logStreamName: logStreamName,
    })
    .promise();
  return null;
}

// function response(statusCode, contentType, body) {
//   return {
//     statusCode: statusCode,
//     headers: { "Content-Type": contentType },
//     body: body,
//     isBase64Encoded: false,
//   };
// }
