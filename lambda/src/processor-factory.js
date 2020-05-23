const EventCreateWorkbook = require('./event-create-workbook');

const createWorkbookCommand = 'create-workbook';

class ProcessorFactory {
    constructor(notification) {
        console.info('Building Processor factory');
        if (!notification) {
            throw 'Processor Factory can not be created with a null notification.';
        }
        
        this.notification = notification;
    }
    
    createProcessor(repository) {
        console.info(`Creating processor for the '${this.notification.command}' command.`);
        switch(this.notification.command) {
            case createWorkbookCommand:
                return new EventCreateWorkbook(repository, this.notification);
            default:
                throw `Unsupported command of ${this.notification.command} published with notification.`;
        }
    }
}

module.exports = ProcessorFactory;