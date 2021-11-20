class DynamicDiv {
    constructor (id) {
        this.subElements = [];
        this.visible = true;

        this.div = document.createElement("div");
        this.div.classList.add("dynamicDiv");
        if (document.getElementById(id)) {
            document.getElementById(id).appendChild(this.div);
        }
    }

    addDiv () {
        let localDiv = document.createElement("div");
        this.subElements.push(localDiv);
        this.div.appendChild(localDiv);
        return localDiv;
    }

    addText (innerHTML="") {
        let localP = document.createElement("p");
        localP.innerHTML = innerHTML;
        this.subElements.push(localP);
        this.div.appendChild(localP);
        return localP;
    }

    addButton (innerHTML="") {
        let localButton = document.createElement("button");
        localButton.innerHTML = innerHTML;
        this.subElements.push(localButton);
        this.div.appendChild(localButton);
        localButton.classList.add('dynamicButton')
        return localButton;
    }

    addTextbox (value="") {
        let localBox = document.createElement("input");
        localBox.type="text";
        localBox.value= value;
        localBox.classList.add('textbox');
        this.subElements.push(localBox);
        this.div.appendChild(localBox);
        return localBox;        
    }

    addSlider (value=0) {
        let localSlider = document.createElement("input");
        localSlider.type = "range";
        localSlider.min = 0;
        localSlider.max = 50;
        localSlider.value = 0;
        this.subElements.push(localSlider);
        this.div.appendChild(localSlider);
        return localSlider
    }

    hide () {
        this.visible = false;
        this.div.style.display = "none";
    }

    show () {
        this.visible = true;
        this.div.style.display = "block";
    }

    toggleVisible () {
        if (this.visible) {
            this.hide()
        } else {
            this.show()
        }
    }
}

class SymbolHandle extends DynamicDiv {
    constructor (circle, id, notes) {
        super("symbolMenu");
        this.namedSubElements = {};
        this.namedSubElements.circle = circle;
        this.id = id;
        this.tokenImage = null;
        this.tokenHandle = null;

        this.addTokenHandle(this.namedSubElements.circle.circleColor,this.namedSubElements.circle.circleType);


        //Currently the width of the Symbol manager is 18em and the height is 2.7em
        //1% of width corresponds to 6.67% of height
        let labelbox = this.addTextbox();
        labelbox.style.position = "absolute";
        labelbox.style.left = "2.5em";  
        labelbox.style.width = "2.2em";  
        labelbox.style.top = ".1em"
        labelbox.oninput = this.labelChangeListener;
        labelbox.value = this.namedSubElements.circle.circleText;
        this.namedSubElements.labelbox = labelbox;

        let label = this.addText('Label');
        label.style.position = "absolute";
        label.style.left = "2.5em";
        label.style.width = "2.2em";
        label.style.top = "2em"
        label.style.color = "rgb(130,130,130)";
        label.style.textAlign = "center";
        label.style.fontSize = "small";
        this.namedSubElements.label = label;

        let notesBox = this.addTextbox();
        notesBox.style.position = "absolute";
        notesBox.style.left = "5.5em";
        notesBox.style.width = "12em";

        notesBox.style.top = ".1em"
        notesBox.value = notes;
        this.namedSubElements.notesBox = notesBox;

        let notesLabel = this.addText('Notes');
        notesLabel.style.position = "absolute";
        notesLabel.style.left = "5.5em";
        notesLabel.style.width = "12em";
        notesLabel.style.top = "2em";
        notesLabel.style.color = "rgb(130,130,130)";
        notesLabel.style.textAlign = "center";
        notesLabel.style.fontSize = "small";
        this.namedSubElements.notesLabel = notesLabel;

        let button = this.addButton("");
        button.classList.add('deleteButton');
        button.id = this.id;
        button.onclick = this.removeFromButton;
        this.namedSubElements.button = button;
    }

    addTokenHandle(color='blue',type='circle') {
        let circle = this.addDiv();
        if (type === 'circle') {
            circle.classList.add("circleHandle");
            circle.style.backgroundColor = color;
        } else if (type === 'square') {
            circle.classList.add("squareHandle");
            circle.style.backgroundColor = color;
        } else if (type === 'cone') {
            circle.classList.add("coneHandle");
            circle.style.borderRight = `${1.25}em solid ${color}`;
        } else if (type === 'custom') {
            circle.classList.add("squareHandle")
            this.tokenImage = new Image();
            this.tokenImage.id = this.id;
            circle.appendChild(this.tokenImage);
        } else if (type === 'customCircle') {
            circle.classList.add("circleHandle")
            circle.classList.add("centering") //centers the token in the div, so that it gets cutoff as expected
            this.tokenImage = new Image();
            this.tokenImage.id = this.id;
            circle.appendChild(this.tokenImage);
        } else {
            console.log('Circle type not recognized for dynamic div handle! '+this.namedSubElements.circle.circleType )
        }
        this.tokenHandle = circle;
    }

