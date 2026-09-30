const http = require("http");

const {
    open,
    Protocol,
    SimConnectConstants,
    SimConnectDataType,
    SimConnectPeriod
} = require("node-simconnect");


// ============================================================
// RAZER CHROMA
// ============================================================

const CHROMA_HOST = "localhost";
const CHROMA_PORT = 54235;

let chromaUri = null;


// ============================================================
// CHROMA HEARTBEAT
// ============================================================

const HEARTBEAT_INTERVAL = 1000;

let heartbeatTimer = null;


// ============================================================
// KEY POSITIONS
// ============================================================

// Your confirmed working keys
// [1][6] = 6 = LANDING GEAR
// [1][9] = 9 = PARKING BRAKE

const GEAR_ROW = 0;
const GEAR_COL = 7;

const BRAKE_ROW = 0;
const BRAKE_COL = 10;


// ============================================================
// COLORS
// ============================================================

const COLORS = {

    OFF: 0x000000,

    GREEN: 0x00FF00,
    RED:   0x0000FF,
    BLUE:  0xFF0000,
    YELLOW: 0x00FFFF,
    WHITE: 0xFFFFFF
};


// ============================================================
// STATE
// ============================================================

let gearPosition = 0;
let parkingBrake = false;
let autopilotMaster = false;

let lastMatrix = null;


// ============================================================
// MATRIX
// ============================================================

function createKeyboardMatrix() {

    return Array.from(
        { length: 6 },
        () => Array(22).fill(COLORS.OFF)
    );
}


// ============================================================
// RGB → RAZER BGR
// ============================================================

function rgbToBgr(r, g, b) {

    return (
        (b << 16) |
        (g << 8) |
        r
    );
}


// ============================================================
// GEAR TRANSITION
// ============================================================

function gearTransitionColor(position) {

    /*
        Gear position:

        1.0 = DOWN
        0.0 = UP

        During movement:

        YELLOW → WHITE
    */


    const t = Math.max(
        0,
        Math.min(
            1,
            1 - position
        )
    );


    const r = 255;
    const g = 255;

    const b = Math.round(
        255 * t
    );


    return rgbToBgr(
        r,
        g,
        b
    );
}


// ============================================================
// UPDATE RAZER KEYBOARD
// ============================================================



function updateRazerKeyboard() {

    if (!chromaUri) {
        return;
    }


    // ========================================================
    // CREATE MATRIX
    // ========================================================

    const matrix = createKeyboardMatrix();


    // ========================================================
    // PERSISTENT FUNCTION KEYS
    // ========================================================
    
    matrix[1][2]  = COLORS.YELLOW; 
    matrix[1][3]  = COLORS.YELLOW; 
    matrix[1][4]  = COLORS.YELLOW; 
    matrix[1][5]  = COLORS.YELLOW; 
    matrix[1][6]  = COLORS.YELLOW; 
    matrix[1][7]  = COLORS.YELLOW; 
    matrix[1][8]  = COLORS.YELLOW; 
    matrix[1][9]  = COLORS.YELLOW; 
    matrix[1][10]  = COLORS.YELLOW;  
    matrix[1][17]  = COLORS.RED; 


    matrix[2][5]  = COLORS.BLUE;    // 
    matrix[2][8]  = COLORS.BLUE;  // 
    matrix[2][9]  = COLORS.GREEN;  // 
    matrix[2][10]  = COLORS.BLUE;  // 
    matrix[2][12]  = COLORS.BLUE;  //
    matrix[2][17]  = COLORS.GREEN;  // 

    matrix[3][4]  = COLORS.RED;  // 
    matrix[3][5]  = COLORS.GREEN; 
    matrix[3][12]  = COLORS.GREEN; 
    
    matrix[4][5]  = COLORS.BLUE;  // 
    matrix[4][6]  = COLORS.BLUE;  // 
    matrix[4][7]  = COLORS.BLUE;  // 
    matrix[4][8]  = COLORS.GREEN;  // 
    matrix[4][9]  = COLORS.BLUE;  // 
    matrix[4][10]  = COLORS.GREEN; 
    matrix[4][12]  = COLORS.BLUE;  // 


    // ========================================================
    // NUMBER ROW
    // ========================================================



    // ========================================================
    // AUTOPILOT — KEY 1
    // ========================================================

    matrix[3][2] =
        autopilotMaster
            ? COLORS.GREEN
            : COLORS.WHITE;


    // ========================================================
    // LANDING GEAR — KEY 6
    // ========================================================

    let gearColor;


    if (gearPosition >= 0.99) {

        // DOWN
        gearColor = COLORS.GREEN;

    } else if (gearPosition <= 0.01) {

        // UP
        gearColor = COLORS.WHITE;

    } else {

        // TRANSITION
        gearColor =
            gearTransitionColor(
                gearPosition
            );
    }


    matrix[GEAR_ROW][GEAR_COL] =
        gearColor;


    // ========================================================
    // PARKING BRAKE — KEY 9
    // ========================================================

    matrix[BRAKE_ROW][BRAKE_COL] =
        parkingBrake
            ? COLORS.RED
            : COLORS.GREEN;


    // ========================================================
    // DON'T SEND IDENTICAL MATRIX
    // ========================================================

    const matrixString =
        JSON.stringify(matrix);


    if (matrixString === lastMatrix) {
        return;
    }


    lastMatrix =
        matrixString;


    // ========================================================
    // CHROMA REQUEST
    // ========================================================

    const body = JSON.stringify({

        effect: "CHROMA_CUSTOM",

        param: matrix

    });


    const target =
        new URL(
            chromaUri + "/keyboard"
        );


    console.log(
        "🎨 Updating Razer keyboard..."
    );


    const request =
        http.request(

            {
                hostname:
                    target.hostname,

                port:
                    target.port,

                path:
                    target.pathname,

                method:
                    "PUT",

                headers: {

                    "Content-Type":
                        "application/json",

                    "Content-Length":
                        Buffer.byteLength(body)
                }
            },


            response => {

                let responseBody = "";


                response.on(
                    "data",
                    chunk => {

                        responseBody += chunk;

                    }
                );


                response.on(
                    "end",
                    () => {

                        if (
                            response.statusCode < 200 ||
                            response.statusCode >= 300
                        ) {

                            console.error(
                                "❌ Razer rejected keyboard update"
                            );

                            console.error(
                                "HTTP status:",
                                response.statusCode
                            );

                            console.error(
                                "Response:",
                                responseBody
                            );

                        } else {

                            console.log(
                                "✅ Razer keyboard updated"
                            );

                        }
                    }
                );
            }
        );


    request.on(
        "error",
        error => {

            console.error(
                "❌ Razer HTTP error"
            );

            console.error(
                "Code:",
                error.code
            );

            console.error(
                "Message:",
                error.message
            );

            console.error(
                "Full error:",
                error
            );
        }
    );


    request.write(body);

    request.end();
}


