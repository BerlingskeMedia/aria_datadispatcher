# aria_datadispatcher

Receives events from AMPS Workflow and relay them to:

1. Data Platform
2. Permissions Processor (SQS queue)


![overview](https://github.com/BerlingskeMedia/bpp_api/raw/master/docs/user_handling_overview.png)


## API

This service has only one endpoint:

### [POST /notifications_events]


The payload must be a JSON object containing two keys:

* `msgAuthDetails`
* any other key

This means that if the payload has a total of three or more keys, it will be concidered invalid.

The key `msgAuthDetails` is required. Signature version 2 is supported.

See section **Authentication** below.

If an error occurs while delivering to any of the two Kafka or SQS, the API will return an error.


## Event data


Aria Datadispatcher conciders the content of the key **other than** `msgAuthDetails` to be the message.

I.e. in case:

```
{
  "msgAuthDetails": {
    "signatureVersion": 2,
    "signatureValue": "CALCULATED_VALUE",
    "ariaAccountID": "",
    "ariaAccountNo": 12345,
  },
  "enrichedEventData": {
    "eventPayload": {
      "account": {
        "userid": "abcd_user"
      }
    },
    "eventIdent": {
      "event_guid": "0ea71fba-7bf3-44ef-9ad2-6881b41e9092",
      "event_timestamp": "2019-11-19T11:38:52"
    }
  }
}
```

The *content* of `enrichedEventData` is concidered the message.

The unique event ID is tried from the message in this order:

1. `request.transaction_id` (backwards compatibility before enriched events)
2. `eventPayload.request.transaction_id`
3. `eventIdent.event_guid`



### Kafka message delivery

Kafka will get the message delivered raw - unparsed and unprocessed.

Unique event ID is used for deduplication of events in Kafka.
Otherwise _null_ will be used.

#### Kafka locally
https://kafka.js.org/docs/running-kafka-in-development

### SQS message delivery

SQS will get the message delivered raw - unparsed and unprocessed, **unless**:

* If key `eventPayload` exists, that content will get delivered.
  * If key `JSONGetAcctPlansAllMResponse` also exists, it will be added as `all_acct_plans_m` (array) to the data above, but in a slimmed down version.
  

Unique event ID is used for deduplication of events.
Otherwise _Date.now()_ will be used.


## Authentication

The Data Dispatcher will use standard Aria Authentication to validate the incoming message event notifications. This section is a copy of the documentation given by the AMPS team.

### Requirements

The requirement is to employ additional security measures for authenticating API calls coming into AMPS and also adding authentication details into calls that AMPS is going to make to external systems. 

The external systems will have to use the process as described in this document to validate the requests on their side and also prepare the message authentication structure used by AMPS for all AMPS API calls. If the calls made to AMPS APIs do not have the message authentication details as described below, the calls will return with an authentication error.

AMPS will be using the same process to validate the incoming calls.

### Process

All AMPS API calls expect a Message Authentication JSON structure in the below format

```
"msgAuthDetails": {
 "clientNo": 10,
 "requestDateTime": "2019-05-27T00:00:00Z",
 "signatureValue": "asdjkfq35ascas5q4wq09fq34racndsca=",
 "signatureVersion": 0,
 "ariaAccountID": "acctID1",
 "ariaAccountNo": 0,
 "userID": "userid1"
}
```

The **signatureValue** that will be passed in the above structure, will be created using the process below:


Create a string by concatenating (use | delimiter) different parameters from the above structure in below format ensuring they are in the same order as described below:

```
clientNo|requestDateTime|accountID|accountNo|userID|authKey
```

Example:

```
40|2019-03-26T08:24:00Z|xyz|0|abc|ASDvwHnQtaD6KyVuMGgVFGE8tukXaTkE
```

**clientNo** will be set to a different value for each 3rd party client connecting to AMPS. The clientNo will be agreed with the 3rd party system and configured in AMPS accordingly.
requestDateTime should be in GMT time zone and should have the above format in example structure above. Please note that AMPS will not authenticate a request which is more than 15 minutes old. So, current timestamp should be used when submitting the API calls.


**signatureVersion** will be agreed with the 3rd party system. The current version value is 1

**authKey** to be used will be provided separately to each 3rd party system securely. This is the private key used by each 3rd party system to communicate to AMPS.

The complete string created in above format is to be encoded using UTF-16LE, then hashed using SHA-256 and result to be converted to BASE64. 

Resulting value should be passed in the JSON as **signatureValue** to authenticate along with the variables that have been used to generate it. 
Please note that there is no need to provide authKey in the JSON and all other values used in the string are optional and in case of BLANK/NULL values, placeholder in the string shall simply be empty and will look something like ||.


## ENV VARS

* ARIA_CLIENT_NO
* ARIA_AUTH_KEY
* KAFKA_HOST
* KAFKA_INGRESS_TOPIC
* AWS_REGION (Default `eu-west-1`)
* AWS_ACCESS_KEY_ID
* AWS_SECRET_ACCESS_KEY
* SQS_QUEUE_URL
* SQS_MESSAGE_GROUP_ID (Default `aria`)
* DISABLE_VALIDATION (Only disabled when `true`. Otherwise enabled.)


## Development

* Install Node.js and NPM. See [Dockerfile](/blob/master/Dockerfile) for version.
* Clone GitHub repo.
* `npm i`
* Set ENV VARS in the environment.
* Start the process using `npm run dev`.

Or simply run `npm test` to run automated tests.


## Documentation

* [kafka-node](https://github.com/SOHU-Co/kafka-node)
* [AWS.SQS](https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/SQS.html)

## Kafka

https://docs.aws.amazon.com/msk/latest/developerguide/create-topic.html

## SQS

https://sqs.eu-west-1.amazonaws.com/815296035528/aria_datadispatcher.fifo




## Build

**GitHub**

1. Push your feature branch to GitHub
2. Merge with master branch
3. Publish a release with an incrementet version number

**Docker Automated**

This application is build using [Docker Cloud](https://cloud.docker.com/u/berlingskemedia/repository/docker/berlingskemedia/aria_datadispatcher).

To start a build make a new release on [GitHub](https://github.com/BerlingskeMedia/aria_datadispatcher/releases).
Make sure the versionnumber is in the format `x.x.x`. This will trigger a new build with tag `release-{sourceref}` and `latest`.

## Deployment

**Task Definition**

Go to correponding ECS Task Definition:

* [Task Definition: AriaDatadispatcher](https://eu-west-1.console.aws.amazon.com/ecs/home?region=eu-west-1#/taskDefinitions/AriaDatadispatcher)
* [Task Definition: AriaDatadispatcher-TEST](https://eu-west-1.console.aws.amazon.com/ecs/home?region=eu-west-1#/taskDefinitions/AriaDatadispatcher-TEST)

Create a new revision of the Task Definition, where the only thing to change is in the _Containter Definitions_.
Change the _Image_ to the latest release tag eg. `berlingskemedia/aria_datadispatcher:release-4`.


**Service**

Go to the correponding ECS Cluster:

* [Cluster: AriaDatadispatcher](https://eu-west-1.console.aws.amazon.com/ecs/home?region=eu-west-1#/clusters/AriaDatadispatcher)
* [Cluster: AriaDatadispatcher-TEST](https://eu-west-1.console.aws.amazon.com/ecs/home?region=eu-west-1#/clusters/AriaDatadispatcher-TEST/services)

Open the _Service_ and click the blue button _Update_. Selest the latest revision - the one that was created in the previous step. Click Next->Next->Next.

The old task aka. container is now being shut down and a new is being started up.


