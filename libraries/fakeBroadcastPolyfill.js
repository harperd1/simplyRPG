//This is a fake polyfill for the broadcast channel functionality which is missing in Safari and internet explorer
//It doesn't actually solve anything, but it prevents the lack of broadcast channel from breaking the rest of the site in these browsers

let supportsMirrorMap;
let scopeHolder;
if (typeof BroadcastChannel === 'undefined') {
    class BroadcastChannel {
        constructor (name ) {
            this.name = name;
        }

        postMessage( ){
        }

    }

    scopeHolder = BroadcastChannel;
    supportsMirrorMap = false;
} else {
    scopeHolder = BroadcastChannel;
    supportsMirrorMap = true;
}

BroadcastChannel = scopeHolder