const globs = {
    windowLocation: null,
    canvasMode:'circleMoving',
    canvasX:null,
    canvasY:null,
    newCanvasWidth:null,
    newCanvasHeight:null,
    newCircleX: null,
    newCircleY: null,
    gridDrawn: false,
    gridWidth: 1.25,
    circleHandles: [],
    imageSrc: null,
    backgroundBitmap: null,
    canvasResizeFactor: 1,
    pxPerFoot: 5,
    imageCompression: true,
    canvasNeedsUpdate: false,
    lastResizeCanvasWidth: null,
    grid: {
        gridlines: [],

        drawGrid: function(pxPerFoot) {
            let centerX = globs.canvasX/2;
            let centerY = globs.canvasY/2;
            let gridSpacing = 5*pxPerFoot; //in pixels
            let numLinesX = (globs.canvasX - globs.canvasX%gridSpacing)/gridSpacing;
            let numLinesY = (globs.canvasY - globs.canvasY%gridSpacing)/gridSpacing;

            for (let xCoord = centerX - (gridSpacing*numLinesX)/2; 
              xCoord < globs.canvasX; xCoord += gridSpacing) {
                const line = new createjs.Shape();
                //Specify top right corner with x,y,width,height
                line.graphics.beginFill("black").drawRect(xCoord,0,globs.gridWidth,globs.canvasY);
                stage.addChild(line);
                this.gridlines.push(line);
            }

            for (let yCoord = centerY - (gridSpacing*numLinesY)/2; 
              yCoord < globs.canvasY; yCoord += gridSpacing) {
                const line = new createjs.Shape();
                //Specify top right corner with x,y,width,height
                line.graphics.beginFill("black").drawRect(0,yCoord,globs.canvasX,globs.gridWidth);
                stage.addChild(line);
                this.gridlines.push(line);
            }
            stage.update()
        },

        removeGrid: function() {
            for (let counter = 0; counter < this.gridlines.length; counter += 1) {
                line = this.gridlines[counter];
                stage.removeChild(line);
            }
            this.gridlines = [];
            stage.update();
        },

        redrawGrid: function() {
            this.removeGrid();
            this.drawGrid();
        }
    }
}

//Define a broadcast channel class that automatically packages the canvas size and window location with the message
const broadcastChannel = {
    bc: new BroadcastChannel('primaryChannel'),

    postMessage: function (message) {
        this.bc.postMessage([[globs.canvasX,globs.canvasY,globs.windowLocation],message])
    }
}

function applyBroadcast(broadcastData,otherX,otherY) {
    // let broadcastRescaleX = globs.canvasX/otherX;
    // let broadcastRescaleY = /globs.canvasY/otherY;
    // same for both
    let broadcastRescale = globs.canvasY/otherY;


    if (broadcastData[0] === "loadMap") {
        loadMapImage(broadcastData[1]);
    } else if (broadcastData[0] === "toggleGrid") {
        globs.pxPerFoot = broadcastData[2]*broadcastRescale;
        updateGrid(broadcastData[1],globs.pxPerFoot);
    } else if (broadcastData[0] === "updateScale") {
        updateCanvasScale(broadcastData[1]*broadcastRescale);
    } else if (broadcastData[0] === "newCircle") {
        drawNewCircle(broadcastData[1],broadcastData[2],broadcastData[3],'encounterMap',broadcastData[4]);
    } else if (broadcastData[0] === "labelUpdate") {
        let labels = broadcastData[1];
        for (let i=0;i<labels.length;i+=1) {
            let circleHandle = globs.circleHandles[i];
            let label = labels[i];
            if (label) {
                circleHandle.namedSubElements.labelbox.value = label;
            }
        }
        updateCanvas();
    } else if (broadcastData[0] === 'removeCircle') {
        let circleID = broadcastData[1];
        let circleHandle = globs.circleHandles[circleID];
        if (circleHandle) {
            circleHandle.removeCircle();
            circleHandle.removeHandle();
            circleHandle.removeFromMasterList();
        }
    } else if (broadcastData[0] === "moveCircle") {
        let circleID = broadcastData[1];
        let circleHandle = globs.circleHandles[circleID];
        if (circleHandle) {
            circleHandle.updateLocation(broadcastData[2]*broadcastRescale,broadcastData[3]*broadcastRescale)
        }
    } else if (broadcastData[0] === "appendNullToken") {
        globs.circleHandles.push(null);
    } else if (broadcastData[0] === "drawLine") {
        drawSingleLine(broadcastData[1]*broadcastRescale,broadcastData[2]*broadcastRescale,
                       broadcastData[3]*broadcastRescale,broadcastData[4]*broadcastRescale,
                       broadcastData[5],broadcastData[6]);
    } else if (broadcastData[0] === 'eraseAllLines') { 
        eraseAllLines();
    } else if (broadcastData[0] === "drawMeasurer") {
        drawSingleMeasurer(broadcastData[1]*broadcastRescale,broadcastData[2]*broadcastRescale,
                           broadcastData[3]*broadcastRescale,broadcastData[4]*broadcastRescale);
    } else if (broadcastData[0] === "eraseMeasurer") {
        eraseMeasurer();
    } else if (broadcastData[0] === "updateCanvas") {
        updateCanvas();
    } else if (broadcastData[0] === "newRotation") {
        let circleHandle = globs.circleHandles[broadcastData[1]];
        if (circleHandle) {
            globs.circleHandles[broadcastData[1]].updateRotation(broadcastData[2]);
        }
    } else if (broadcastData[0] === "manuallyAppendImage") {
        globs.circleHandles[broadcastData[1]].manuallyAppendImageFile(broadcastData[2]);
    } else if (broadcastData[0] === "requestOppositePageElements") {
        broadcastPageElements();
    } else if (broadcastData[0] === "toggleImageCompression") {
        if (globs.imageCompression) {
            globs.imageCompression = false;
        } else {
            globs.imageCompression = true;
        }
    } else if (broadcastData[0] === "removeLineSegment") {
        let lineSegment = drawer.lineSegments[broadcastData[1]];
        lineSegment.remove();
    } else if (broadcastData[0] === "cleanUpNullLines") {
        cleanUpNullLines();
    } else if (broadcastData[0] === "clearCanvas") {
        _clearCanvas();
    } else {
        console.log("Broadcast message not understood! "+broadcastData[0]+' '+broadcastData[1]);
    }
}

