class JwtUser {
    constructor(httpEvent) {
        let authHeader = httpEvent.headers['Authorization'];
        if (!authHeader) {
            throw 'Authorization header missing';
        }
        
        if (!authHeader.startsWith('Bearer')) {
            throw 'Bearer token is missing';
        }
        
        let splitResult = authHeader.split(' ');
        if (splitResult.length != 2) {
            throw 'Missing Jwt token';
        }
        
        this.jwt = splitResult[1];
        
        this.jwt = authHeader;
        this.parseJwt();
    }
    
    parseJwt() {
        let userData = this.jwt.split('.')[1];
        let buffer = Buffer.from(userData, 'base64');
        let json = buffer.toString('utf8');
        let user = JSON.parse(json);
        
        this.sub = user.sub;
        this.userId = user.sub;
        this.username = user.username;
    }
}

module.exports = JwtUser;