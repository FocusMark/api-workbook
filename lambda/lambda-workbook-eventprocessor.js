let AWSXRay = require('aws-xray-sdk');
let AWS = AWSXRay.captureAWS(require('aws-sdk'));

const Configuration = require('./src/shared/configuration');
const WorkbookRepository = require('./src/shared/workbookRepository');
const ProcessorFactory = require('./src/processor-factory');
const EventNotification = require('./src/shared/event-notification');

console.info("Building dependencies");

/**
 *
 * Lambda handler for executing the Workbook SNS Topic subscriber
 * Event doc: https://docs.aws.amazon.com/apigateway/latest/developerguide/set-up-lambda-proxy-integrations.html#api-gateway-simple-proxy-for-lambda-input-format
 * @param {Object} event - API Gateway Lambda Proxy Input Format
 *
 * Context doc: https://docs.aws.amazon.com/lambda/latest/dg/nodejs-prog-model-context.html 
 * @param {Object} context
 *
 * Return doc: https://docs.aws.amazon.com/apigateway/latest/developerguide/set-up-lambda-proxy-integrations.html
 * @returns {Object} object - API Gateway Lambda Proxy Output Format
 * 
 */
exports.handler = async (event, context) => {
    // Build our notification
    let record = event.Records[0].Sns;
    let notification = new EventNotification(record);
    let processorFactory = new ProcessorFactory(notification);
    
    let configuration = new Configuration();
    configureAWS(configuration);
    let repository = createRepository(configuration);
    
    let processor = processorFactory.createProcessor(repository);
    await processor.run();
    return true;
};

/**
 * 
 * Configures the AWS SDK for use
 * @param {object} - An instance of {@link Configuration} that contains AWS Dynamo DB endpoint configuration.
 * 
 */
function configureAWS(configuration) {
    let awsConfig = { region: configuration.awsRegion };
    let dynamodb_endpointUrl = configuration.data.dynamodb_endpointUrl;
    
    if (dynamodb_endpointUrl) {
        awsConfig.endpoint = dynamodb_endpointUrl;
    }
    
    AWS.config.update(awsConfig);
}

/**
 * 
 * Creates a new instance of a {@link WorkbookRepository} that the event processors can use to query Dynamo DB.
 * @param {object} - An instance of {@link Configuration} that contains AWS Dynamo DB configuration information.
 * @returns Will return a new instance of {@link WorkbookRepository}.
 * 
 */
function createRepository(configuration) {
    let documentClient = new AWS.DynamoDB.DocumentClient();
    return new WorkbookRepository(documentClient, configuration);
}