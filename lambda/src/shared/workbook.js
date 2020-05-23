const { v4: uuidv4 } = require('uuid');
const Validator = require('jsonschema').Validator;
const Priority = require('./priority');

class Workbook {
    
    static fromCreateRequest(request, user) {
        let newWorkbook = new Workbook();
        newWorkbook.setupDefaults();

        newWorkbook.title = request.title;
        newWorkbook.path = request.path;
        
        newWorkbook.userId = user.userId;
        newWorkbook.owner = user.username;

        return newWorkbook;
    }
    
    static fromNotification(notification) {
        let newWorkbook = new Workbook();
        newWorkbook.setupDefaults();
        newWorkbook.userId = notification.message.userId;
        newWorkbook.owner = notification.message.owner;
        newWorkbook.title = notification.message.title;
        newWorkbook.path = notification.message.path;
        newWorkbook.isFlagged = notification.message.isFlagged;
        newWorkbook.startDate = notification.message.startDate;
        newWorkbook.targetDate = notification.message.targetDate;
        newWorkbook.priority = notification.message.priority;
        newWorkbook.percentageCompleted = notification.message.percentageCompleted;

        newWorkbook.workbookId = notification.message.workbookId;
        newWorkbook.createdAt = notification.message.createdAt;
        newWorkbook.updatedAt = notification.message.updatedAt;
        
        return newWorkbook;
    }
    
    setupDefaults() {
        this.workbookId = uuidv4();
        this.isFlagged = false;
        this.startDate = 0;
        this.targetDate = 0;
        this.priority = Priority.NONE;
        this.percentageCompleted = 0.0;

        this.createdAt = Date.now();
        this.updatedAt = Date.now();
    }

    /**
     * 
     * Validates that the instance meets all of the business rules applied to it.
     * @returns Will return a validation model with errors and success status.
     * 
     */
    validate() {
        let workbookSchema = this.createWorkbookSchema();

        let validator = new Validator();
        let result = validator.validate(this, workbookSchema);
        return result;
    }
    
    /**
     * 
     * Creates a Workbook validation schema that defines the rules on how the model should be validated.
     * @returns Will return a jsonschema validation schema object.
     * 
     */
    createWorkbookSchema() {
        return {
            id: '/workbook',
            type: 'object',
            properties: {
                title: { type: 'string' },
                path: { type: 'string' },
                isFlagged: { type: 'boolean' },
                startDate: { type: 'number', format: 'number' },
                targetDate: { type: 'number', format: 'number' },
                priority: { type: 'string' },
                percentageCompleted: { type: 'integer' },
                workbookId: { type: 'string' },
                userId: { type: 'string' },
                owner: { type: 'string'},
                createdAt: { type: 'number' },
                updatedAt: { type: 'number' },
            },
            required: [ 'title', 'workbookId', 'userId', 'owner', 'path', 'isFlagged', 'priority', 'createdAt', 'updatedAt' ],
            additionalProperties: false,
        };
    }
}

module.exports = Workbook;