function broadcastPageElements () {
    //broadcasts everything on the current page to the new page

    //All the images should have been compressed on the first go-round, so no need to do so again
    broadcastChannel.postMessage(["toggleImageCompression"]) //turn image compression off

    if (globs.imageSrc) {
        broadcastChannel.postMessage(['loadMap',globs.imageSrc]);
    }

    //Draw the grid on the new window if it's already on the current window
    if (globs.gridDrawn) {
        broadcastChannel.postMessage(['toggleGrid',checkboxValue,globs.pxPerFoot]);
    }

    //Update the map scale of the new window to match that of the current window
    broadcastChannel.postMessage(['updateScale',globs.pxPerFoot]);

    //Draw the currently existing circle on the new page
    for (let i=0;i<globs.circleHandles.length;i+=1) {
        let circleHandle = globs.circleHandles[i];
        if (circleHandle) {
            let circle = circleHandle.namedSubElements.circle;
            broadcastChannel.postMessage(['newCircle',circle.circleRadius*2,circle.circleColor,circle.circleText,circle.circleType]);
            let x = circle.dragObject.x;
            let y = circle.dragObject.y;
            broadcastChannel.postMessage(['moveCircle',i,x,y]);
            let rot = circle.dragObject.rotation;
            broadcastChannel.postMessage(['newRotation',i,rot]);

            if (circle.imageFile) {
                broadcastChannel.postMessage(["manuallyAppendImage",circle.id,circle.imageFile]);
            }
        } else {
            broadcastChannel.postMessage(["appendNullToken"]);
        }
    }

    //Draw the currently existing lines on the new page
    for (let i = 0; i < drawer.lineSegments.length; i += 1) {
        line = drawer.lineSegments[i]
        if (line) {
            broadcastChannel.postMessage(['drawLine',line.startX,line.endX,line.startY,line.endY,line.width,line.color])
        }
    }
    
    //Draw the currently existing measurer, if applicable
    if (measurer.currentLine) {
        broadcastChannel.postMessage(['drawMeasurer',measurer.currentLine.startX,measurer.currentLine.endX,
                                      measurer.currentLine.startY,measurer.currentLine.endY])
    }

    broadcastChannel.postMessage(['updateCanvas']);
    broadcastChannel.postMessage(["toggleImageCompression"]) //turn image compression back on
} 

 class DraggableCircle {
        constructor(circleRadius,circleColor,circleText,windowLocation,id,circleType,askUserForFile=true) {
            this.circleRadius = circleRadius;
            this.circleColor = circleColor;
            this.circleText = circleText;
            this.windowLocation = windowLocation;
            this.id = id;
            this.circleType = circleType;

            this.moveable = null;
            this.moveEvent = null;

            this.imageFile = null; //The File object for the image
            this.image = null; //The Image object for the image
            this.conversionMatrix = null; //Matrix for converting the original image to the new one
            this.needsRedraw = false; //if the image isn't available at the first draw, draw again
            if ((circleType === "custom" || circleType === "customCircle") && windowLocation === "main") {
                    if (askUserForFile) {
                        this.upload();
                    }
            } 

            //The drag object is used for removing the circle from the canvas
            //It also contains the circle's current position with .x and .y properties
            this.dragObject = this.drawNew();
            if (globs.canvasMode === "circleMoving") {
                this.makeMoveable();
            }

            //Variables used in event detection
            this.tmpFunction = null;
            this.oldRotationX = null;
            this.oldRotationY = null;
        }

        drawNew(x=globs.newCircleX,y=globs.newCircleY,rotation=0) {
            let circle = new createjs.Shape();
            let circleRadiusInPx = this.circleRadius*globs.pxPerFoot;

            // Circle with x coord, y coord, and radius
            // The acutal location of the circle will be set using the draggable container, so x and y should be 0
            let circleGraphic = circle.graphics.beginFill(this.circleColor)
            if (this.circleType === 'circle') {
                circle.graphics.beginFill(this.circleColor).drawCircle(0, 0, circleRadiusInPx);
            } else if (this.circleType === 'square') {
                circle.graphics.beginFill(this.circleColor).drawRect(-1*circleRadiusInPx, -1*circleRadiusInPx, circleRadiusInPx*2, circleRadiusInPx*2);
            } else if (this.circleType === 'cone') {
                //3 sides with 0 point radius and 60 degree angles makes a cone
                //the 1.3094 is a conversion unique to the equilateral triangle that lets us use axis length instead of side length
                circle.graphics.beginFill(this.circleColor).drawPolyStar(0, 0, circleRadiusInPx*1.3094, 3, 0, 60);
            } else if (this.circleType === 'customCircle') {
                if (this.image) {
                    this.findTransformationMatrix(false);
                    circle.graphics.beginBitmapFill(this.image,"no-repeat",this.transformationMatrix).drawCircle(0, 0, circleRadiusInPx);
                    this.needsRedraw = false;
                } else {
                    this.needsRedraw = true;
                } 
            } else if (this.circleType === 'custom') {
                if (this.image) {
                    let rescalers = this.findTransformationMatrix(true);
                    circle = new createjs.Bitmap(this.image);
                    circle.x = -1*circleRadiusInPx;
                    circle.y = -1*circleRadiusInPx;
                    circle.scaleX = rescalers[0];
                    circle.scaleY = rescalers[1];
                    this.needsRedraw = false;
                } else {
                    this.needsRedraw = true;
                }
            } else {
                console.log('symbol type not recognized: '+this.circleType)
            }
            // Add text to the circle
            let fontsize = circleRadiusInPx;
            let label = new createjs.Text(this.circleText, `bold ${fontsize}px Arial`, "#FFFFFF");
            label.textAlign = "center";
            label.x = 0;
            label.y = 0 - fontsize*7/16;

            const dragger = new createjs.Container();
            dragger.windowLocation = this.windowLocation;
            dragger.id = this.id;
            dragger.x = x;
            dragger.y = y;
            dragger.rotation = rotation;
            dragger.addChild(circle,label);
            stage.addChild(dragger);
            stage.setChildIndex(circle,1000000);

            stage.update();
            return dragger;
        }

        mousedown(evt) {
            function pressmove(evt) {
                // Calculate the new X and Y based on the mouse new position plus the offset.
                evt.currentTarget.x = evt.stageX + evt.currentTarget.offset.x;
                evt.currentTarget.y = evt.stageY + evt.currentTarget.offset.y;
                broadcastChannel.postMessage(['moveCircle',evt.currentTarget.id,
                                               evt.currentTarget.x,evt.currentTarget.y]); 
                // make sure to redraw the stage to show the change:
                stage.update();            
            }

            function pressrotate(evt) {
                if (evt.currentTarget.oldRotationX && evt.currentTarget.oldRotationY) {
                    //Do the math to find the angle of the movement relative to the original shape
                    let delta = [evt.stageX - evt.currentTarget.oldRotationX,evt.stageY - evt.currentTarget.oldRotationY];
                    let deltaLength = Math.pow(Math.pow(delta[0],2)+Math.pow(delta[1],2),.5);
                    let referenceVector = [evt.currentTarget.oldRotationX - evt.currentTarget.x, evt.currentTarget.oldRotationY - evt.currentTarget.y];
                    let referenceVectorLength = Math.pow(Math.pow(referenceVector[0],2)+Math.pow(referenceVector[1],2),.5);
                    let differenceVector = [referenceVector[0]-delta[0],referenceVector[1]-delta[1]];
                    let differenceVectorLength = Math.pow(Math.pow(differenceVector[0],2)+Math.pow(differenceVector[1],2),.5);
                    let angleBetween = Math.acos((Math.pow(referenceVectorLength,2)+Math.pow(deltaLength,2)-Math.pow(differenceVectorLength,2))/(2*deltaLength*referenceVectorLength));
                    let pi = 3.14159265;
                    // ArcCOS returns NAN when the angle is 90 degrees
                    if (!angleBetween) {
                        angleBetween = pi/2;
                    }
                    let projectedVectorLength = Math.cos((pi/2)-angleBetween)*deltaLength;
                    let deltaRotationAngle = Math.atan(projectedVectorLength/referenceVectorLength)*(360/(2*pi));

                    // calculate just the z component of the cross project between the delta and reference vectors
                    // This tells us if we should rotate the shape clockwise or counterclockwise
                    let crossZ = delta[0]*referenceVector[1] - delta[1]*referenceVector[0];
                    if (crossZ > 0) {
                        deltaRotationAngle = deltaRotationAngle*-1
                    }
                    evt.currentTarget.rotation = evt.currentTarget.rotation + deltaRotationAngle;
                    broadcastChannel.postMessage(['newRotation',evt.currentTarget.id,evt.currentTarget.rotation])
                }
                evt.currentTarget.oldRotationX = evt.stageX;
                evt.currentTarget.oldRotationY = evt.stageY;
                // make sure to redraw the stage to show the change:
                stage.update();            
            }
            // keep a record on the offset between the mouse position and the container
            // position. currentTarget will be the container that the event listener was added to: 
            evt.currentTarget.offset = {x: this.x - evt.stageX, y: this.y - evt.stageY};
            if (!evt.nativeEvent.altKey) {
                evt.currentTarget.tmpFunction = evt.currentTarget.on("pressmove",pressmove)
            } else {
                evt.currentTarget.tmpFunction = evt.currentTarget.on("pressmove",pressrotate)
            }
        }

        pressup(evt) {
            evt.currentTarget.off("pressmove",evt.currentTarget.tmpFunction)
            // console.log(evt.currentTarget._listeners);
        }

        makeMoveable () {
            this.moveable = true;
            this.dragObject.on("mousedown", this.mousedown);
            this.dragObject.on("pressup",this.pressup)
        }

        makeUnmoveable () {
            this.moveable = false;
            this.dragObject.removeAllEventListeners();
        }

        redraw() {
            stage.removeChild(this.dragObject);
            this.dragObject = this.drawNew(this.dragObject.x,this.dragObject.y,this.dragObject.rotation);
            if (this.moveable) {
                this.makeMoveable();
            };
        }

        remove() {
            stage.removeChild(this.dragObject);
            stage.update()
        }

        updateLocation(x,y) {
            this.dragObject.x = x;
            this.dragObject.y = y;
            stage.update()
        }

        updateRotation(rot) {
            this.dragObject.rotation = rot;
            stage.update();
        }

        findTransformationMatrix(keepOrignalProportions=true) {
            //Transformation matrix applied when the image is converted to a dragable token
            //We want this to reduce the image's size and appropriate amount
            // new createjs.Matrix2D(a,b,c,d,tx,ty)
            // a: less than one shrinks y axes, more than 1 streches it
            // b: unknown. leave at default of 0
            // c: unknown. leave at default of 0
            // d: less than one shrinks x axes, more than 1 streches it
            // tx: horizontally shift
            // ty: vertically shift

            let circleRadiusInPx = this.circleRadius*globs.pxPerFoot;
            let xRescaler = 1/(this.image.width/(circleRadiusInPx*2));
            let yRescaler = 1/(this.image.height/(circleRadiusInPx*2));
            
            if (keepOrignalProportions) {
                if (xRescaler > yRescaler) {
                    xRescaler = yRescaler;
                } else if (yRescaler > xRescaler) {
                    yRescaler = xRescaler;
                }
            }
            this.transformationMatrix = new createjs.Matrix2D(xRescaler,0,0,yRescaler,-1*circleRadiusInPx,-1*circleRadiusInPx);
            return [xRescaler,yRescaler]
        }
        preprocessImage (file) {
            function handleImageCompression (result,passThroughVariable) {
                function handlePreprocess () {
                    let circleHandle = globs.circleHandles[this.id];
                    circleHandle.processCustomImageLoad(); //Now that the image is ready, make sure that it's loaded ev÷erywhere
                    }
                let circle = globs.circleHandles[passThroughVariable].namedSubElements.circle;
                circle.compressedImage = result;

                circle.image = new Image();
                circle.image.id = passThroughVariable;
                circle.image.src = URL.createObjectURL(result);
                circle.image.onload = handlePreprocess;
                circle.imageFile = result;
            }
            compressImageFile(file,this.circleRadius*2,handleImageCompression,this.id);
        }

        upload () {
            function handleUpload (event) {
                let circle = globs.circleHandles[this.id].namedSubElements.circle;
                let uploadedFile = event.target.files[0];
                if (circle.windowLocation === 'main') {
                    broadcastChannel.postMessage(["manuallyAppendImage",circle.id,uploadedFile]);
                circle.preprocessImage(uploadedFile);
                }
            }
        let element = document.createElement('input');
        element.setAttribute('type', 'file');
        element.style.display = 'none';
        element.id = this.id;
        element.onchange = handleUpload;
        document.body.appendChild(element);
        element.click();
        document.body.removeChild(element);
        }

        manuallyAppendImageFile (file) {
            //For use with the player view window
            this.preprocessImage(file);
        }
}

