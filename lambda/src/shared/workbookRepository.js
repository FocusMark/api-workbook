const AWS = require('aws-sdk');

class WorkbookRepository {
    constructor(dynamoDb, configuration) {
        console.info('Building Repository for Workbooks.');
        this.dynamoDb = dynamoDb;
        this.configuration = configuration;
        console.info(configuration);
    }
    
    async getWorkbook(userId, workbookId) {
        console.info(`Preparing to query for Workbook ${workbookId} on table ${this.configuration.data.dynamodb_workbookTable}.`)
        let params = {
            TableName: this.configuration.data.dynamodb_workbookTable,
            Key: {
                userId: userId,
                workbookId: workbookId,
            },
        };
        
        let getRequest = this.dynamoDb.get(params);
        console.info(`Query request created for ${userId}... Preparing to await`);
        let getResponse = await getRequest.promise();
        console.log('Query completed.');

        return getResponse.Item;
    }
    
    async getWorkbooksByUser(userId) {
        console.info(`Preparing to query for Workbooks for user ${userId} on table ${this.configuration.data.dynamodb_workbookTable}.`)
        let params = {
            TableName: this.configuration.data.dynamodb_workbookTable,
            KeyConditionExpression: 'userId = :user',
            ExpressionAttributeValues: {
                ':user': userId
            }
        };
        
        console.info(params);
        let queryRequest = this.dynamoDb.query(params);
        console.info(`Query request created for ${userId}... Preparing to await`);
        let queryResponse = await queryRequest.promise();
        console.log('Query completed.');
        return queryResponse.Items;
    }
    
    async createWorkbook(newWorkbook) {
        console.info(`Preparing to create Workbook ${newWorkbook.workbookId} on table ${this.configuration.data.dynamodb_endpointUrl}`);
        
        let params = this.getCreateParameters(newWorkbook);

        console.info(`Parameters created... Creating record for Workbook ${newWorkbook.workbookId}.`);
        let putRequest = this.dynamoDb.put(params);
        try {
            await putRequest.promise();
        } catch(err) {
            console.log(err);
            throw 'Put request failed on new Workbook.';
        }
        
        console.info(`Creation for ${newWorkbook.workbookId} completed.`);
    }
    
    getCreateParameters(newWorkbook) {
        return {
            TableName: this.configuration.data.dynamodb_workbookTable,
            Item: {
                userId: newWorkbook.userId,
                workbookId: newWorkbook.workbookId,
                owner: newWorkbook.owner,
                title: newWorkbook.title,
                path: newWorkbook.path,
                isFlagged: newWorkbook.isFlagged,
                startDate: newWorkbook.startDate,
                targetDate: newWorkbook.targetDate,
                priority: newWorkbook.priority,
                percentageCompleted: newWorkbook.percentageCompleted,
                createdAt: newWorkbook.createdAt,
                updatedAt: newWorkbook.updatedAt,
            },
        };
    }
}

module.exports = WorkbookRepository;