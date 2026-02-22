<style>
    #playlist {
        padding: 20px;
        overflow-y: auto;
        background-color: #ffffff;
        border-right: 1px solid #ccc;
    }

    @media screen and (min-width: 750px) {
        #playlist {
            height: 70vh;
        }
    }

    #playlist ul {
        list-style: none;
        padding: 0;
        margin: 0;
    }

    #playlist li {
        padding: 10px;
        cursor: pointer;
        border-bottom: 1px solid #ddd;
        display: flex;
        align-items: center;
        justify-content: space-between;
    }

    #playlist li span.lesson-count {
        font-weight: bold;
        color: #000;
        margin-right: 10px; /* Spacing between count and text */
    }

    #playlist li.active, 
    #playlist li:hover {
        background-color: rgba(255, 0, 0, 0.1); /* Subtle red color for hover/active state */
        color: #000;
    }

    #playlist li i {
        margin-left: 10px; /* Space between text and icon on the right */
        color: #888; /* Icon color */
    }

    #content-container {
        display: flex;
        justify-content: center;
        align-items: center;
        padding: 20px;
    }

    .iframe-container {
        position: relative;
        overflow: hidden;
        width: 100%;
        padding-top: 56.25%;
    }

    .iframe-container iframe {
        position: absolute;
        top: 0;
        left: 0;
        bottom: 0;
        right: 0;
        width: 100%;
        height: 100%;
        max-height: 500px;
    }

    @media screen and (max-width: 750px) {
        #content-container {
            width: 100%;
        }

        .iframe-container {
            padding-bottom: 56.25%;
        }
    }

    /* Custom scrollbar styles */
    #playlist::-webkit-scrollbar {
        width: 5px; /* Width of the scrollbar */
    }

    #playlist::-webkit-scrollbar-track {
        background: #f1f1f1; /* Background of the track */
    }

    #playlist::-webkit-scrollbar-thumb {
        background: #888; /* Color of the scrollbar thumb */
        border-radius: 4px; /* Rounded corners for the thumb */
    }

    #playlist::-webkit-scrollbar-thumb:hover {
        background: #555; /* Darker color on hover */
    }

    .content-display {
        width: 100%;
        margin: 0 auto;
        padding: 20px;
        background-color: #f9f9f9;
        border: 1px solid #ddd;
        border-radius: 8px;
    }

    .content-display audio {
        width: 100%;
    }

    .content-display iframe {
        width: 100%;
        height: 500px;
        border: none;
    }

    .content-display .article-content {
        white-space: pre-wrap;
        font-family: Arial, sans-serif;
        line-height: 1.6;
    }

    .lesson-details {
        display: none; /* Initially hidden */
    }