function setupCanvas () {
    let widthAndHeight = findCanvasScale();
    globs.canvasX = widthAndHeight[0];
    globs.canvasY = widthAndHeight[1];

    let canvas = document.getElementById('canvas');
    canvas.width = globs.canvasX;
    canvas.height = globs.canvasY;

    globs.newCircleX = canvas.width/2;
    globs.newCircleY = canvas.height/2;

    let ticker = createjs.Ticker.addEventListener("tick", handleTick);
    createjs.Ticker.framerate = 10; //set the framerate in frames per second
    function handleTick(event) {
    // Actions carried out each tick (aka frame)
        if (!event.paused) {
            // Actions carried out when the Ticker is not paused.
            if (globs.canvasNeedsUpdate) {
                _updateCanvas();
            }
        }
    }
}

function findCanvasScale () {
    let height; let width;
    if (window.innerWidth > window.innerHeight*(16/9)) {
        height = window.innerHeight;
        width = window.innerHeight*(16/9);
    } else {
        height = window.innerWidth*(9/16);
        width = window.innerWidth;
    }
    if (globs.windowLocation === 'main') {
        if (width > 576) {
            //Styling for desktops
            width = width*.5;
            height = height*.5;
        } else {
            //Styling for phones
            width = width*.9;
            height = height*.9;
        }
        return [width,height];
    } else if (globs.windowLocation === 'encounterMap') {
        return [width,height];
    } else {
        console.log(globs.windowLocation+'not recognized');
    }
}

