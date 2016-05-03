var https = require('https');

var defaultHeaders= {
			"X-Client-Token":"145d9cc482614938b61f33e02f49accc"
}


var defaultOptions = {
	host: "connect.pathe.nl",
	headers: defaultHeaders,
	path: ''
}

module.exports = [
    {
        description:	'Get cinemalist',
        method: 		'GET',
        path:			'/',
        requires_authorization: false,
        
        fn: function( callback, args ){
           var options = defaultOptions;
           options.path = '/v1/cinemas';
           
        https.get(options,function(res){
            var body = '';
            res.on('data',function(chunk){
                body += chunk;	
            }).on('end',function(){
                callback(null,body);
            });
        }).on('error',function(error){
            callback(null,null);
        });
        }
    }
]