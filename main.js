const config = require ( 'config' );
const http = require ( 'http' );
const R = require ( 'ramda' );
const H = require ( 'highland' );
const aws = require ( 'aws-sdk' ), s3 = new aws.S3 ( { region: 'eu-west-1' } );

const handlers = {
    '/audio': {
        post: ( req, res ) => {
            H ( req )
                .reduce1 ( ( a, b ) => {
                    return Buffer.concat ( [ a, b ] );
                } )
                .map ( ( body ) => {
                    return {
                        Bucket: config.s3.Bucket,
                        Key: 'test.mp3',
                        Body: body
                    }
                } )
                .flatMap ( H.wrapCallbackApplied ( s3, 'putObject' ) )
                .errors ( R.unary ( writePayload ( res, 500, {} ) ) )
                .each ( writePayload ( res, 201, {} ) );            
        }
    }
};

const writePayload = R.curry ( ( res, statusCode, headers, payload ) => {
    res.writeHead ( statusCode, R.merge ( {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': '*'
    }, headers ) );
    res.end ( JSON.stringify ( payload ) );
} );

H.wrapCallbackApplied = require ( 'highland-wrapcallback' );

module.exports = {
    start: () => {
        const server = http.createServer ( ( req, res ) => {
            const method = R.toLower ( req.method ), url = req.url, handler = R.path ( [ url, method ], handlers );

            console.log ( method, url );

            if ( R.type ( handler ) === 'Function' ) {
                return handler ( req, res );
            }

            return writePayload ( res, 404, {
                'Content-Type': 'text/plain'
            }, 'No such resource' );
        } );

        server.listen ( process.env['PORT'] || 5000, () => {
            console.log ( 'Server listening on port ' + ( process.env['PORT'] || 80 ) );
        } );
    }
};