function resizeCanvas () {
    let widthAndHeight = findCanvasScale();
    let width = widthAndHeight[0];
    let height = widthAndHeight[1];

    globs.newCircleX = width/2;
    globs.newCircleY = height/2;

    if (!globs.lastResizeCanvasWidth) {
        globs.lastResizeCanvasWidth = globs.canvasX; //when the page loads, these two are equal
    }
    globs.canvasResizeFactor = globs.canvasResizeFactor*(width/globs.lastResizeCanvasWidth);

    globs.lastResizeCanvasWidth = width;
    _updateCanvas();
}

function loadMapImage(mapImage) {
    function handleImageCompression (result) {
        
        var image = new Image();
        image.src = URL.createObjectURL(result);
        image.onload = handleImageLoad;

        globs.imageSrc = result;

    }
    if (globs.backgroundBitmap) {
        stage.removeChild(globs.backgroundBitmap);
    }

    compressImageFile(mapImage,100,handleImageCompression);
}

function handleImageLoad(event) {
    var image = event.target;
    var bitmap = new createjs.Bitmap(image);
    stage.addChild(bitmap);
    globs.backgroundBitmap = bitmap;
    updateCanvas();
}

function updateGrid(gridDrawn,pxPerFoot) {
    _updateGrid(gridDrawn,pxPerFoot);
    updateCanvas()
}