    redraw () {
        //Redraws the circle, updating the text to match 
        let updatedText = this.namedSubElements.labelbox.value;
        if (!updatedText) {
            updatedText = "";
        } else if (updatedText.length > 2) {
            updatedText = updatedText.slice(0,2);
        }
        this.namedSubElements.circle.circleText = updatedText;
        this.namedSubElements.circle.redraw();
    }

    labelChangeListener () {
        redrawCircles();
        postLabels();
    }

    removeFromButton () {
        // Hacky solution to getting this object since .this refers to the button pressed
        let thisSymbolHandle = globs.circleHandles[this.id]
        thisSymbolHandle.removeCircle();
        thisSymbolHandle.removeHandle();
        thisSymbolHandle.removeFromMasterList();
        broadcastChannel.postMessage(['removeCircle',this.id]);
    }

    removeCircle () {
        this.namedSubElements.circle.remove();
    }

    removeHandle () {
        this.div.remove();
    }

    removeFromMasterList () {
        globs.circleHandles[this.id] = null;
    }

    updateLocation (x,y) {
        this.namedSubElements.circle.updateLocation(x,y);
    }

    updateRotation (rot) {
        this.namedSubElements.circle.updateRotation(rot);
    }

    processCustomImageLoad () {
        if (this.namedSubElements.circle.needsRedraw) {
            this.namedSubElements.circle.redraw();
        }

        function loadImageToken() {
            circleHandle = globs.circleHandles[this.id];
            let divHeight = circleHandle.tokenHandle.clientHeight;
            let divWidth = circleHandle.tokenHandle.clientWidth;

            this.height = divHeight;
            this.width = divWidth;
        }
        this.tokenImage.src = URL.createObjectURL(this.namedSubElements.circle.imageFile);
        this.tokenImage.onload = loadImageToken;
    }

    manuallyAppendImageFile (file) {
        this.namedSubElements.circle.manuallyAppendImageFile(file);
    }
}

class MusicHandle extends DynamicDiv {
    constructor (musicObject, id) {
        super("musicMenu");
        this.namedSubElements = {};
        this.file = musicObject.file;
        this.name = musicObject.name;
        this.playlist = musicObject.playlist;
        this.audioObject = null;
        this.id = id;
        this.currentTime = 0.;
        this.active = false;
        this.duration = null;

        if (this.name.length > 20) {
            this.shortName = this.name.slice(0,17)+'...';
        } else {
            this.shortName = this.name;
        }

        this.div.classList.add("indented");
        this.div.style.height = "3.5em";

        let playButton = this.addButton("");
        playButton.classList.add('playButton');
        playButton.id = this.id;
        playButton.onclick = this.startMusicFromButton;
        this.namedSubElements.playButton = playButton;

        let pauseButton = this.addButton("")
        pauseButton.classList.add('pauseButton');
        pauseButton.onclick = this.stopMusicFromButton;
        pauseButton.id = this.id;
        this.namedSubElements.pauseButton = pauseButton;

        let songName = this.addText(this.shortName);
        songName.classList.add("songName");
        this.namedSubElements.songName = songName;

        let songSlider = this.addSlider();
        songSlider.classList.add('songProgressBar');
        songSlider.id = this.id;
        songSlider.onchange = this.updateSongTimeFromSlider;
        songSlider.oninput = this.activelyMovingSlider;
        songSlider.value = this.currentTime;
        this.namedSubElements.songSlider = songSlider;

        let songCurrentPosition = this.addText('0:00');
        songCurrentPosition.classList.add('songCurrentPosition');
        this.namedSubElements.songCurrentPosition = songCurrentPosition;

        let songTotalLength = this.addText('0:00');
        songTotalLength.classList.add('songTotalLength');
        this.namedSubElements.songTotalLength = songTotalLength;

        this.hide();
    }

    startMusic(inputFromSlider=false,cancelActivePlaylists=true) {
        if (globs.musicManager.activeMusicHandle) {
            globs.musicManager.activeMusicHandle.stopMusic()
        }
        if (cancelActivePlaylists && globs.musicManager.activePlaylistHandle) {
            globs.musicManager.activePlaylistHandle.stop()
        }
        //If you play a song that's already at it's end, reset to it's beginning
        if (this.duration && !inputFromSlider) {
            if (2. > (this.duration-this.currentTime)) {
                this.updateSongTime(0)
            }
        }
        globs.musicManager.activeMusicHandle = this;

        globs.musicManager.activeAudio.src = URL.createObjectURL(this.file);
        globs.musicManager.activeAudio.load()
        globs.musicManager.activeAudio.currentTime = this.currentTime;

        this.active = true
        this.div.style.backgroundColor = "rgba(50,100,205,.1)";
        globs.musicManager.activeAudio.play();
    }

    startMusicFromButton(event) {
        let musicHandle = globs.musicManager.musicHandles[this.id];
        musicHandle.startMusic();
    }

    stopMusic() {
        if (this.active) {
            this.div.style.backgroundColor = "rgb(240,240,240)";
            this.active = false
            globs.musicManager.activeAudio.pause();
            if (globs.musicManager.activePlaylistHandle) {
                globs.musicManager.activePlaylistHandle.stop()
            }
        }
    }
    stopMusicFromButton(event) {
        let musicHandle = globs.musicManager.musicHandles[this.id];
        musicHandle.stopMusic();
    }

