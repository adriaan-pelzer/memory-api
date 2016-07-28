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
    },
    '/test': {
        get: ( req, res ) => {
            writePayload ( res, 200, {}, { path: '/test' } );
        }
    },
    '/test/{param1}': {
        get: ( req, res ) => {
            writePayload ( res, 200, {}, { path: '/test/' + req.param.param1 } );
        }
    },
    '/test/{param1}/{param2}': {
        get: ( req, res ) => {
            writePayload ( res, 200, {}, { path: '/test/' + req.param.param1 + '/' + req.param.param2 } );
        }
    },
    '/test/{param1}/hallo/{param2}': {
        get: ( req, res ) => {
            writePayload ( res, 200, {}, { path: '/test/' + req.param.param1 + '/hallo/' + req.param.param2 } );
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

const pathRegex = ( handlerKey ) => {
    return '^' + handlerKey.replace ( /{[^}]+}/g, '([^/]+)' ) + '$';
};

const pathMatch = ( handlerKey, path ) => {
    return path.match ( pathRegex ( handlerKey ) );
};

const pathParams = ( handlerKey, path ) => {
    var ret = {}, handlerKeyComps = handlerKey.split ( '/' ), pathKeyComps = path.split ( '/' );

    for ( var i = 0; i < handlerKeyComps.length; i++ ) {
        if ( handlerKeyComps[i].match ( /^\{.+\}$/ ) ) {
            ret[handlerKeyComps[i].replace ( '{', '' ).replace ( '}', '' )] = pathKeyComps[i];
        }
    }

    return ret;
};

H.wrapCallbackApplied = require ( 'highland-wrapcallback' );

console.log ( R.map ( pathRegex, R.keys ( handlers ) ) );

module.exports = {
    start: () => {
        const server = http.createServer ( ( req, res ) => {
            const method = R.toLower ( req.method ), url = req.url;

            const handlerKey = R.find ( ( handlerKey ) => {
                return ! R.isNil ( pathMatch ( handlerKey, url ) );
            }, R.keys ( handlers ) );

            const handler = R.path ( [ handlerKey, method ], handlers );

            console.log ( pathParams ( handlerKey, url ) );

            if ( R.type ( handler ) === 'Function' ) {
                return handler ( R.merge ( req, {
                    param: pathParams ( handlerKey, url )
                } ), res );
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