function _updateGrid(gridDrawn,pxPerFoot) {
    if (gridDrawn) {
        globs.grid.removeGrid(); //remove grid if it exists
        globs.grid.drawGrid(pxPerFoot);
        globs.gridDrawn = true;
    } else {
        globs.grid.removeGrid();
        globs.gridDrawn = false;
    }
}

function updateCanvasScale (pxPerFoot) {
    globs.pxPerFoot = pxPerFoot;
    updateCanvas()
}

function redrawCircles() {
    for (let i = 0; i < globs.circleHandles.length; i += 1) {
        circleHandle = globs.circleHandles[i]
        if (circleHandle) {
            if (!circleHandle.namedSubElements.circle.needsRedraw) { 
            // If the redraw flag is set, this circle is waiting for an image to uploaded. It shouldn't be redrawn by an update
                let circle = circleHandle.namedSubElements.circle;
                let oldX = circle.dragObject.x; let oldY = circle.dragObject.y;
                circle.updateLocation(oldX*globs.canvasResizeFactor,oldY*globs.canvasResizeFactor);
                circleHandle.redraw()
            }
        }
    }
}

function redrawLines() {
    for (let i = 0; i < drawer.lineSegments.length; i += 1) {
        line = drawer.lineSegments[i]
        if (line) {
            let g = globs.canvasResizeFactor;
            line.updateLocation(line.startX*g,line.endX*g,line.startY*g,line.endY*g);
            line.redraw()
        }
    }  
}

function redrawMeasurer () {
    if (measurer.currentLine) {
        let g = globs.canvasResizeFactor;
        measurer.redrawMeasurer(measurer.currentLine.startX*g,measurer.currentLine.endX*g,
                                measurer.currentLine.startY*g,measurer.currentLine.endY*g,);
    }
}

function resizeBackgroundImage () {
    if (globs.backgroundBitmap) {
        let width = globs.backgroundBitmap.getBounds().width;
        let height = globs.backgroundBitmap.getBounds().height;

        let rescaleFactor;
        let xRescaleFactor = globs.canvasX/width;
        let yRescaleFactor = globs.canvasY/height;

        if (xRescaleFactor < yRescaleFactor) {
            rescaleFactor = xRescaleFactor;
        } else {
            rescaleFactor = yRescaleFactor;
        }
``
        globs.backgroundBitmap.scaleX = rescaleFactor;
        globs.backgroundBitmap.scaleY = rescaleFactor;

        globs.backgroundBitmap.x = (globs.canvasX - width*rescaleFactor)/2;
        globs.backgroundBitmap.y = (globs.canvasY - height*rescaleFactor)/2;

        stage.update();
    }
}

function drawNewCircle(circleDiameter,circleColor,circleText,windowLocation,circleType,notes="",circleImage=null) {
    _drawNewCircle(circleDiameter,circleColor,circleText,windowLocation,circleType,notes,circleImage);
    updateCanvas();
}

function _drawNewCircle(circleDiameter,circleColor,circleText,windowLocation,circleType,notes,circleImage) {
    if (circleImage) {
        askUserForFile = false;
    } else {
        askUserForFile = true;
    }

    // Divide my 2 to account for the conversion from diameter to radius
    circle = new DraggableCircle(circleDiameter * 1/2,circleColor,circleText,windowLocation,globs.circleHandles.length,circleType,askUserForFile);
    let circleHandle = new SymbolHandle(circle,globs.circleHandles.length,notes);
    globs.circleHandles.push(circleHandle);  
    if (circleImage) {
        circleHandle.manuallyAppendImageFile(circleImage);
    }
}

function updateCanvas() {
    //Sets the canvas to be updated the next time the ticker comes around
    globs.canvasNeedsUpdate = true;
}

function _updateCanvas() {
    //If the window size has changed, update the canvas scale to match
    globs.pxPerFoot = globs.pxPerFoot*globs.canvasResizeFactor;
    if (globs.windowLocation === 'main') {
        //janky call to functions defined in index.html
        document.getElementById("canvasScale").value = globs.pxPerFoot;
        updateCanvasScaleLabel();
    }

    //Call to make sure that everything in the canvas is setup correctly and drawn in the right order
    setupCanvas();
    resizeBackgroundImage();
    _updateGrid(globs.gridDrawn,globs.pxPerFoot);
    redrawLines();
    redrawCircles();    
    redrawMeasurer();
    stage.update()
    globs.canvasResizeFactor = 1;
    globs.canvasNeedsUpdate = false;
}

function clearCanvas() {
    _clearCanvas();
    broadcastChannel.postMessage(['clearCanvas']);
}