// ============================================================
// RAZER CHROMA HEARTBEAT
// ============================================================

function sendChromaHeartbeat() {

    if (!chromaUri) {
        return;
    }


    const target =
        new URL(
            chromaUri + "/heartbeat"
        );


    const request =
        http.request(

            {
                hostname:
                    target.hostname,

                port:
                    target.port,

                path:
                    target.pathname,

                method:
                    "PUT"
            },


            response => {

                // Drain the response so the socket is released

                response.resume();


                if (
                    response.statusCode < 200 ||
                    response.statusCode >= 300
                ) {

                    console.error(
                        "❌ Razer heartbeat rejected. HTTP status:",
                        response.statusCode
                    );
                }
            }
        );


    request.on(
        "error",
        error => {

            console.error(
                "❌ Razer heartbeat error:",
                error.message
            );
        }
    );


    request.end();
}


function startChromaHeartbeat() {

    if (heartbeatTimer) {
        return;
    }


    heartbeatTimer =
        setInterval(
            sendChromaHeartbeat,
            HEARTBEAT_INTERVAL
        );


    console.log(
        "💓 Razer heartbeat started"
    );
}


// ============================================================
// RAZER CHROMA INITIALIZATION
// ============================================================

function initializeChroma() {

    const registration =
        JSON.stringify({

            title:
                "MSFS Flight Controls",

            description:
                "MSFS keyboard flight indicators",

            author: {

                name:
                    "Ajay",

                contact:
                    "MSFS"
            },

            device_supported: [

                "keyboard"

            ],

            category:
                "application"
        });


    const request =
        http.request(

            {

                hostname:
                    CHROMA_HOST,

                port:
                    CHROMA_PORT,

                path:
                    "/razer/chromasdk",

                method:
                    "POST",

                headers: {

                    "Content-Type":
                        "application/json",

                    "Content-Length":
                        Buffer.byteLength(
                            registration
                        )
                }

            },

            response => {

                let data = "";


                response.on(
                    "data",
                    chunk => {

                        data += chunk;

                    }
                );


                response.on(
                    "end",
                    () => {

                        try {

                            const result =
                                JSON.parse(data);


                            if (!result.uri) {

                                console.error(
                                    "❌ Razer registration failed"
                                );

                                console.error(
                                    result
                                );

                                return;
                            }


                            chromaUri =
                                result.uri;


                            console.log(
                                "✅ Razer Chroma connected"
                            );

                            console.log(
                                "Chroma URI:",
                                chromaUri
                            );


                            startChromaHeartbeat();


                            updateRazerKeyboard();

                        }

                        catch (error) {

                            console.error(
                                "Razer response error:",
                                data
                            );
                        }
                    }
                );
            }
        );


    request.on(
        "error",
        error => {

            console.error(
                "❌ Razer connection error:",
                error.message
            );
        }
    );


    request.write(
        registration
    );

    request.end();
}


