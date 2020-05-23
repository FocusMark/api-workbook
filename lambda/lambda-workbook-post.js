let AWSXRay = require('aws-xray-sdk');
let AWS = AWSXRay.captureAWS(require('aws-sdk'));

let Configuration = require('./src/shared/configuration');
let Response = require('./src/shared/response');
let App = require('./src/http-workbook-post');

// Create the dependencies that the app requires
console.info("Building dependencies");
let config = new Configuration();
let sns = new AWS.SNS();

/**
 * Lambda handler for executing the HTTP POST end point on the Workbook API
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
        let projectRequest = getWorkbookRequestFromBody(event);
        console.info("Creating Workbook App");

        let segment = AWSXRay.getSegment();
        let appSegment = segment.addNewSubsegment('http-post.handler');
        
        let app = new App(sns, config, event, context);
        let appResult = await app.run(projectRequest);
        
        appSegment.close();
        
        return appResult;
    } catch (err) {
        console.log(`Lambda aborting. ${err}`);
        return new Response(500, null, 'Unable to process the create request. Unknown error occured.', null);
    }
};

/**
 *
 * @param {Object} event - API Gateway Lambda Proxy Input Format
 * @returns {Object} request body - The HTTP Request JSON body parsed into an object.
 * 
 */
function getWorkbookRequestFromBody(event) {
    console.info('Creating Workbook request from HTTP request body.');
    if (!event.body) {
        throw 'No body found on request.';
    }
    
    try {
        return JSON.parse(event.body);
    } catch (err) {
        throw `Failed to parse body of JSON: ${event.body}`;
    }
}