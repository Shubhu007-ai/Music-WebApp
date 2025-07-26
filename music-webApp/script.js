document.addEventListener('DOMContentLoaded', () => {
    const musicPlayer = document.querySelector('.music-player');
    const playBtn = document.getElementById('play');
    const prevBtn = document.getElementById('prev');
    const nextBtn = document.getElementById('next');
    const audio = document.getElementById('audio');
    const progressContainer = document.getElementById('progress-container');
    const progressBar = document.getElementById('progress-bar');
    const title = document.getElementById('title');
    const artist = document.getElementById('artist');
    const albumArt = document.getElementById('album-art');
    const currentTimeEl = document.getElementById('current-time');
    const durationEl = document.getElementById('duration');

    const playIcon = document.querySelector('.play-icon');
    const pauseIcon = document.querySelector('.pause-icon');

    const searchInput = document.getElementById('search-input');
    const songListElement = document.getElementById('song-list');

    const audioVisualizer = document.getElementById('audio-visualizer');
    const visualizerCtx = audioVisualizer.getContext('2d');
    let audioContext = null;
    let analyser = null;
    let source = null;
    let bufferLength;
    let dataArray;
    let animationFrameId;

    const togglePlaylistBtn = document.getElementById('toggle-playlist-btn');
    const playlistContainer = document.querySelector('.playlist-container');
    const playlistHeading = playlistContainer.querySelector('h3');

    const addFileBtn = document.getElementById('add-file-btn');
    const fileInput = document.getElementById('file-input');
    const toggleLibraryBtn = document.getElementById('toggle-library-btn');
    const libraryContainer = document.getElementById('library-container');
    const availableSongListElement = document.getElementById('available-song-list');

    const backToTopBtn = document.getElementById('back-to-top-btn');

    const allSongs = [
        { id: '1', title: 'Are You Okay', artist: 'Garry Sandhu', src: 'musics/Are You Ok.mp3', cover: 'music-thumbnails/Are_You_Okay.jpeg' },
        { id: '2', title: 'Banjara', artist: 'Mohammad Irfan', src: 'musics/Banjara.mp3', cover: 'music-thumbnails/Banjara.jpeg' },
        { id: '3', title: 'Ek Raat', artist: 'Vilen', src: 'musics/Ek Raat Vilen.mp3', cover: 'music-thumbnails/Ek_Raat.jpeg' },
        { id: '4', title: 'Enna Sona', artist: 'Arijit Singh', src: 'musics/Enna Sona.mp3', cover: 'music-thumbnails/Enna_Sona.jpeg' },
        { id: '5', title: 'Kya Hua Tera Wada', artist: 'Ashish Patil', src: 'musics/Kya Hua Tera Wada.mp3', cover: 'music-thumbnails/Kya_Hua_Tera Wada.jpeg' },
        { id: '6', title: 'Naja Naja', artist: 'Pav Dharia', src: 'musics/Na ja.mp3', cover: 'music-thumbnails/Naja.jpeg' },
        { id: '7', title: 'O Re Piya', artist: 'Rahat Fateh Ali Khan', src: 'musics/O Re Piya.mp3', cover: 'music-thumbnails/O_Re_Piya.jpeg' },
        { id: '8', title: 'Siyah', artist: 'Abdul Hanan', src: 'musics/Siyah.mp3', cover: 'music-thumbnails/Siyah.jpeg' },
        { id: '9', title: 'Suicide', artist: 'Sukh-E', src: 'musics/Suicide.mp3', cover: 'music-thumbnails/suicide.jpeg' },
    ];

    let userPlaylist = [...allSongs];
    let currentPlaylist;

    let songIndex = 0;

    const localFileUrls = new Map();

    function sortUserPlaylist() {
        const currentlyPlayingSongId = (songIndex !== -1 && userPlaylist.length > 0) ? userPlaylist[songIndex].id : null;
        userPlaylist.sort((a, b) => a.title.localeCompare(b.title));
        if (currentlyPlayingSongId !== null) {
            const newIndex = userPlaylist.findIndex(song => song.id === currentlyPlayingSongId);
            if (newIndex !== -1) {
                songIndex = newIndex;
            } else {
                songIndex = userPlaylist.length > 0 ? 0 : -1;
            }
        } else {
            songIndex = userPlaylist.length > 0 ? 0 : -1;
        }
    }

    function loadSong(indexInUserPlaylist) {
        if (indexInUserPlaylist < 0 || indexInUserPlaylist >= userPlaylist.length) {
            pauseSong();
            title.innerText = "No songs";
            artist.innerText = "Playlist empty";
            albumArt.src = "album-art-default.png";
            audio.src = "";
            currentTimeEl.textContent = "0:00";
            durationEl.textContent = "0:00";
            progressBar.style.width = "0%";
            songIndex = -1;
            return;
        }
        songIndex = indexInUserPlaylist;
        const song = userPlaylist[songIndex];
        title.innerText = song.title;
        artist.innerText = song.artist;
        audio.src = song.src;
        albumArt.src = song.cover;
        albumArt.style.transition = 'none';
        setTimeout(() => {
            albumArt.style.transition = 'transform 0.5s ease-in-out';
        }, 50);
        updateActiveSongInList();
    }

    function playSong() {
        if (userPlaylist.length === 0 || songIndex === -1) {
            console.log("Cannot play: playlist is empty or no song selected.");
            return;
        }
        initAudioVisualizer();
        if (audioContext && audioContext.state === 'suspended') {
            audioContext.resume();
        }
        musicPlayer.classList.add('playing');
        playIcon.style.display = 'none';
        pauseIcon.style.display = 'block';
        audio.play();
        if (!animationFrameId) {
            drawVisualizer();
        }
    }

    function pauseSong() {
        musicPlayer.classList.remove('playing');
        playIcon.style.display = 'block';
        pauseIcon.style.display = 'none';
        audio.pause();
        if (animationFrameId) {
            cancelAnimationFrame(animationFrameId);
            animationFrameId = undefined;
            visualizerCtx.clearRect(0, 0, audioVisualizer.width, audioVisualizer.height);
        }
    }

    function prevSong() {
        if (userPlaylist.length === 0) return;
        songIndex--;
        if (songIndex < 0) {
            songIndex = userPlaylist.length - 1;
        }
        loadSong(songIndex);
        playSong();
    }

    function nextSong() {
        if (userPlaylist.length === 0) return;
        songIndex++;
        if (songIndex > userPlaylist.length - 1) {
            songIndex = 0;
        }
        loadSong(songIndex);
        playSong();
    }

    function updateProgress(e) {
        const { duration, currentTime } = e.srcElement;
        const progressPercent = (currentTime / duration) * 100;
        progressBar.style.width = `${progressPercent}%`;
        
        if(duration && !isNaN(duration)) {
            durationEl.textContent = formatTime(duration);
        }
        currentTimeEl.textContent = formatTime(currentTime);
    }

    function setProgress(e) {
        const width = this.clientWidth;
        const clickX = e.offsetX;
        const duration = audio.duration;
        if (!isNaN(duration)) {
            audio.currentTime = (clickX / width) * duration;
        }
    }

    function formatTime(seconds) {
        const minutes = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${minutes}:${secs < 10 ? '0' : ''}${secs}`;
    }

    function renderSongList(songsToRender) {
        songListElement.innerHTML = '';
        songsToRender.forEach((song) => {
            const listItem = document.createElement('li');
            listItem.classList.add('song-item');

            const userPlaylistIndex = userPlaylist.findIndex(s => s.id === song.id);
            if (userPlaylistIndex === -1) {
                return;
            }
            listItem.setAttribute('data-user-playlist-index', userPlaylistIndex);
            
            listItem.innerHTML = `
                <img src="${song.cover}" alt="Album Art" class="song-item-cover">
                <div class="song-item-info">
                    <div class="song-item-title">${song.title}</div>
                    <div class="song-item-artist">${song.artist}</div>
                </div>
                <button class="remove-song-btn" title="Remove song">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="18" height="18"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
                </button>
            `;
            
            listItem.addEventListener('click', (event) => {
                if (!event.target.closest('.remove-song-btn')) {
                    const clickedIndex = parseInt(listItem.getAttribute('data-user-playlist-index'));
                    if (clickedIndex !== -1 && clickedIndex !== songIndex) {
                        loadSong(clickedIndex);
                        playSong();
                    } else if (clickedIndex === songIndex) {
                        const isPlaying = musicPlayer.classList.contains('playing');
                        if (isPlaying) {
                            pauseSong();
                        } else {
                            playSong();
                        }
                    }
                }
            });

            const removeBtn = listItem.querySelector('.remove-song-btn');
            removeBtn.addEventListener('click', (event) => {
                event.stopPropagation();
                const idxToRemove = parseInt(listItem.getAttribute('data-user-playlist-index'));
                removeSong(idxToRemove);
            });

            songListElement.appendChild(listItem);
        });
        updateActiveSongInList();
    }

    function removeSong(indexToRemoveInUserPlaylist) {
        if (indexToRemoveInUserPlaylist < 0 || indexToRemoveInUserPlaylist >= userPlaylist.length) {
            return;
        }

        const removedSong = userPlaylist[indexToRemoveInUserPlaylist];
        const wasPlaying = musicPlayer.classList.contains('playing');
        const removedSongWasCurrent = (indexToRemoveInUserPlaylist === songIndex);

        userPlaylist.splice(indexToRemoveInUserPlaylist, 1);

        if (removedSong.src.startsWith('blob:') && localFileUrls.has(removedSong.src)) {
            URL.revokeObjectURL(removedSong.src);
            localFileUrls.delete(removedSong.src);
        }

        sortUserPlaylist();

        if (userPlaylist.length === 0) {
            pauseSong();
            title.innerText = "No songs";
            artist.innerText = "Playlist empty";
            albumArt.src = "album-art-default.png";
            audio.src = "";
            currentTimeEl.textContent = "0:00";
            durationEl.textContent = "0:00";
            progressBar.style.width = "0%";
            songIndex = -1;
        } else {
            if (removedSongWasCurrent || songIndex === -1) { 
                loadSong(songIndex);
                if (wasPlaying && songIndex !== -1) {
                    playSong();
                }
            }
        }
        
        currentPlaylist = filterUserPlaylist(searchInput.value.toLowerCase());
        renderSongList(currentPlaylist);
        renderAvailableSongs();
        updateActiveSongInList();
    }

    function updateActiveSongInList() {
        document.querySelectorAll('.song-item').forEach(item => {
            item.classList.remove('active');
        });

        if (songIndex === -1 || userPlaylist.length === 0) return;

        const currentSongInUserPlaylist = userPlaylist[songIndex];
        
        const activeItem = Array.from(songListElement.children).find(item => {
            const itemUserPlaylistIndex = parseInt(item.getAttribute('data-user-playlist-index'));
            return itemUserPlaylistIndex === songIndex &&
                   userPlaylist[itemUserPlaylistIndex] &&
                   userPlaylist[itemUserPlaylistIndex].id === currentSongInUserPlaylist.id;
        });

        if (activeItem) {
            activeItem.classList.add('active');
            activeItem.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
    }

    function filterUserPlaylist(searchTerm) {
        if (!searchTerm) {
            return [...userPlaylist];
        }
        return userPlaylist.filter(song =>
            song.title.toLowerCase().includes(searchTerm) ||
            song.artist.toLowerCase().includes(searchTerm)
        );
    }

    searchInput.addEventListener('input', (e) => {
        const searchTerm = e.target.value.toLowerCase();
        currentPlaylist = filterUserPlaylist(searchTerm);
        renderSongList(currentPlaylist);
        updateActiveSongInList();
    });

    function addSongFromFile(file) {
        const objectURL = URL.createObjectURL(file);
        const newSong = {
            id: `local-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            title: file.name.replace(/\.(mp3|wav|ogg|flac)$/i, '') || 'Local Track',
            artist: 'Local Files',
            src: objectURL,
            cover: 'album-art-default.png'
        };
        
        localFileUrls.set(objectURL, file);

        userPlaylist.push(newSong);
        sortUserPlaylist();
        currentPlaylist = filterUserPlaylist(searchInput.value.toLowerCase());
        renderSongList(currentPlaylist);
        renderAvailableSongs();
        updateActiveSongInList();
        
        if (userPlaylist.length === 1 && !musicPlayer.classList.contains('playing')) {
            loadSong(songIndex);
            playSong();
        }
    }

    function renderAvailableSongs() {
        availableSongListElement.innerHTML = '';
        const songsToAdd = allSongs.filter(libSong => 
            !userPlaylist.some(userSong => userSong.id === libSong.id)
        );

        if (songsToAdd.length === 0) {
            availableSongListElement.innerHTML = '<li class="no-songs-message">All library songs added or no library songs available.</li>';
            return;
        }

        songsToAdd.forEach(song => {
            const listItem = document.createElement('li');
            listItem.classList.add('song-item');
            listItem.innerHTML = `
                <img src="${song.cover}" alt="Album Art" class="song-item-cover">
                <div class="song-item-info">
                    <div class="song-item-title">${song.title}</div>
                    <div class="song-item-artist">${song.artist}</div>
                </div>
                <button class="add-to-playlist-btn" data-song-id="${song.id}" title="Add to playlist">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="18" height="18"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg>
                </button>
            `;
            const addBtn = listItem.querySelector('.add-to-playlist-btn');
            addBtn.addEventListener('click', () => {
                addSongFromLibrary(song.id);
            });
            availableSongListElement.appendChild(listItem);
        });
    }

    function addSongFromLibrary(songId) {
        const songToAdd = allSongs.find(s => s.id === songId);
        if (songToAdd && !userPlaylist.some(s => s.id === songId)) {
            userPlaylist.push(songToAdd);
            sortUserPlaylist();
            currentPlaylist = filterUserPlaylist(searchInput.value.toLowerCase());
            renderSongList(currentPlaylist);
            renderAvailableSongs();
            updateActiveSongInList();
            
            if (userPlaylist.length === 1 && !musicPlayer.classList.contains('playing')) {
                loadSong(songIndex);
                playSong();
            }
        }
    }

    function initAudioVisualizer() {
        if (!audioContext) {
            audioContext = new (window.AudioContext || window.webkitAudioContext)();
            analyser = audioContext.createAnalyser();
            analyser.fftSize = 256;
            bufferLength = analyser.frequencyBinCount;
            dataArray = new Uint8Array(bufferLength);

            source = audioContext.createMediaElementSource(audio);
            source.connect(analyser);
            analyser.connect(audioContext.destination);

            function resizeCanvas() {
                const albumArtRect = albumArt.getBoundingClientRect();
                audioVisualizer.width = albumArtRect.width;
                audioVisualizer.height = albumArtRect.height;
            }
            resizeCanvas();
            window.addEventListener('resize', resizeCanvas);
        }
    }

    function drawVisualizer() {
        if (!analyser || !dataArray || audio.paused) {
            animationFrameId = undefined;
            return;
        }

        animationFrameId = requestAnimationFrame(drawVisualizer);

        analyser.getByteFrequencyData(dataArray);

        visualizerCtx.clearRect(0, 0, audioVisualizer.width, audioVisualizer.height);

        const barWidth = (audioVisualizer.width / bufferLength) * 2.5;
        let x = 0;

        for (let i = 0; i < bufferLength; i++) {
            const value = dataArray[i];
            const barHeight = (value * value / 255) / 1.5;

            const gradient = visualizerCtx.createLinearGradient(0, audioVisualizer.height, 0, 0);
            gradient.addColorStop(0, 'rgba(255, 138, 0, 0.2)');
            gradient.addColorStop(1, 'rgba(255, 255, 255, 0.6)');

            visualizerCtx.fillStyle = gradient;
            visualizerCtx.fillRect(x, audioVisualizer.height - barHeight, barWidth, barHeight);

            x += barWidth + 1;
        }
    }

    function updateToggleButtonTitle() {
        if (playlistContainer.classList.contains('minimized')) {
            togglePlaylistBtn.title = 'Expand playlist';
        } else {
            togglePlaylistBtn.title = 'Collapse playlist';
        }
    }

    playBtn.addEventListener('click', () => {
        const isPlaying = musicPlayer.classList.contains('playing');
        if (isPlaying) {
            pauseSong();
        } else {
            playSong();
        }
    });
    
    audio.addEventListener('loadedmetadata', () => {
        if (!isNaN(audio.duration)) {
            durationEl.textContent = formatTime(audio.duration);
        } else {
            durationEl.textContent = "0:00";
        }
    });

    prevBtn.addEventListener('click', prevSong);
    nextBtn.addEventListener('click', nextSong);

    audio.addEventListener('timeupdate', updateProgress);
    audio.addEventListener('ended', nextSong);

    progressContainer.addEventListener('click', setProgress);

    togglePlaylistBtn.addEventListener('click', (event) => {
        event.stopPropagation();
        playlistContainer.classList.toggle('minimized');
        updateToggleButtonTitle();
    });

    playlistHeading.addEventListener('click', (event) => {
        if (!event.target.closest('#toggle-playlist-btn')) {
            playlistContainer.classList.toggle('minimized');
            updateToggleButtonTitle();
        }
    });

    addFileBtn.addEventListener('click', () => {
        fileInput.click();
    });

    fileInput.addEventListener('change', (event) => {
        const files = event.target.files;
        if (files.length > 0) {
            addSongFromFile(files[0]);
        }
        fileInput.value = '';
    });

    toggleLibraryBtn.addEventListener('click', () => {
        libraryContainer.classList.toggle('hidden');
        if (!libraryContainer.classList.contains('hidden')) {
            renderAvailableSongs();
        }
    });

    window.addEventListener('scroll', () => {
        if (window.scrollY > 200) {
            backToTopBtn.classList.add('show');
        } else {
            backToTopBtn.classList.remove('show');
        }
    });

    backToTopBtn.addEventListener('click', () => {
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    });

    sortUserPlaylist(); 
    currentPlaylist = filterUserPlaylist(searchInput.value.toLowerCase());

    loadSong(songIndex);
    renderSongList(currentPlaylist);
    renderAvailableSongs();
    updateToggleButtonTitle();
});