<style>
    #playlist {
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
        margin-right: 10px;
    }

    #playlist li.active, 
    #playlist li:hover {
        background-color: rgb(24 0 255 / 10%);
        color: #000;
    }

    #playlist li i {
        margin-left: 10px;
        color: #888;
    }

    #video-container {
        display: flex;
        justify-content: center;
        align-items: center;
        padding: 20px;
    }

    .iframe-container {
        position: relative;
        overflow: hidden;
        width: 100%;
        padding-top: 0;
        padding-bottom: 80%;
    }

    .iframe-container iframe {
        position: absolute;
        top: 0;
        left: 0;
        bottom: 0;
        right: 0;
        width: 100%;
        height: 100%;
    }

    #playlist::-webkit-scrollbar {
        width: 5px;
    }

    #playlist::-webkit-scrollbar-track {
        background: #f1f1f1;
    }

    #playlist::-webkit-scrollbar-thumb {
        background: #888;
        border-radius: 4px;
    }

    #playlist::-webkit-scrollbar-thumb:hover {
        background: #555;
    }

    .visibility-hidden{
        visibility: hidden;
    }
</style>

<div class="container-fluid">
    <div class="row">
        <div class="col-md-12">
            <div class="iframe-container">
                <?php 
                    $video_id = preg_replace('/^.*\/(\d+)(\?.*)?$/', '$1', $view_data['video_url']);
                    $video_url = "https://player.vimeo.com/video/" . $video_id . "?autoplay=1&muted=1";
                ?> 

                <iframe id="videoIframe"  src="<?=$video_url?>" 
                    frameborder="0" 
                    sandbox="allow-same-origin allow-scripts allow-forms" 
                    allow="autoplay; fullscreen" 
                    allowfullscreen>
                </iframe>
            </div>
        </div>
    </div>
</div>

<script src="https://player.vimeo.com/api/player.js"></script>

<script>
    const playlistItems = document.querySelectorAll('#playlist li');
    const videoIframe = document.getElementById('videoIframe');
    const lessonTitle = document.getElementById('lesson-title');
    const lessonSummary = document.getElementById('lesson-summary');
    const lessonDuration = document.getElementById('lesson-duration');
    const whatsappNumber = '1234567890';
    const whatsappLink = document.getElementById('whatsapp-link');
    
    // Function to generate WhatsApp link
    function generateWhatsAppLink(lessonTitle) {
        const message = `I have a doubt in: ${lessonTitle}`;
        return `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`;
    }
    
    // Update WhatsApp link dynamically
    function updateWhatsAppLink(lessonTitle) {
        if (whatsappLink) {
            whatsappLink.href = generateWhatsAppLink(lessonTitle);
        }
    }
    
    // Your existing logic for video URLs and types...
    function loadVideo(videoUrl, videoType) {
        // First, hide both iframe and video element
        document.getElementById('videoIframe').style.display = 'none';
        const html5VideoElement = document.getElementById('html5Video');
        if (html5VideoElement) html5VideoElement.style.display = 'none';
    
        // Debugging
        console.log('Video URL:', videoUrl, 'Video Type:', videoType);
    
        // Ensure HTTPS protocol
        if (!videoUrl.startsWith('https://')) {
            videoUrl = videoUrl.replace(/^http:\/\//, 'https://');
        }
    
        // Handle video types
        if (videoType === 'vimeo') {
            // Convert Vimeo URL to player URL format
            const videoId = videoUrl.split('/').pop();
            document.getElementById('videoIframe').style.display = 'block';
            document.getElementById('videoIframe').src = `https://player.vimeo.com/video/${videoId}?autoplay=1&muted=1`;
        } else if (videoType === 'youtube') {
            const videoId = new URL(videoUrl).searchParams.get('v') || videoUrl.split('/').pop();
            document.getElementById('videoIframe').style.display = 'block';
            document.getElementById('videoIframe').src = `https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1`;
        } else if (videoType === 'html5') {
            if (html5VideoElement) {
                html5VideoElement.style.display = 'block';
                html5VideoElement.src = videoUrl;
                html5VideoElement.play(); // Play the video immediately
            }
        }
    }
    
    // Automatically load the first video on page load
    if (playlistItems.length > 0) {
        playlistItems[0].click();
    }

</script>
