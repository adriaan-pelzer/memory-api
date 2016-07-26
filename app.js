var R = require ( 'ramda' );
var P = require ( 'path' );
var C = require ( 'cluster' );

if ( C.isMaster ) {
    R.times ( function () { C.fork () }, require ( 'os' ).cpus ().length );
} else {
    require ( P.resolve ( 'main.js' ) ).start ();
}