// ============================================================
// SIMCONNECT
// ============================================================

const DATA_DEFINITION = 0;
const DATA_REQUEST = 0;


// ============================================================
// MSFS AUTO-CONNECT
// ============================================================

const RECONNECT_DELAY = 5000;

let simConnectHandle = null;
let connectedToMSFS = false;
let reconnectTimer = null;


// ============================================================
// CONNECT TO MSFS
// ============================================================

async function connectToMSFS() {

    if (connectedToMSFS) {
        return;
    }


    console.log(
        "🔍 Checking for MSFS..."
    );


    try {

        const connection =
            await open(

                "MSFS Razer Flight Controls",

                Protocol.FSX_SP2

            );


        const {
            recvOpen,
            handle
        } = connection;


        connectedToMSFS =
            true;

        simConnectHandle =
            handle;


        console.log("");

        console.log(
            "======================================"
        );

        console.log(
            "✈️ MSFS FOUND!"
        );

        console.log(
            `Simulator: ${
                recvOpen.applicationName
            }`
        );

        console.log(
            "======================================"
        );

        console.log("");


        // ====================================================
        // DATA DEFINITIONS
        // ====================================================

        // 1. GEAR
        handle.addToDataDefinition(

            DATA_DEFINITION,

            "GEAR CENTER POSITION",

            "position",

            SimConnectDataType.FLOAT64

        );


        // 2. PARKING BRAKE
        handle.addToDataDefinition(

            DATA_DEFINITION,

            "BRAKE PARKING POSITION",

            "percent",

            SimConnectDataType.FLOAT64

        );


        // 3. AUTOPILOT
        handle.addToDataDefinition(

            DATA_DEFINITION,

            "AUTOPILOT MASTER",

            "bool",

            SimConnectDataType.FLOAT64

        );


        // ====================================================
        // REQUEST DATA
        // ====================================================

        handle.requestDataOnSimObject(

            DATA_REQUEST,

            DATA_DEFINITION,

            SimConnectConstants.OBJECT_ID_USER,

            SimConnectPeriod.SECOND,

            0,
            0,
            0,
            0

        );


        // ====================================================
        // RECEIVE DATA
        // ====================================================

        handle.on(

            "simObjectData",

            data => {

                if (
                    data.requestID !==
                    DATA_REQUEST
                ) {

                    return;
                }


                // IMPORTANT:
                // These MUST be read in the
                // SAME ORDER as the definitions above.


                // 1. Gear

                const gearPositionValue =
                    data.data.readFloat64();


                // 2. Parking brake

                const brakePosition =
                    data.data.readFloat64();


                // 3. Autopilot

                const autopilotPosition =
                    data.data.readFloat64();


                // ====================================================
                // UPDATE STATE
                // ====================================================

                gearPosition =
                    gearPositionValue;


                parkingBrake =
                    brakePosition > 1;


                autopilotMaster =
                    autopilotPosition > 0;


                // ====================================================
                // UPDATE RAZER
                // ====================================================

                updateRazerKeyboard();

            }
        );


        // ====================================================
        // MSFS CLOSED
        // ====================================================

        handle.on(

            "quit",

            () => {

                console.log(
                    "⚠️ MSFS closed."
                );


                handleMSFSDisconnect();

            }
        );


        handle.on(

            "close",

            () => {

                console.log(
                    "⚠️ SimConnect disconnected."
                );


                handleMSFSDisconnect();

            }
        );


        // ====================================================
        // SIMCONNECT ERROR
        // ====================================================

        handle.on(

            "exception",

            exception => {

                console.error(
                    "SimConnect exception:",
                    exception
                );

            }
        );

    }


    catch (error) {

        connectedToMSFS =
            false;

        simConnectHandle =
            null;


        console.log(
            `⏳ MSFS not running. Retrying in ${
                RECONNECT_DELAY / 1000
            } seconds...`
        );


        scheduleReconnect();

    }
}


// ============================================================
// HANDLE MSFS DISCONNECT
// ============================================================

function handleMSFSDisconnect() {

    if (!connectedToMSFS) {
        return;
    }


    connectedToMSFS =
        false;

    simConnectHandle =
        null;


    // Reset dynamic states

    gearPosition =
        0;

    parkingBrake =
        false;

    autopilotMaster =
        false;


    // Force next Razer update

    lastMatrix =
        null;


    updateRazerKeyboard();


    console.log(
        "🔄 Waiting for MSFS..."
    );


    scheduleReconnect();
}


// ============================================================
// RECONNECT
// ============================================================

function scheduleReconnect() {

    if (reconnectTimer) {
        return;
    }


    reconnectTimer =
        setTimeout(

            () => {

                reconnectTimer =
                    null;

                connectToMSFS();

            },

            RECONNECT_DELAY

        );
}


// ============================================================
// START
// ============================================================

console.log(
    "Starting MSFS → Razer controller..."
);


initializeChroma();


connectToMSFS();