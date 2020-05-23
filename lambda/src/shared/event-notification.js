class EventNotification {
    /**
     * 
     * Creates a new instance of an SNS Topic Event Notification flattened from the original published SNS record.
     * @constructor
     * @param {object} - SNS Record that was originally published to the Lambda.
     * 
     */
    constructor(snsNotification) {
        console.info('Parsing SNS Event Notification');
        this.type = snsNotification.Type;
        this.messageId = snsNotification.MessageId;
        this.topicArn = snsNotification.TopicArn;
        this.subject = snsNotification.subject;
        this.timestamp = snsNotification.Timestamp;
        
        this.message = this.getNotificationMessage(snsNotification);
        this.version = this.getNotificationVersion(snsNotification);
        this.command = this.getNotificationDomainCommand(snsNotification);
        this.publishSource = this.getNotificationSource(snsNotification);
    }
    
    /**
     * 
     * Validates that the instance is in a validate, trustworthy, state.
     * @throws Will throw if validation errors are found. Errors are provided as the thrown message.
     * 
     */
    validate() {
        console.info('Validating new Workbook');
        let validationResult = this.message.validate();
        if (!validationResult.valid) {
            let errors = validationResult.errors.map(error => `${error.property} ${error.message}`).join('. ');
            console.error(`Validation failed for new Workbook - ${errors}`);
            throw errors;
        }
        
        console.info(`Workbook ${this.message.workbookId} is valid.`);
    }
    
    /**
     * 
     * Gets the published Topic Message from the SNS notification Record.
     * @param {object} - The SNS Record that was originaly published to the SNS Topic and delivered to this Lambda.
     * @returns Will return a parsed {@link WorkbookRecord} instance.
     * @throws Will throw if the SNS Record doesn't contain a Message field.
     * 
     */
    getNotificationMessage(snsNotification) {
        console.info('Searching for notification message');
        if (!snsNotification.Message) {
            throw `SNS Notification ${snsNotification.MessageId} does not contain a Message field.`;
        }
        
        if (typeof snsNotification.Message === 'string') {
            console.info('String message found... Parsing.');
            return JSON.parse(snsNotification.Message);
        } else {
            console.info('object message found');
            return snsNotification.Message;
        }
    }
    
    getNotificationUser(notification) {
        console.info('Searching for notification version');
        let messageAttributes = notification.MessageAttributes;
        if (!messageAttributes) {
            throw `Notification ${notification.MessageId} for Topic ${notification.TopicArn} does not have any MessageAttributes.`;
        }
        
        let userId = messageAttributes.RecordOwner;
        if (!userId || !userId.Value) {
            throw `Notification ${notification.MessageId} for Topic ${notification.TopicArn} does not have a Version MessageAttribute value.`
        }
        
        return userId.Value;
    }
    
    getNotificationVersion(notification) {
        console.info('Searching for notification version');
        let messageAttributes = notification.MessageAttributes;
        if (!messageAttributes) {
            throw `Notification ${notification.MessageId} for Topic ${notification.TopicArn} does not have any MessageAttributes.`;
        }
        
        let version = messageAttributes.Version;
        if (!version || !version.Value) {
            throw `Notification ${notification.MessageId} for Topic ${notification.TopicArn} does not have a Version MessageAttribute value.`
        }
        
        return version.Value;
    }
    
    getNotificationSource(notification) {
        console.info('Searching for notification source');
        let messageAttributes = notification.MessageAttributes;
        if (!messageAttributes) {
            throw `Notification ${notification.MessageId} for Topic ${notification.TopicArn} does not have any MessageAttributes.`;
        }
        
        let source = messageAttributes.Source;
        if (!source || !source.Value) {
            throw `Notification ${notification.MessageId} for Topic ${notification.TopicArn} does not have a Source MessageAttribute value.`
        }
        
        return source.Value;
    }
    
    getNotificationDomainCommand(notification) {
        console.info('Searching for notification Command');
        let messageAttributes = notification.MessageAttributes;
        if (!messageAttributes) {
            throw `Notification ${notification.MessageId} for Topic ${notification.TopicArn} does not have any MessageAttributes.`;
        }
        
        let domainCommand = messageAttributes.DomainCommand;
        if (!domainCommand || !domainCommand.Value) {
            throw `Notification ${notification.MessageId} for Topic ${notification.TopicArn} does not have a DomainCommand attribute value.`
        }
        
        return domainCommand.Value;
    }
}

module.exports = EventNotification;