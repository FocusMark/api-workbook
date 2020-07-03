let AWSXRay = require('aws-xray-sdk');
let AWS = AWSXRay.captureAWS(require('aws-sdk'));

let Workbook = require('./shared/workbook');
let Response = require('./shared/response');
let AvailableCommands = require('./shared/available-commands');
let JwtUser = require('./shared/jwt-user');

class App {
    
    /**
     *
     * Represents the app logic that the Lambda needs to execute.
     * @constructor
     * @param {object} messageBus - The message bus that acts as a CQRS event stream.
     * @param {object} configuration - An instance of {@link WorkbookConfiguration} containing message bus topic details.
     * @param {object} event - An instance representing the {@link https://docs.aws.amazon.com/apigateway/latest/developerguide/set-up-lambda-proxy-integrations.html#api-gateway-simple-proxy-for-lambda-input-format|AWS API Gateway request event}.
     * @param {object} context - The {@link https://docs.aws.amazon.com/lambda/latest/dg/nodejs-prog-model-context.html|environment context} in which this Lambda is executing under.
     * 
     */
    constructor(messageBus, configuration, event, context) {
        this.httpEvent = event;
        this.configuration = configuration;
        this.messageBus = messageBus;
        this.context = context;
    }
    
    /**
     * 
     * Runs the application logic that the Lambda handler needs to execute. It is not expected for this method to ever throw.
     * @param {object} createWorkbookRequest - The Workbook that needs to be created.
     * @return {object} Returns a {@link Response} instance with the HTTP status code, headers and response body.
     * 
     */
    async run(createWorkbookRequest) {
        let segment = AWSXRay.getSegment();
        let validationSegment = segment.addNewSubsegment('http-post.app.run-validation');
        this.user = new JwtUser(this.httpEvent);
        
        try {
            this.validateCommand(this.httpEvent.headers);
            validationSegment.close();
        } catch (err) {
            console.error(err);
            validationSegment.close();
            return new Response(404, null, 'Valid domain-model parameter required on Content-Type Header.');
        }
        
        let newWorkbook;
        let createWorkbookSegment = segment.addNewSubsegment('http-post.app.run-createWorkbook');
        
        try {
            newWorkbook = this.createWorkbookFromRequest(createWorkbookRequest);
            console.info('Workbook created.');
            this.validateWorkbook(newWorkbook);
            createWorkbookSegment.close();
        } catch (err) {
            console.error(err);
            createWorkbookSegment.close();
            return new Response(422, null, 'Failed to create the request Workbook. Was not able to successfully create and validate the provided data.', null);
        }
        
        let publishSegment = segment.addNewSubsegment('http-post.app.run-publishWorkbook');
        let publishResponse = await this.publishWorkbook(newWorkbook);
        publishSegment.close();
        return publishResponse;
    }
    
    /**
     * 
     * Validates that the HTTP Request headers contains an allowed CQRS domain command parameter on the Content-Type header.
     * @param {object} headers - The headers associated with the current HTTP request.
     * @throws Will throw an error if the Content-Type header does not contain a parameter for {@linkcode domain-model}.
     * @throws Will throw an error if the Content-Type header contains a parameter for {@linkcode domain-model} but does not provide it in a keyValue format with a valid value.
     * @throws Will throw an error if the Content-Type header contains a parameter for {@linkcode domain-model} with a value that is not supported by this endpoint.
     * 
     */
    validateCommand(headers) {
        let domainParameterKeyValue;
        try {
            let domainModelParameter = this.getDomainModelParameter(headers);
             domainParameterKeyValue = domainModelParameter.split('=');
        } catch(err) {
            console.error(err);
            throw 'Unable to find the domain-model parameter on Content-Type header.';
        }

        if (domainParameterKeyValue.length != 2) {
            throw 'Command not specified on the domain-model Content-Type parameter.'
        } 
        
        let command = domainParameterKeyValue[1]; 
        if (command != AvailableCommands.CREATE_WORKBOOK) {
            throw `The ${command} provided is not supported.`;
        }
    }
    
    /**
     *
     * Gets a keyValuePair representing a CQRS domain model command parameter off of the Content-Type header in the format of {@linkcode key=value}
     * @param {object} headers - The headers associated with the current HTTP request.
     * @throws Will throw an error if the header parameter is not truthy.
     * @throws Will throw an error if the Content-Type header does not contain a parameter called {@linkcode domain-model}
     * 
     */
    getDomainModelParameter(headers) {
        console.info('Validating domain parameter in Content-Type header');
        if (!headers) {
            console.error('No heaers were found on the request');
            throw 'Malformed HTTP request made. Required headers are missing.';
        }

        let domainModelParameter = headers['Content-Type']
            .split(';')
            .filter(element => element.includes('domain-command='));
            
        if (domainModelParameter.length == 0) {
            throw 'domain-model parameter is required on Content-Type.';
        }
        
        return domainModelParameter[0];
    }
    
    /**
     * Creates a new instance of a {@link Workbook} from the model provided.
     * @param {object} - Object representing the workbook to be created from the HTTP request.
     * @returns Will return a new instance of a {@link Workbook} type.
     * 
     */
    createWorkbookFromRequest(request) {
        console.info('Creating new Workbook from request');
        return Workbook.fromCreateRequest(request, this.user);
    }

    /**
     * 
     * Validates that the {@link Workbook} model provided meets the business requirements of this endpoint.
     * @param {object} - An instance of a {@link Workbook} class.
     * @throws Will throw if validation fails. The thrown exception will include a list of all validation errors.
     * 
     */
    validateWorkbook(workbook) {
        console.info('Validating new Workbook');
        let validationResult = workbook.validate();
        if (!validationResult.valid) {
            let errors = validationResult.errors.map(error => `${error.property} ${error.message}`).join('. ');
            console.error(`Validation failed for new Workbook - ${errors}`);
            throw errors;
        }
        
        console.info(`Workbook ${workbook.workbookId} is valid.`);
    }
    /**
     * 
     * Gets the message attributes that need to be attached to a published message bus event.
     * @returns Will return an object that matches the specification for @{link https://docs.aws.amazon.com/sns/latest/dg/sns-message-attributes.html|MessageAttributes on AWS SNS.}
     * 
     */
    getPublishedMessageAttributes() {
        return {
            Version: {
                DataType: 'String',
                StringValue: '2020-04-23',
            },
            Source: {
                DataType: 'String',
                StringValue: this.context.invokedFunctionArn,
            },
            DomainCommand: {
                DataType: 'String',
                StringValue: AvailableCommands.CREATE_WORKBOOK,
            },
            RecordOwner: {
                DataType: 'String',
                StringValue: this.user.userId
            }
        };
    }
    
    /**
     * 
     * Publishes a {@link Workbook} to the message bus as a new event.
     * @param {object} - An instance of a {@link Workbook} class.
     * @returns Will return a new instance of a {@link Response} class with the HTTP status code, errors, response body and headers.
     * 
     */
    async publishWorkbook(newWorkbook) {

        let params = {
            Subject: AvailableCommands.CREATE_WORKBOOK,
            Message: JSON.stringify(newWorkbook),
            TopicArn: this.configuration.events.topic,
            MessageAttributes: this.getPublishedMessageAttributes(),
        };
        
        try {
            console.info(`Publishing Workbook to Topic ${params.TopicArn}`);
            var publishResult = await this.messageBus.publish(params).promise();
            return new Response(202, newWorkbook.workbookId, null, `/workbook/${newWorkbook.workbookId}`);
        } catch(err) {
            console.error(err.message);
            return new Response(500, null, 'Failed to create the Workbook', null);
        }
    }
}

module.exports = App;