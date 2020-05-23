const AWS = require('aws-sdk');
const { v4: uuidv4 } = require('uuid');
const Configuration = require('./src/shared/configuration');

const numberOfUsers = 5;
const maxWorkbooksPerUser = 25;

exports.handler = async (event, context) => {
    let config = new Configuration();
    console.info(config);
    
    var dynamoDb = new AWS.DynamoDB({
        apiVersion: '2012-08-10',
        endpoint: config.data.dynamodb_endpointUrl,
    });
    
    console.info(`Searching for ${config.dynamodb_workbookTable} DynamoDb Table.`);
    let tableList = await dynamoDb.listTables().promise();
    if (!tableList.TableNames.includes(config.data.dynamodb_workbookTable)) {
        await createTableIfNotExist(config, dynamoDb);
    }
    
    console.info(`DynamoDb Table ${config.data.dynamodb_workbookTable} ready.`);
    
    let userIds = createUserIds(numberOfUsers);
    
    // Ensure we always have a 'test-user' created.
    userIds.push('test-user');
    
    let workBooks = createWorkbooksForUsers(userIds);
    
    await saveWorkbooks(config, dynamoDb, workBooks);
};

async function saveWorkbooks(config, dynamoDb, workbooks) {
    console.info(`Saving ${workbooks.length} workbooks to Table.`);
    
    for(var index = 0; index < workbooks.length; index++) {
        let currentWorkbook = workbooks[index];

        let params = {
            TableName: config.data.dynamodb_workbookTable,
            Item: {
                userId: { S: currentWorkbook.userId },
                username: { S: currentWorkbook.username },
                workbookId: {S: currentWorkbook.workbookId },
                title: { S: currentWorkbook.title },
                path: { S: currentWorkbook.path },
                isFlagged: { BOOL: currentWorkbook.isFlagged },
                startDate: { N: currentWorkbook.startDate.toString() },
                targetDate: { N: currentWorkbook.targetDate.toString() },
                priority: { S: currentWorkbook.priority },
                percentageCompleted: { N: currentWorkbook.percentageCompleted.toString() },
                createdAt: { N: currentWorkbook.createdAt.toString() },
                updatedAt: { N: currentWorkbook.updatedAt.toString() },
            },
        }

        await dynamoDb.putItem(params).promise();
    }
}

function generateRandomString() {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

function createWorkbooksForUsers(userIds) {
    console.info(`Creating Workbooks for ${userIds.length} users.`);
    
    let newWorkbooks = userIds.map(userId => {
        let numberOfWorkbooks = getNumberOfWorkbooksToCreate(maxWorkbooksPerUser);
        let workBooks = [];
        
        for(var count = 0; count < numberOfWorkbooks; count++) {
            let newWorkbook = createNewWorkbookForSingleUser(count, userId);
            workBooks.push(newWorkbook);
        }
        
        return workBooks;
    }).flat();
    
    return newWorkbooks;
}

function createNewWorkbookForSingleUser(userNumber, userId) {
    let title = generateRandomString();
    let path;
    
    if (userNumber % 2 === 0) {
        path = '/';
    } else {
        path = `/${generateRandomString()}`;
    }
    
    return {
        userId: userId,
        workbookId: uuidv4(),
        title: title,
        path: path,
        isFlagged: userNumber % 2 === 0 ? true : false,
        startDate: userNumber % 2 === 0 ? Date.now() : 0,
        targetDate: userNumber % 2 === 0 ? Date.now() : 0,
        priority: userNumber % 2 === 0 ? 'Low' : 'High',
        percentageCompleted: userNumber % 2 === 0 ? 85 : 0,
        createdAt: Date.now(),
        updatedAt: Date.now()
    };
}

function getNumberOfWorkbooksToCreate(max) {
    return 1 + Math.floor(Math.random() * Math.floor(max));
}

async function createTableIfNotExist(config, dynamoDb) {
    var params = {
      AttributeDefinitions: [
        {
          AttributeName: 'userId',
          AttributeType: 'S'
        },
        {
          AttributeName: 'workbookId',
          AttributeType: 'S'
        }
      ],
      KeySchema: [
        {
          AttributeName: 'userId',
          KeyType: 'HASH'
        },
        {
          AttributeName: 'workbookId',
          KeyType: 'RANGE'
        }
      ],
      ProvisionedThroughput: {
        ReadCapacityUnits: 2,
        WriteCapacityUnits: 2
      },
      TableName: config.data.dynamodb_workbookTable
    };

    console.info(`The ${config.data.dynamodb_workbookTable} does not exist and will be created.`);
    await dynamoDb.createTable(params).promise();
}

function createUserIds(numberOf) {
    console.info(`Creating ${numberOf} userIds for Workbooks.`);
    let userIds = [];
    
    for (var count = 0; count < numberOf; count++) {
        userIds.push(uuidv4());
    }
    
    return userIds;
}