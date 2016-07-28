const R = require ( 'ramda' );
const P = require ( 'path' );
const C = require ( 'cluster' );

if ( C.isMaster ) {
    R.times ( () => { C.fork () }, require ( 'os' ).cpus ().length );
} else {
    require ( P.resolve ( 'main.js' ) ).start ();
}