</style>
<div class="container-fluid">
    <div class="row">
        <div class="col-md-8">
            <div id="content-container">
                <div class="iframe-container" id="videoPlayerContainer">
                    <iframe id="videoPlayer" src="" frameborder="0" allow="autoplay; fullscreen" allowfullscreen></iframe>
                </div>
                <div class="content-display" id="otherContent" style="display: none;">
                    <!-- Content for audio, PDF, articles, quizzes will be dynamically inserted here -->
                </div>
            </div>
            <div class="lesson-details" id="lessonDetails" style="display: none;">
                <div class="w-100 row">
                    <div class="col-xl-8 col-sm-12">
                        <h4 id="lesson-title" class="mb-1"></h4>
                        <p id="lesson-summary"></p>
                        <p id="lesson-duration"></p>
                    </div>
                    <div class="d-flex align-items-center justify-content-between col-xl-4  col-sm-12 d-none">
                        <div class="course-item">
                            <a href="<?= base_url('app/materials/index/' . $lesson_id) ?>" target="_blank">
                                <div class="rounded-pill border border-dark-subtle border-1 px-2">
                                    <i class="ri-file-copy-line fs-1"></i>
                                </div>
                            </a>
                            <p class="text-center mt-2">Materials</p>
                        </div>
                        <div class="course-item">
                            <a href="#">
                                <div class="rounded-circle border border-dark-subtle px-2 border-1">
                                    <i class="ri-share-forward-line fs-1"></i>
                                </div>
                            </a>
                            <p class="text-center mt-2">Share</p>
                        </div>
                        <div class="course-item">
                            <a id="whatsapp-link" href="#" target="_blank">
                                <div class="rounded-circle border border-dark-subtle px-2 border-1">
                                    <i class="ri-whatsapp-line fs-1"></i>
                                </div>
                            </a>
                            <p class="text-center mt-2">Doubts</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        <div class="col-md-4">

            <div>
                <div class=" py-2 px-4 bg-white d-flex align-items-center justify-content-between">
                   <h2 class=" m-0">Playlist</h2>
                    <a href="#" class="btn btn-primary mb-2" onclick="goBack()">Back</a>
                    <script>
                        function goBack() {
                            window.history.back();
                        }
                    </script>
                </div>
                <ul id="playlist">
                    <?php foreach ($video_data as $key => $video): ?>
                        <li data-video-url="<?= esc($video['video_url']) ?>"
                            data-title="<?= esc($video['title']) ?>"
                            data-summary="<?= esc($video['summary']) ?>"
                            data-duration="<?= esc($video['duration']) ?>"
                            data-video-type="<?= esc($video['lesson_provider']) ?>"
                            data-attachment="<?= esc($video['attachment']) ?>"
                            data-attachment-type="<?= esc($video['attachment_type']) ?>"
                            data-audio-file="<?= base_url(get_file($video['audio_file'])) ?>"
                            class="<?= $key === 0 ? 'active' : '' ?>">
                            <span class="lesson-count text-muted fs-2"><?= $key + 1 ?></span> <!-- Lesson count on the left -->
                            <div class="w-75"><?= esc($video['title']) ?> <br> <?= esc($video['duration']) ?></div>
                            <i class="ri-play-circle-fill fs-1 text-danger"></i> <!-- Icon on the right -->
                        </li>
                    <?php endforeach; ?>
                </ul>
            </div>
        </div>
    </div>

    <script src="https://player.vimeo.com/api/player.js"></script>
    <script>
        // Initialize the playlist
        const playlistItems = document.querySelectorAll('#playlist li');
        const videoPlayer = document.getElementById('videoPlayer');
        const videoPlayerContainer = document.getElementById('videoPlayerContainer');
        const otherContent = document.getElementById('otherContent');
        const lessonDetails = document.getElementById('lessonDetails');

        // Elements to update with video details
        const lessonTitle = document.getElementById('lesson-title');
        const lessonSummary = document.getElementById('lesson-summary');
        const lessonDuration = document.getElementById('lesson-duration');
        
        // Set your WhatsApp number here (including country code, no spaces or special characters)
        const whatsappNumber = '<?= $dout_number ?? 0 ?>'; 
        
        // Function to encode the message and generate the WhatsApp link
        function generateWhatsAppLink(lessonTitle) {
            const message = `I have a doubt in : ${lessonTitle}`;
            return `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`;
        }
        
        // Get the WhatsApp link element
        const whatsappLink = document.getElementById('whatsapp-link');
        
        // Function to update the WhatsApp link with the current lesson title
        function updateWhatsAppLink(lessonTitle) {
            whatsappLink.href = generateWhatsAppLink(lessonTitle);
        }

        // Vimeo Player instance
        let vimeoPlayer = null;

        // Function to initialize Vimeo Player
        function initializeVimeoPlayer(videoUrl) {
            const videoId = videoUrl.split('/').pop();
            videoPlayer.src = `https://player.vimeo.com/video/${videoId}?autoplay=1`;
            if (vimeoPlayer) {
                vimeoPlayer.destroy(); // Destroy existing player instance
            }
            vimeoPlayer = new Vimeo.Player(videoPlayer);
        }

        // Function to pause Vimeo video
        function pauseVimeoVideo() {
            if (vimeoPlayer) {
                vimeoPlayer.pause();
            }
        }

        playlistItems.forEach(item => {
            item.addEventListener('click', function() {
                // Remove 'active' class from all items
                playlistItems.forEach(i => i.classList.remove('active'));
                
                // Add 'active' class to the clicked item
                this.classList.add('active');
                
                // Change the content based on the type
                const videoUrl = this.getAttribute('data-video-url');
                const videoType = this.getAttribute('data-video-type');
                const attachment = this.getAttribute('data-attachment');
                const attachmentType = this.getAttribute('data-attachment-type');
                const audioFile = this.getAttribute('data-audio-file');
                
                if (videoType === 'vimeo') {
                    // Show video player and lesson details
                    videoPlayer.style.display = 'block';
                    videoPlayerContainer.style.display = 'block';
                    otherContent.style.display = 'none';
                    lessonDetails.style.display = 'block';

                    // Initialize or update Vimeo player
                    initializeVimeoPlayer(videoUrl);
                } else {
                    // Hide video player and lesson details
                    videoPlayer.style.display = 'none';
                    videoPlayerContainer.style.display = 'none';
                    lessonDetails.style.display = 'none';
                    otherContent.style.display = 'block';

                    // Pause Vimeo video if playing
                    pauseVimeoVideo();

                    // Load other content
                    if (attachmentType === 'audio') {
                        otherContent.innerHTML = `<audio controls><source src="${audioFile}" type="audio/mpeg">Your browser does not support the audio element.</audio>`;
                    } else if (attachmentType === 'pdf') {
                        otherContent.innerHTML = `<iframe src="${attachment}" width="100%" height="500px"></iframe>`;
                    } else if (attachmentType === 'article') {
                        otherContent.innerHTML = `<div class="article-content">${this.getAttribute('data-summary')}</div>`;
                    } else if (attachmentType === 'quiz') {
                        otherContent.innerHTML = `<div class="article-content">${this.getAttribute('data-summary')}</div>`;
                    }
                }

                // Update content details
                lessonTitle.textContent = this.getAttribute('data-title');
                lessonSummary.textContent = this.getAttribute('data-summary');
                lessonDuration.textContent = this.getAttribute('data-duration');
                
                const currentLessonTitle = this.getAttribute('data-title');
                updateWhatsAppLink(currentLessonTitle);
            });
        });

        // Set initial content based on the first item
        if (playlistItems.length > 0) {
            playlistItems[0].click();
        }
    </script>
</div>