# Workbook API
[![BCH compliance](https://bettercodehub.com/edge/badge/scionwest/FocusMark?branch=feature/collectionapi)](https://bettercodehub.com/)
[![codebeat badge](https://codebeat.co/badges/831d9577-0e2b-4c07-b75b-366625f96487)](https://codebeat.co/projects/github-com-scionwest-focusmark-feature-collectionapi)
[![Build Status](https://codebuild.us-east-1.amazonaws.com/badges?uuid=eyJlbmNyeXB0ZWREYXRhIjoiUzkxYTVjanBiSzFMTVBLaXJyR3pERFNjbm13TzJKekZrVFIvbTZQZmZWWXN2WjR3VzVQTDlnbjNMNkl6SUl0Nmd6bTBuamJNU3A4UlpUVXRaN2Z3UmZVPSIsIml2UGFyYW1ldGVyU3BlYyI6IlVGaTUyMHhCYjlqdys2N1kiLCJtYXRlcmlhbFNldFNlcmlhbCI6MX0%3D&branch=feature%2Fcollectionapi)](https://aws.amazon.com)

The Workbook API provides end-points for interacting with the Workbook resources via REST services. The Workbook resource allows for creating a collection to hold children resource types.

## Deployment

The Workbook API is composed of several Lambdas, one per HTTP method supported by the service. The deployment is handled using the [AWS Serverless Application Model (SAM)](https://aws.amazon.com/serverless/sam/). You can deploy the entire Workbook service from the `api-workbook` directory using the following set of CLI commands.

```
$ sam validate
$ sam deploy
```

Running the `sam build` command requires you to build each Lambda individually. This is caused by the template.yaml not using a shared project.json for all Lambdas. This is something that I might look at in the future but at the moment each Lambda is packaged as it's own NodeJS project. This is to ensure that changes to 1 Lambda doesn't break another. You can run the `sam build` command from the root directory of this repository.

```
$ sam build WorkbookPostLambda --template backend/api-workbook/template.yaml --manifest backend/api-workbook/http-post/package.json --build-dir backend/api-workbook/dist
$ sam build WorkbookSubscriberLambda --template backend/api-workbook/template.yaml --manifest backend/api-workbook/event-processor/package.json --build-dir backend/api-workbook/dist
```

Once the deployment is completed you will have access to the resources in Amazon. The API Gateway URL for the resource will be provided in the output.

## Running Locally
Running the API suite locally requires Docker, SAM CLI, Amazon's DynamoDB-Local Docker Image and several environment variables to be set.

> **Note**: Development is done on Linux. Local deployment can be done with Windows but the steps will need to be modified to be Windows specific; something not done yet. Mac development should be able to use most of these instructions unchanged.

To get started, you will need to export the following environment variables on your local machine:

```
$ export dynamodb_workbookTable=focusmark-local-dynamodb-workbook
$ export deployed_environment=local
```

After you have exported those variables you will need to install all of the NPM dependencies for the Lambda functions. You can do this from the root directory of this repository with the following commands.

```
$ npm install backend/api-workbook/http-post/ --prefix backend/api-workbook/http-post/
$ npm install backend/api-workbook/http-get/ --prefix backend/api-workbook/http-get/
$ npm install backend/api-workbook/event-processor/ --prefix backend/api-workbook/event-processor/
$ npm install backend/api-workbook/local-seeder/ --prefix backend/api-workbook/local-seeder/
```

Next, you will need to configure the local DynamoDB Table. We do this by first creating a new Docker network. This new network will allow both the `amazon/dynamodb-local` Docker Container and the SAM CLI Lambda Container to run on the same network together. When running on the same Docker network the Lambda's ran via SAM CLI will be able to access and interact with the DynamoDb Tables within the `amazon/dynamodb-local` Container.

```
$ docker network create local-dynamodb-network
```

Now that the Docker network is created, let's pull the `amazon/dynamodb-local` Image and run the Container. When we run the Container we will explicitly give it a name of `dynamodb` and we will put it on the new `local-dynamodb-network`.

```
$ docker run --network local-dynamodb-network --name dynamodb -d -p 8000:8000 amazon/dynamodb-local
```

You can ensure the Container is running by running `docker ps` which should show a named Container of *dynamodb*

```
CONTAINER ID        IMAGE                   COMMAND                  CREATED             STATUS              PORTS                    NAMES
ed126ed1bc31        amazon/dynamodb-local   "java -jar DynamoDBL…"   57 seconds ago      Up 56 seconds       0.0.0.0:8000->8000/tcp   dynamodb
```

You can run the following command to make sure that the Container is running on the new network we created.

```
$ docker inspect dynamodb -f "{{json .NetworkSettings.Networks }}"
```

This should output the json that will show the `local-dynamodb-network` configuration.

```
{
  "local-dynamodb-network": {
    "IPAMConfig": null,
    "Links": null,
    "Aliases": [ "ed126ed1bc31" ],
    "NetworkID": "5ea8f135d472f8408f74930546c43fcbbafa9f5",
    "EndpointID": "c74bef52b2789b563779d507367e825287d51c",
    "Gateway": "172.19.0.1",
    "IPAddress": "172.19.0.2",
    "IPPrefixLen": 16,
    "IPv6Gateway": "",
    "GlobalIPv6Address": "",
    "GlobalIPv6PrefixLen": 0,
    "MacAddress": "",
    "DriverOpts": null
  }
}
```

Moving forward you just need to run `docker start dynamodb` after reboots of your system or after stopping the Container via `docker stop dynamodb` as the Container will already be configured.

Finally, you need to create the table locally and seed it with some data. A Lambda Function exists that will handle this for you. You will just need to invoke it via the SAM CLI. This will generate a random number of Workbooks between 1 and 25 per user, for 5 users.

```
$ sam local invoke WorkbookLocalSeederLambda --docker-network local-dynamodb-network
```

With the local DynamoDb Container now running and your environment variables and DynamoDb table data set you can now run the local FocusMark API via the SAM CLI. Navigate to the `api-workbook` directory where the `template.yaml` file exists and run the following command:

```
$ sam local start-api --docker-network local-dynamodb-network
```

We now have the API running. Before you can make an HTTP request though you will have to find a `workbookId` to use for a HTTP GET request. The `WorkbookLocalSeederLambda` will always create Workbooks with a `userId` of _test-user_. You can get a list of the Workbooks created for _test-user_ by using the AWS CLI and querying the local DynamoDb instance.

```
$ aws dynamodb scan --table-name focusmark-local-dynamodb-workbook  --attributes-to-get workbookId  --endpoint-url http://localhost:8000  --scan-filter '{ "userId":{"AttributeValueList":[ {"S":"foobar"} ],"ComparisonOperator": "EQ"}}' --max-items 3
```

This should output the following data for you, where you can pull the `workbookId` out from the result and make an HTTP request to get that record.

```
{
    "Count": 23, 
    "Items": [
        {
            "workbookId": {
                "S": "10637dbf-3beb-4577-9a3f-21cba8848b7b"
            }
        }, 
        {
            "workbookId": {
                "S": "1b9f14e3-00b2-4b82-8825-08270585a9af"
            }
        }, 
        {
            "workbookId": {
                "S": "32151781-9ddb-43ae-94ff-c3c9f8d440ff"
            }
        }
    ], 
    "NextToken": "eyJFeGNsdXNpdmVTdGFydEtleSI6IG51bGwsICJib3RvX3RydW5jYXRlX2Ftb3VudCI6IDN9", 
    "ScannedCount": 127, 
    "ConsumedCapacity": null
}
```


You can now make the CURL request below by passing the `workbookId` to the `/workbook` endpoint.

```
$ curl --url http://127.0.0.1:3000/workbook/10637dbf-3beb-4577-9a3f-21cba8848b7b -i --request GET -H 'Content-Type:application/json'
```

You should see a JSON response like the following, containing the fake data seeded earlier when we ran the `WorkbookLocalSeederLambda`.

```
{
  "data": {
    "path": "/j3guu4fec8g2wa0cnaf5pn",
    "title": "1xpj38iffk478hjb28dew6",
    "userId": "test-user",
    "workbookId": "10637dbf-3beb-4577-9a3f-21cba8848b7b"
  },
  "errors": {},
  "isSuccessful": true
}
```

If you want all Workbooks for the _test-user_ you can make a GET request to `/workbook`. The `http-get` Lambda has the _test-user_ as a hard-coded value for all HTTP GET requests at the moment, until authorization is setup.

```
$ curl --url http://127.0.0.1:3000/workbook -i --request GET -H 'Content-Type:application/json'
```

You can also create new Workbooks using the HTTP POST request and passing in the json body representing a new Workbook. 

```
$ curl --url http://127.0.0.1:3000/workbook -i --data '{"title":"My Workbook", "path":"/Home"}' --request POST -H 'Content-Type:application/json;domain-model=create-workbook'
```

You might have noticed that the `Content-Type` Header contained a `domain-model` parameter alongside the `application/json` value. The W3 standard [for Content-Type](https://www.w3.org/Protocols/rfc1341/4_Content-Type.html) defines a parameter as:

> Parameters are modifiers of the content-subtype, and do not fundamentally affect the requirements of the host system. Although most parameters make sense only with certain content-types, others are "global" in the sense that they might apply to any subtype. For example, the "boundary" parameter makes sense only for the "multipart" content-type, but the "charset" parameter might make sense with several content-types.

FocusMark is designed using the [Command and Query Responsibility Segregation (CQRS)](https://microservices.io/patterns/data/cqrs.html) pattern. A HTTP POST, PUT and DELETE are considered commands and must have a command assigned to the endpoint that can process the request. In this instance, a POST to the `/workbook` endpoint requires the `create-workbook` command. Commands are supplied to the endpoint using the `domain-model` parameter. If you do not pass in a supported command then the endpoint will return 404. Queries, which are any HTTP GET requests made to an endpoint, do not require a command parameter to be provided.

As a side-effect of adopting the CQRS pattern, the above HTTP POST CURL will not actually insert a record into the local DynamoDB database. Instead, it will publish a notification to an SNS Topic. SNS will deliver that notification, containing the Workbook payload, to the `event-processor` Lambda which will proces the notification and insert it into the DynamoDB Table. This workflow can not be simulated locally as there isn't a SNS service that can run locally. All POST, PUT and DELETE requests made locally will attempt to publish to SNS. More information on how to handle that is below in the _Invoking Lambdas_ section.

Event Processor Lambdas are Functions that process CQRS commands, such as `create-workbook`. All commands will have to go through the processor. You can follow the instructions below to invoke the processor and insert data into the local DynamoDB table.

> **Note:** When making an HTTP POST or PUT to the /workbook endpoint, the data is transformed and published to SNS as a Topic Message. The JSON body you send, along with the SNS Topic Message do not represent what is ultimately stored in DynamoDB. The event-processor Lambda will perform a final transformation and create the DynamoDB record based on metadata included in the Notification.

## Invoking Lambdas

You have already seen how to invoke Lambdas by running the `WorkbookLocalSeederLambda` function above. You can optionally invoke all of the Lambdas without starting the local API. The following tables shows each of the Lambdas and a json payload you can pass to represent a fake event triggering the Lambda.

| function | event data path |
|----------|-----------------|
| WorkbookPostLambda | "http-post/events/event.json" |
| WorkbookSubscriberLambda | "event-processor/events/workbook-created.json" |
| WorkbookLocalSeederLambda | None |

For example, the following SAM command will run the `WorkbookPostLambda` with the event data json payload. This will publish to a SNS Topic defined in your environment variables.

```
$ sam local invoke WorkbookPostLambda -e "http-post/events/event.json" --docker-network local-dynamodb-network
```

To have this Lambda post to the SNS Topic export the following environment variable with the ARN for a test Topic created in AWS.

```
$ export sns_create_workbook_topic=arn:aws:sns:us-east-1:012345678910:test-sns
```

You can either create a separate SNS Topic that is used for local testing or use the ARN of the SNS Topic created when you deploy the stack to AWS via `$ sam deploy`.

A second example shows how you can process a mocked SNS Topic Message delivery by invoking the `WorkbookSubscriberLambda` locally. The Lambda will process a fake message and insert a new record into the local DynamoDB Table.

```
$ sam local invoke WorkbookSubscriberLambda -e "event-processor/events/workbook-created.json" --docker-network local-dynamodb-network
```