function _clearCanvas() {
    for (let i=0; i < globs.circleHandles.length; i+=1) {
        let circleHandle = globs.circleHandles[i];
        if (circleHandle) {
            circleHandle.removeFromButton();
        }
    }

    stage.removeAllChildren();
    drawer.lineSegments = [];
    measurer.currentLine = null;
    globs.circleHandles = [];
    globs.imageSrc = null;
    globs.backgroundBitmap = null;
    
    updateCanvas();
}

function compressImageFile(file,sizeInFeet,successFunction,passThroughVariable=null) {
    if (globs.imageCompression) {
        let width = sizeInFeet*60 //Set each foot on the map to be represented by 15 pixels. This may need tweaking
        let compressionSettings = {quality: 0.7,
                                   maxHeight: 2000,
                                   maxWidth: 2000,
                                   width:width,
                                   success(result) {
                                       successFunction(result,passThroughVariable);
                                   },
                                   error(err) {
                                       console.log(err.message);
                                   }};

        new Compressor(file, compressionSettings);
    } else {
        successFunction(file,passThroughVariable);
    }
}

//Begin code for switching between the canvas' various modes
function disableCurrentMode() {
    if (globs.canvasMode === 'circleMoving') {
        circleMover.disableMoving();
        globs.canvasMode = null;
    } else if (globs.canvasMode === 'lineDrawing') {
        drawer.disableDrawing();
        globs.canvasMode = null;
    } else if (globs.canvasMode === "measuring") {
        measurer.disableMeasuring();
        globs.canvasMode = null;
    } else if (globs.canvasMode === "lineErasing") {
        eraser.disableErasing();
        globs.canvasMode = null;
    } else {
        console.log('Cannot dissable canvas mode '+globs.canvasMode);
        foo
    }
}

//Code for enabling/disabling circle moving on the canvas
circleMover = {
    enableMoving: function () {
        if (globs.canvasMode) {
            console.log('Cant start moving mode while another mode is active!');
            foo
        }
        for (let i=0;i<globs.circleHandles.length;i+=1) {
            if (globs.circleHandles[i]) {
                let circle = globs.circleHandles[i].namedSubElements.circle;
                circle.makeMoveable();
            }
        }
        globs.canvasMode = 'circleMoving';
    },

    disableMoving: function () {
        for (let i=0;i<globs.circleHandles.length;i+=1) {
            if (globs.circleHandles[i]) {
                let circle = globs.circleHandles[i].namedSubElements.circle;
                circle.makeUnmoveable();
            }
        }
    }
}

function circleMoving () {
    disableCurrentMode();
    circleMover.enableMoving();
}

//Code for enabling/disabling drawing on the canvas
class LineSegment {
        constructor(startX,endX,startY,endY,width,color,dashed=false) {
            this.startX = startX;
            this.endX = endX;
            this.startY = startY;
            this.endY = endY;
            this.width = width;
            this.color = color;
            this.dashed = dashed;

            this.removed = false;

            this.drawNew();
        }

        drawNew () {
            let line = new createjs.Shape();
            line.graphics.setStrokeStyle(this.width, 'round', 'round');
            if (this.dashed) {
                line.graphics.setStrokeDash([5, 5], 0);
            }
            line.graphics.beginStroke(this.color);
            line.graphics.moveTo(this.startX,this.startY);
            line.graphics.lineTo(this.endX,this.endY);
            stage.addChild(line);
            stage.setChildIndex(line,1000);
            stage.update();

            this.lineSegment = line;
        }

        redraw () {
            let a = stage.removeChild(this.lineSegment);
            this.drawNew();
        }

        remove() {
            stage.removeChild(this.lineSegment);
            this.removed = true;
        }

        updateLocation (startX,endX,startY,endY) {
            this.startX = startX;
            this.endX = endX;
            this.startY = startY;
            this.endY = endY;
        }
}

drawer = {
    lineSegments:[],
    oldPt:null,
    newPt:null,

    handleDrawMouseDown: function (event) {
        drawer.oldPt = [stage.mouseX,stage.mouseY];
        stage.addEventListener("stagemousemove", drawer.handleDrawMouseMove);;
    },

    handleDrawMouseMove: function (event) {
        width = document.getElementById("drawSize").value;
        color = document.getElementById("drawColor").value;
        drawer.newPt = [stage.mouseX,stage.mouseY];
        drawer.drawLine(drawer.oldPt[0],drawer.newPt[0],drawer.oldPt[1],drawer.newPt[1],width,color);
        drawer.oldPt = drawer.newPt;
    },

    handleDrawMouseUp: function (event) {
        stage.removeEventListener("stagemousemove", drawer.handleDrawMouseMove);
    },

    drawLine: function (startX,endX,startY,endY,width,color) {
        let line = new LineSegment(startX,endX,startY,endY,width,color);
        broadcastChannel.postMessage(['drawLine',drawer.oldPt[0],drawer.newPt[0],drawer.oldPt[1],
                                       drawer.newPt[1],width,color]);
        drawer.lineSegments.push(line);
    },

    enableDrawing: function () {
        if (globs.canvasMode) {
            console.log('Cant start drawing mode while another mode is active!');
            foo
        }
        globs.canvasMode = 'lineDrawing';
        stage.addEventListener("stagemousedown", this.handleDrawMouseDown);
        stage.addEventListener("stagemouseup", this.handleDrawMouseUp);
    },

    disableDrawing: function () {
        stage.removeEventListener("stagemousedown", this.handleDrawMouseDown);
        stage.removeEventListener("stagemouseup", this.handleDrawMouseUp);
    },

    eraseAllLines: function () {
        for (let i=0; i<drawer.lineSegments.length; i+=1) {
            stage.removeChild(drawer.lineSegments[i].lineSegment);
        }
        stage.update()
        drawer.lineSegments = [];
    }
}

