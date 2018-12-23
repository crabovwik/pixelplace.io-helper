(function () {
    const REQUEST_URL = 'https://pixelplace.io/back/placepixelV3.php';

    const COLORS = {
        WHITE: 0,
        BLUE: 13,
        RED: 5
    };

    const B_PARAM = 3108;

    const REQUEST_DELAY_MS = 150;

    const REQ_OBJECTS_COUNT = 30;

    const REQ_POOL = new ReqPool(REQ_OBJECTS_COUNT);

    function ReqPool(count) {
        let thisInstance = this;

        this.pool = {};

        this.available = {};
        this.busy = {};

        let req;
        for (let i = 0; i < count; i++) {
            req = new XMLHttpRequest();
            let uniqueId = getObjectUniqueId(req);

            this.pool[uniqueId] = req;
            this.available[uniqueId] = uniqueId;
        }

        function getObjectUniqueId(object) {
            if (typeof object.__uniq_id == "undefined") {
                object.__uniq_id = (Math.random() * (Number.MAX_SAFE_INTEGER - Number.MIN_SAFE_INTEGER) + Number.MAX_SAFE_INTEGER);
            }

            return object.__uniq_id;
        }

        this.getReq = function (callback) {
            if (thisInstance.available.length === 0) {
                console.log('There are no available req objects. Going to try it again in 500ms');
                setTimeout(function () {
                    thisInstance.getReq(callback)
                }, 500);
            } else {
                let uniqueId = Object.keys(thisInstance.available)[0];
                delete thisInstance.available[uniqueId];

                thisInstance.busy[uniqueId] = uniqueId;

                let req = thisInstance.pool[uniqueId];
                console.log('req object found. giving it... uniqueId is ' + uniqueId);
                callback(req);
            }
        };

        this.freeReq = function (req) {
            let uniqueId = getObjectUniqueId(req);
            delete thisInstance.busy[uniqueId];
            thisInstance.available[uniqueId] = uniqueId;
            console.log('freeing of req object with uniqueId = ' + uniqueId);
        }
    }

    function RequestStruct(startPoint, endPoint, c, b) {
        this.startPoint = startPoint;
        this.endPoint = endPoint;
        this.c = c;
        this.b = b;

        this.getStartPoint = function () {
            return this.startPoint;
        };

        this.getEndPoint = function () {
            return this.endPoint;
        };

        this.getC = function () {
            return this.c;
        };

        this.getB = function () {
            return this.b;
        };
    }

    function Point(x, y) {
        this.x = x;
        this.y = y;

        this.getX = function () {
            return this.x;
        };

        this.getY = function () {
            return this.y;
        };
    }

    function setPixelsByRequestStruct(eachPixelCallback, endCallback, requestStruct, drawingDelay = 500) {
        let nextPointFunction = getNextPointFunction(requestStruct.getStartPoint(), requestStruct.getEndPoint());
        let c = requestStruct.getC();
        let b = requestStruct.getB();

        let interval = setInterval(function () {
            let drawPoint = nextPointFunction();
            if (drawPoint === null) {
                clearInterval(interval);
                endCallback();
            }

            setPixel(drawPoint, c, b);
            eachPixelCallback(drawPoint);
        }, drawingDelay);
    }

    function getNextPointFunction(startPoint, endPoint) {
        let xOffset = 0;
        let yOffset = 0;

        function getRealX() {
            return startPoint.getX() + xOffset;
        }

        function getRealY() {
            return startPoint.getY() + yOffset;
        }

        return function () {
            // X
            if (getRealX() <= endPoint.getX()) {
                xOffset++;
                return new Point(getRealX(), getRealY());
            }

            // X done
            if (getRealX() > endPoint.getX()) {
                xOffset = 0;

                // All done
                if (getRealY() === endPoint.getY()) {
                    return null;
                } else { // Next line
                    yOffset++;
                }
            }

            return new Point(getRealX(), getRealY());
        }
    }

    function setPixel(point, c, b) {
        REQ_POOL.getReq(function (req) {
            let params = 'attemptPlaceV3=true' + '&x=' + point.getX() + '&y=' + point.getY() + '&c=' + c + '&b=' + b;
            req.open('POST', REQUEST_URL, true);
            req.setRequestHeader('Content-type', 'application/x-www-form-urlencoded');
            req.send(params);
            REQ_POOL.freeReq(req);
        });
    }

    function getWhiteRequestStruct() {
        let startPoint = new Point(433, 116);
        let endPoint = new Point(506, 138);

        return new RequestStruct(startPoint, endPoint, COLORS.WHITE, B_PARAM);
    }

    function getBlueRequestStruct() {
        let startPoint = new Point(433, 139);
        let endPoint = new Point(506, 161);

        return new RequestStruct(startPoint, endPoint, COLORS.BLUE, B_PARAM);
    }

    function getRedRequestStruct() {
        let startPoint = new Point(433, 162);
        let endPoint = new Point(506, 184);

        return new RequestStruct(startPoint, endPoint, COLORS.RED, B_PARAM);
    }

    function pointDrewHandler(point) {
        console.log(point.getX() + ':' + point.getY() + ' has been drawn');
    }

    console.log('Drawing white sector...');
    let whiteRequestStruct = getWhiteRequestStruct();
    setPixelsByRequestStruct(pointDrewHandler, function () {
        console.log('Drawing blue sector...');
        let blueRequestStruct = getBlueRequestStruct();
        setPixelsByRequestStruct(pointDrewHandler, function () {
            console.log('Drawing red sector...');
            let redRequestStruct = getRedRequestStruct();
            setPixelsByRequestStruct(pointDrewHandler, function () {
                console.log("It's done! %))");
            }, redRequestStruct, REQUEST_DELAY_MS);
        }, blueRequestStruct, REQUEST_DELAY_MS);
    }, whiteRequestStruct, REQUEST_DELAY_MS);
})();
