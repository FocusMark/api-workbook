let AWSXRay = require('aws-xray-sdk');
let AWS = AWSXRay.captureAWS(require('aws-sdk'));

let Workbook = require('./shared/workbook');
let EventNotification = require('./shared/event-notification');

class EventCreateWorkbook {
    /**
     * 
     * Creates an instance of an event processor that can process the creation of Workbook resources.
     * @constructor
     * @param {object} - The repository that will be used to create new records and query for an existing record.
     * @param {object} - An instance of {@link EventNotification} that is created from the SNS notification this processor needs to work against.
     *
     */
    constructor(datastore, notification) {
        console.info('Building processor');
        this.datastore = datastore;
        this.notification = notification;
    }
    
    /**
     * 
     * Runs the processor, executing the logic required to process the Create Workbook event notification.
     * @throws Will throw if the datastore fails to create the new record.
     * 
     */
    async run() {
        console.info('Running processor.');
        let newWorkbook = Workbook.fromNotification(this.notification);
        newWorkbook.validate();
        
        let segment = AWSXRay.getSegment();
        console.info(newWorkbook);
        let querySegment = segment.addNewSubsegment('event-processor.createWorkbookProcessor.run-getWorkbook');
        let results = await this.datastore.getWorkbook(newWorkbook.userId, newWorkbook.workbookId);
        querySegment.close();
        
        if (results.Item) {
            console.log('Record already exists and will be ignored.');
            return;
        }
        
        let createSegment = segment.addNewSubsegment('event-processor.createWorkbookProcessor.run-createWorkbook');
        try {
            await this.datastore.createWorkbook(newWorkbook);
            createSegment.close();
        } catch(err) {
            console.error(err);
            createSegment.close();
            throw `Repository failed to create new Workbook ${newWorkbook.workbookId}.`;
        }
    }
}

module.exports = EventCreateWorkbook;