function lineDrawing () {
    disableCurrentMode();
    drawer.enableDrawing();
}

function eraseAllLines () {
    if (drawer.lineSegments.length > 0) {
        drawer.eraseAllLines();
        broadcastChannel.postMessage(['eraseAllLines'])
    }
}

function drawSingleLine (startX,endX,startY,endY,width,color) {
    let line = new LineSegment(startX,endX,startY,endY,width,color);
    drawer.lineSegments.push(line);
}

//Code for enabling/disabling erasing on the canvas
class LocalEraser {
        constructor(x,y,radius) {
            //x and y positions in px
            //radius in px
            this.x = x;
            this.y = y;
            this.radius = radius;

            this.createNew();
        }
        
        createNew() {
            let circle = new createjs.Shape();
            let circleRadiusInPx = this.circleRadius*globs.pxPerFoot;

            // Circle with x coord, y coord, and radius
            circle.graphics.beginFill('rgba(155,155,155,.5)').drawCircle(this.x, this.y, this.radius);
            stage.addChild(circle);

            this.eraser = circle;
        }

        remove() {
            stage.removeChild(this.eraser);
        }
        
}

eraser = {
    currentEraser: null,

    handleDrawMouseDown: function (event) {
        let width = document.getElementById("drawSize").value*5;
        eraser.createEraser(stage.mouseX,stage.mouseY,width);
        stage.addEventListener("stagemousemove", eraser.handleDrawMouseMove);
    },

    handleDrawMouseMove: function (event) {
        let width = document.getElementById("drawSize").value*5;
        eraser.createEraser(stage.mouseX,stage.mouseY,width);
    },

    handleDrawMouseUp: function (event) {
        stage.removeEventListener("stagemousemove", eraser.handleDrawMouseMove);
    },

    createEraser: function (x,y,radius) {
        if (eraser.currentEraser) {
            eraser.currentEraser.remove();
        }
        eraser.currentEraser = new LocalEraser(x,y,radius);
        eraser.eraseLines();
        stage.update();
    },

    eraseLines: function () {
        function distance(point1,point2) {
            return Math.sqrt(Math.pow(point1[0]-point2[0],2)+Math.pow(point1[1]-point2[1],2))
        };

        //Pre-filter the lines in the hopes of speeding this up
        let trimmedLineSegments = [];
        let originalLineIndexes = [];
        let lowerX = eraser.currentEraser.x - eraser.currentEraser.radius;
        let upperX = eraser.currentEraser.x + eraser.currentEraser.radius;
        let lowerY = eraser.currentEraser.y - eraser.currentEraser.radius;
        let upperY = eraser.currentEraser.y + eraser.currentEraser.radius;
        for (let i=0; i<drawer.lineSegments.length; i+=1) {
            let lineSegment = drawer.lineSegments[i];
            if (lineSegment.startX > lowerX && lineSegment.startX < upperX && lineSegment.startY > lowerY && lineSegment.startY < upperY) {
                trimmedLineSegments.push(lineSegment);
                originalLineIndexes.push(i);
            } else if (lineSegment.endX > lowerY && lineSegment.endX < upperY && lineSegment.endY > lowerY && lineSegment.endY < upperY) {
                trimmedLineSegments.push(lineSegment);
                originalLineIndexes.push(i);
            }
        }

        for (let i=0; i<trimmedLineSegments.length; i+=1) {
            let lineSegment = trimmedLineSegments[i];
            let originalIndex = originalLineIndexes[i];
            let lineStart = [lineSegment.startX,lineSegment.startY];
            let lineEnd = [lineSegment.endX,lineSegment.endY];
            let eraserLocation = [eraser.currentEraser.x,eraser.currentEraser.y];
            
            let shortestDistance = Math.min(distance(lineStart,eraserLocation),distance(lineEnd,eraserLocation));
            if (shortestDistance < eraser.currentEraser.radius) {
                lineSegment.remove();
                broadcastChannel.postMessage(['removeLineSegment',originalIndex])
                stage.update();
            }
        }

        cleanUpNullLines();
        broadcastChannel.postMessage(['cleanUpNullLines']);

    },

    enableErasing: function () {
        if (globs.canvasMode) {
            console.log('Cant start drawing mode while another mode is active!');
            foo
        }
        globs.canvasMode = 'lineErasing';
        stage.addEventListener("stagemousedown", this.handleDrawMouseDown);
        stage.addEventListener("stagemouseup", this.handleDrawMouseUp);
    },

    disableErasing: function () {
        if (eraser.currentEraser) {
            eraser.currentEraser.remove();
        }
        stage.update();
        stage.removeEventListener("stagemousedown", this.handleDrawMouseDown);
        stage.removeEventListener("stagemouseup", this.handleDrawMouseUp);
    }
}

function lineErasing() {
    disableCurrentMode();
    eraser.enableErasing();
}

