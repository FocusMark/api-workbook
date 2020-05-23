let AWSXRay = require('aws-xray-sdk');
let AWS = AWSXRay.captureAWS(require('aws-sdk'));

const Configuration = require('./src/shared/configuration');
const WorkbookRepository = require('./src/shared/workbookRepository');
let Response = require('./src/shared/response');
let App = require('./src/http-workbook-get');

// Create the dependencies that the app requires
console.info("Building dependencies");
let config = new Configuration();

/**
 *
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
    try {
        console.info(context);
        console.info("Creating App");
        let configuration = new Configuration();
        let repository = createRepository(configuration);

        let app = new App(repository, configuration, event);
        
        return await app.run();
    } catch (err) {
        console.log(`Lambda aborting. ${err}`);
        return new Response(500, null, 'Unable to process the GET request. Unknown error occured.', null);
    }
};

function createRepository(configuration) {
    let documentClient = new AWS.DynamoDB.DocumentClient({endpoint: configuration.data.dynamodb_endpointUrl});
    return new WorkbookRepository(documentClient, configuration);
}