let Response = require('./shared/response');
let JwtUser = require('./shared/jwt-user');

class App {
    constructor(repository, configuration, event) {
        this.configuration = configuration;
        this.repository = repository;
        this.event = event;
    }
    
    async run() {
        let user = new JwtUser(this.event);
        let userId = user.userId;
        
        if (this.event.pathParameters && this.event.pathParameters.workbookId) {
            let workbookId = this.event.pathParameters.workbookId;
            let workbook = await this.repository.getWorkbook(userId, workbookId);
            if (workbook) {
                delete workbook.owner;
                delete workbook.userId;
                return new Response(200, workbook);
            }
        } else {
            let workbooks = await this.repository.getWorkbooksByUser(userId);
            console.info(`Workbooks found: ${workbooks}`);
            if (workbooks) {
                return new Response(200, workbooks.map(workbook => {
                    delete workbook.owner;
                    delete workbook.userId;
                    return workbook;
                }));
            }
        }
        
        return new Response(404, null, null);
    }
}

module.exports = App;