    updateSongTime(seconds) {
        //Sets the slider to the given value. Value is seconds as a number
        //Also sets the time object of this music id to match
        this.namedSubElements.songSlider.value = seconds;
        this.currentTime = seconds;
        this.updateCurrentTimeLabel(seconds);
    }

    updateDuration(seconds) {
        this.namedSubElements.songTotalLength.innerHTML = convertSecondsToMinutes(seconds);
        this.namedSubElements.songSlider.max = seconds;
        this.duration = seconds;
    }

    updateSongTimeFromSlider(event) {
        //When the slider changes, set the current music time to match
        let musicHandle = globs.musicManager.musicHandles[this.id];
        let sliderValue = musicHandle.namedSubElements.songSlider.value;

        musicHandle.currentTime = sliderValue;
        musicHandle.updateCurrentTimeLabel(sliderValue);
        //restart the music from the new time if it's the active song
        if (musicHandle.active) {
            musicHandle.startMusic(true)
        }
        musicHandle.unPauseAutoUpdates();
    }

    updateCurrentTimeLabel (seconds) {
        this.namedSubElements.songCurrentPosition.innerHTML = convertSecondsToMinutes(seconds);
    }

    activelyMovingSlider (event) {
        let musicHandle = globs.musicManager.musicHandles[this.id];
        musicHandle.pauseAutoUpdates();
        musicHandle.updateCurrentTimeLabel(musicHandle.namedSubElements.songSlider.value)
    }

    pauseAutoUpdates () {
        //Pause automatic slider updates to prevent them happening while we are moving the slider
        globs.musicManager.pauseAutoSliderUpdates = true;
    }

    unPauseAutoUpdates () {
        globs.musicManager.pauseAutoSliderUpdates = false;
    }
}

class PlaylistHandle extends DynamicDiv {
        constructor (musicObject,id) {
            super("musicMenu");
            this.playlist = musicObject.playlist;
            this.namedSubElements = {};
            this.id = id;
            this.active = false;

            if (this.playlist.length > 20) {
                this.shortName = this.playlist.slice(0,17)+'...'
            } else {
                this.shortName = this.playlist
            }

            let playlistExpanderButton = this.addButton("");
            playlistExpanderButton.classList.add('songExpander');
            playlistExpanderButton.onclick = this.toggleVisible;
            playlistExpanderButton.id = this.id;
            this.namedSubElements.playlistExpanderButton = playlistExpanderButton;

            let shufflePlay = this.addButton("");
            shufflePlay.classList.add('shufflePlay');
            shufflePlay.onclick = this.shufflePlaylistFromButton;
            shufflePlay.id = this.id;
            this.namedSubElements.shufflePlay = shufflePlay;

            let loopPlay = this.addButton("")
            loopPlay.classList.add('loopPlay');
            loopPlay.onclick = this.loopPlaylistFromButton;
            loopPlay.id = this.id;
            this.namedSubElements.loopPlay = loopPlay;

            let playlistName = this.addText(this.shortName);
            playlistName.classList.add("playlistName");
            this.namedSubElements.playlistName = playlistName;
        }

        shufflePlaylist () {
            if (globs.musicManager.activeMusicHandle) {
                globs.musicManager.activeMusicHandle.stopMusic();
            }
            this.start();
            let musicHandles = Array.from(globs.musicManager.categorizedPlaylists[this.playlist]);
            musicHandles = shuffle(musicHandles);
            musicHandles[0].startMusic(false,false)

            musicHandles.shift()
            globs.musicManager.songsToPlayNext = musicHandles;
        }

        shufflePlaylistFromButton (event) {
            let playlistHandle = globs.musicManager.playlistHandles[this.id];
            playlistHandle.shufflePlaylist()
        }

        loopPlaylist () {
            if (globs.musicManager.activeMusicHandle) {
                globs.musicManager.activeMusicHandle.stopMusic();
            }
            this.start();
            let musicHandles = Array.from(globs.musicManager.categorizedPlaylists[this.playlist]);
            musicHandles[0].startMusic(false,false)

            musicHandles.shift()
            globs.musicManager.songsToPlayNext = musicHandles;
        }

        loopPlaylistFromButton (event) {
            let playlistHandle = globs.musicManager.playlistHandles[this.id];
            playlistHandle.loopPlaylist();
        }

        start () {
            this.div.style.backgroundColor = "rgba(50,100,205,.1)";
            globs.musicManager.activePlaylistHandle = this;
            this.active = true;
        }

        stop () {
            if (this.active) {
                this.div.style.backgroundColor = "rgb(240,240,240)";
                globs.musicManager.activePlaylistHandle = null;
                this.active = false;
            }
        }

        toggleVisible (event) {
            let playlist = globs.musicManager.playlistHandles[this.id];
            let musicHandles = globs.musicManager.categorizedPlaylists[playlist.playlist];

            for (let i=0;i<musicHandles.length;i+=1) {
                musicHandles[i].toggleVisible()
            }
        }
    }