function cleanUpNullLines() {
    let indexesToRemove = [];
    for (let i=0; i<drawer.lineSegments.length; i+=1) {
        if (drawer.lineSegments[i].removed) {
            indexesToRemove.push(i);
        }
    }
    for (let i=indexesToRemove.length-1; i>=0; i-=1) {
        indexToRemove = indexesToRemove[i];
        drawer.lineSegments.splice(indexToRemove,1);
        stage.update();
    }
}

//Code for enabling/disabling measuring on the canvas
class MeasureLine extends LineSegment {
    constructor (startX,endX,startY,endY,offsetLength=15) {
        //offset is the distance between the line and the text, in px
        super(startX,endX,startY,endY,2,"gray",true)
        this.startX = startX;
        this.endX = endX;
        this.startY = startY;
        this.endY = endY;
        this.offsetLength = offsetLength;

        this.calculateLength();
        this.drawText();

        let dragger = new createjs.Container();
        dragger.addChild(this.rectangle);
        dragger.addChild(this.text);

        this.visibleText = dragger;
        stage.addChild(dragger);
        stage.update();
    }

    drawText () {
        let textX = (this.startX+this.endX)/2.;
        let textY = (this.startY+this.endY)/2.;

        let rise = (this.endY-this.startY);
        let run = (this.endX-this.startX);
        let offsetSlope = -1*(run/rise);
        let offsetX = 1; let offsetY = offsetSlope;
        let offsetNorm = Math.pow((Math.pow(offsetX,2)+Math.pow(offsetY,2)),.5)
        offsetX = offsetX/offsetNorm; offsetY = offsetY/offsetNorm;
        offsetX = offsetX*this.offsetLength; offsetY = offsetY*this.offsetLength;

        //Handle cases where the offset is nan
        if ((!offsetX && !offsetY) && run > 0) {
            offsetX = 0; offsetY = -1*this.offsetLength;
        } else if ((!offsetX && !offsetY) && run < 0) {
            offsetX = 0; offsetY = this.offsetLength;
        }

        //Set so the number is always clockwise relative to the line
        if (rise < 0) {
            offsetX = -1*offsetX; offsetY = -1*offsetY;
        }

        textX = textX + offsetX; textY = textY +offsetY;

        let text = new createjs.Text(this.length+'ft', "bold 14px Garamond");
        text.x = textX;
        text.y = textY;
        text.textAlign = 'center';
        text.textBaseline = 'middle';
        this.text = text;

        let rectangleBounds = text.getBounds();
        let rectangle = new createjs.Shape()
        rectangle.graphics.beginFill("white").drawRect(rectangleBounds.x+text.x-2,rectangleBounds.y+text.y-2,
                                                 rectangleBounds.width+4,rectangleBounds.height)
        this.rectangle = rectangle;
        stage.addChild(rectangle);
        return text;
    }

    calculateLength () {
        let rise = (this.endY-this.startY);
        let run = (this.endX-this.startX);

        length = Math.pow((Math.pow(rise,2)+Math.pow(run,2)),.5);
        this.length = Math.round(length/globs.pxPerFoot);
    }
}

measurer = {
    currentLine: null,
    oldPt:null,
    newPt:null,

    handleDrawMouseDown: function (event) {
        measurer.oldPt = [stage.mouseX,stage.mouseY];
        stage.addEventListener("stagemousemove", measurer.handleDrawMouseMove);
    },

    handleDrawMouseMove: function (event) {
        measurer.newPt = [stage.mouseX,stage.mouseY];
        eraseMeasurer();
        measurer.drawLine(measurer.oldPt[0],measurer.newPt[0],measurer.oldPt[1],measurer.newPt[1]);
    },

    handleDrawMouseUp: function (event) {
        stage.removeEventListener("stagemousemove", measurer.handleDrawMouseMove);
    },

    drawLine: function (startX,endX,startY,endY) {
        let line = new MeasureLine(startX,endX,startY,endY);
        broadcastChannel.postMessage(['drawMeasurer',startX,endX,startY,endY]);
        measurer.currentLine = line;
    },

    enableMeasuring: function () {
        if (globs.canvasMode) {
            console.log('Cant start drawing mode while another mode is active!');
            foo
        }
        globs.canvasMode = 'measuring';
        stage.addEventListener("stagemousedown", this.handleDrawMouseDown);
        stage.addEventListener("stagemouseup", this.handleDrawMouseUp);
    },

    disableMeasuring: function () {
        stage.removeEventListener("stagemousedown", this.handleDrawMouseDown);
        stage.removeEventListener("stagemouseup", this.handleDrawMouseUp);
        eraseMeasurer();
        broadcastChannel.postMessage(['eraseMeasurer'])
    },

    redrawMeasurer (startX=this.currentLine.startX,endX=this.currentLine.startY,startY=this.currentLine.endX,endY=this.currentLine.endY) {
        eraseMeasurer();
        this.drawLine(startX,endX,startY,endY);
    }
}

function measureMode () {
    disableCurrentMode();
    measurer.enableMeasuring();
}

function drawSingleMeasurer (startX,endX,startY,endY) {
    eraseMeasurer();
    let line = new MeasureLine(startX,endX,startY,endY);
    measurer.currentLine = line;
    stage.update();
}

function eraseMeasurer () {
    if (measurer.currentLine) {
        stage.removeChild(measurer.currentLine.lineSegment);
        stage.removeChild(measurer.currentLine.visibleText);
        stage.update();
        measurer.currentLine = null;
    }
}
