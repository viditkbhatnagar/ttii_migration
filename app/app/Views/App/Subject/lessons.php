<!-- Include PDF.js CSS and JS -->
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf_viewer.min.css" integrity="sha512-uxrT4pz2No+JBL1kDz4JY5cFQ+g9Jp0qUzrO8wFX5VnDcZKcpRBUYxYQ/g7f0VgD4R3sR+a0X4l8R9QwdRjA0A==" crossorigin="anonymous" referrerpolicy="no-referrer" />

<div class="row ">
    
    <div class="col-12 col-xl-8">
        <!-- Video Player Section -->
        <div class="card rounded-4  mb-4">
            <div class="card-body p-0">
                <div class="p-3 border-top" id="playerInfoSection">
                    <h4 id="playerTitle"></h4>
                </div>
                <div id="videoPlayerContainer" class="bg-dark bg-opacity-10">
                    <!-- Player will be initialized here -->
                </div>
                <div class="p-3">
                    <p id="playerDescription" class="text-muted small mb-0"></p>
                </div>
            </div>
        </div>
        
        <div class="card rounded-4">
            <div class="card-body">
                <?= $subject['description'] ?>
            </div>
        </div>
    </div>
    
    <div class="col-12 col-xl-4">
        <?php if (!empty($lesson_data)) { ?>
            <div class="accordion" id="lessonsAccordion">
                <?php foreach ($lesson_data as $index => $lesson) { ?>
                    <div class="accordion-item rounded-4 shadow mb-3 overflow-hidden">
                        <h2 class="accordion-header" id="heading<?= $index ?>">
                            <button class="accordion-button collapsed fw-bold h4 py-3" type="button" 
                                    data-bs-toggle="collapse" data-bs-target="#collapse<?= $index ?>" 
                                    aria-expanded="false" aria-controls="collapse<?= $index ?>">
                                <?= $lesson['title'] ?>
                                <?php if(!empty($lesson['lesson_files'])) { ?>
                                    <span class="badge bg-primary rounded-pill ms-2"><?= count($lesson['lesson_files']) ?></span>
                                <?php } ?>
                            </button>
                        </h2>
                        <div id="collapse<?= $index ?>" class="accordion-collapse collapse" 
                             aria-labelledby="heading<?= $index ?>" data-bs-parent="#lessonsAccordion">
                            <div class="accordion-body py-3">
                                <?php if(!empty($lesson['lesson_files'])) { ?>
                                    <div class="list-group list-group-flush">
                                        <?php foreach($lesson['lesson_files'] as $fileIndex => $file) { ?>
                                            <div class="list-group-item border-0 px-0 py-2 lesson-file-item" 
                                                 data-id="<?= htmlspecialchars($file['id']) ?>"
                                                 data-title="<?= htmlspecialchars($file['title']) ?>"
                                                 data-description="<?= !empty($file['summary']) ? htmlspecialchars($file['summary']) : '' ?>"
                                                 data-type="<?= $file['lesson_type'] === 'video' ? 'video' : $file['attachment_type'] ?>"
                                                 data-content="<?= htmlspecialchars($file['lesson_type'] === 'video' ? $file['video_url'] : ($file['attachment_type'] === 'audio' ? base_url(get_file($file['audio_file'])) :  (!empty($file['attachment']) ? base_url(get_file($file['attachment'])) : $file['summary']))) ?>"
                                                 <?php if($index === 0 && $fileIndex === 0) echo 'data-auto-load="true"'; ?>>
                                                <div class="d-flex align-items-start">
                                                    <?php
                                                    // Determine icon based on file type
                                                    $icon = 'ri-file-line';
                                                    $icon_color = 'text-primary';
                                                    
                                                    if($file['lesson_type'] === 'video') {
                                                        $icon = 'ri-play-circle-line';
                                                        $icon_color = 'text-danger';
                                                    } elseif($file['attachment_type'] === 'pdf') {
                                                        $icon = 'ri-file-pdf-line';
                                                        $icon_color = 'text-danger';
                                                    } elseif($file['attachment_type'] === 'article') {
                                                        $icon = 'ri-article-line';
                                                        $icon_color = 'text-info';
                                                    } elseif($file['attachment_type'] === 'quiz') {
                                                        $icon = 'ri-questionnaire-line';
                                                        $icon_color = 'text-warning';
                                                    } elseif($file['attachment_type'] === 'audio') {
                                                            $icon = 'ri-music-line';
                                                            $icon_color = 'text-success';
                                                        }
                                                    ?>
                                                    <i class="<?= $icon ?> <?= $icon_color ?> fs-3 mt-1 me-3"></i>
                                                    <div class="flex-grow-1">
                                                        <h5 class="mb-1 fw-bold"><?= $file['title'] ?></h5>
                                                        
                                                        <?php if(!empty($file['duration'])) { ?>
                                                            <small class="text-muted d-block mb-1">
                                                                <i class="ri-time-line"></i> <?= $file['duration'] ?>
                                                            </small>
                                                        <?php }else{ ?>
                                                            <small class="text-muted d-block mb-1">
                                                                <i class="ri-time-line"></i> 00:00:00
                                                            </small>
                                                        <?php } ?>
                                                    </div>
                                                </div>
                                            </div>
                                        <?php } ?>
                                    </div>
                                <?php } else { ?>
                                    <div class="alert alert-info mb-0">
                                        No materials available for this lesson yet.
                                    </div>
                                <?php } ?>
                            </div>
                        </div>
                    </div>
                <?php } ?>
            </div>
        <?php } else { ?>
            <p class="alert alert-info">No lessons available.</p>
        <?php } ?>
    </div>
</div>

<!-- Include Plyr CSS and JS -->
<link rel="stylesheet" href="https://cdn.plyr.io/3.7.8/plyr.css" />
<script src="https://cdn.plyr.io/3.7.8/plyr.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.min.js" integrity="sha512-ml/QKfG3+Yes6TwOzQb7aCNtJF4PUyha6R3w8pSTo/VJSywl7ZreYvvtUso7fKevpsI+pYVVwnu82YO0q3V6eg==" crossorigin="anonymous" referrerpolicy="no-referrer"></script>

<script>
document.addEventListener('DOMContentLoaded', function() {
    const videoPlayerContainer = document.getElementById('videoPlayerContainer');
    const playerTitle = document.getElementById('playerTitle');
    const playerDescription = document.getElementById('playerDescription');
    const playerInfoSection = document.getElementById('playerInfoSection');
    
    let player; // To store Plyr player instance
    
    function loadContent(type, content, title, description, lesson_file_id) {
        // Clear previous content and destroy existing player
        videoPlayerContainer.innerHTML = '';
        videoPlayerContainer.style.aspectRatio = ''; // Reset aspect ratio
        
        if (player) {
            player.destroy();
            player = null;
        }
        
        playerTitle.textContent = title;
        
        // Show/hide description section based on content type
        if(type === 'video') {
            playerDescription.innerHTML = description;
            // playerInfoSection.style.display = 'block';
        } else {
            playerDescription.innerHTML = '';
            // playerInfoSection.style.display = 'none';
        }
        
        switch(type) {
            case 'video':
                videoPlayerContainer.style.aspectRatio = '16/9'; // Set aspect ratio only for videos
                
                let videoSource = '';
                let provider = '';
                
                if(content.includes('vimeo.com')) {
                    const vimeoId = content.split('/').pop();
                    videoSource = vimeoId;
                    provider = 'vimeo';
                } else if(content.includes('youtube.com') || content.includes('youtu.be')) {
                    let videoId = '';
                    if(content.includes('youtube.com')) {
                        videoId = content.split('v=')[1];
                        const ampersandPosition = videoId.indexOf('&');
                        if(ampersandPosition !== -1) {
                            videoId = videoId.substring(0, ampersandPosition);
                        }
                    } else if(content.includes('youtu.be')) {
                        videoId = content.split('/').pop();
                    }
                    videoSource = videoId;
                    provider = 'youtube';
                }
                
                if(videoSource) {
                    const videoWrapper = document.createElement('div');
                    videoWrapper.className = 'plyr__video-embed';
                    videoWrapper.id = 'player';
                    
                    // Create the iframe that Plyr will use
                    const iframe = document.createElement('iframe');
                    if(provider === 'vimeo') {
                        iframe.src = `https://player.vimeo.com/video/${videoSource}?autoplay=1&title=0&byline=0&portrait=0`;
                    } else {
                        iframe.src = `https://www.youtube.com/embed/${videoSource}?autoplay=1&rel=0&modestbranding=1&showinfo=0`;
                    }
                    iframe.setAttribute('allowfullscreen', '');
                    iframe.setAttribute('allow', 'autoplay');
                    iframe.setAttribute('frameborder', '0');
                    
                    videoWrapper.appendChild(iframe);
                    videoPlayerContainer.appendChild(videoWrapper);
                    
                    // Initialize Plyr player with custom settings
                    player = new Plyr('#player', {
                        autoplay: true,
                        controls: ['play-large', 'play', 'progress', 'current-time', 'mute', 'volume', 'captions', 'settings', 'pip', 'airplay', 'fullscreen'],
                        hideControls: false,
                        youtube: {
                            noCookie: true,
                            rel: 0,
                            showinfo: 0,
                            iv_load_policy: 3,
                            modestbranding: 1
                        },
                        vimeo: {
                            byline: false,
                            portrait: false,
                            title: false,
                            speed: true,
                            transparent: false
                        }
                    });
                    
                    // Show the player when ready
                    player.on('ready', () => {
                        const iframe = document.querySelector('#player iframe');
                        if(iframe) iframe.style.display = 'block';
                    });
                }
                break;
                
            case 'pdf':
                // Initialize PDF.js
                pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js';
                
                const pdfContainer = document.createElement('div');
                pdfContainer.className = 'pdf-viewer-container w-100 h-100 rounded-top-4 bg-light';
                pdfContainer.style.position = 'relative';
                pdfContainer.style.overflow = 'auto';
                pdfContainer.style.border = '1px solid #ddd';
                
                const pdfCanvas = document.createElement('canvas');
                pdfCanvas.className = 'pdf-canvas';
                pdfCanvas.style.display = 'block';
                pdfCanvas.style.margin = '0 auto';
                
                const pdfControls = document.createElement('div');
                pdfControls.className = 'pdf-controls p-2 bg-light border-bottom d-flex justify-content-between align-items-center';
                
                const pageInfo = document.createElement('span');
                pageInfo.className = 'page-info small text-muted';
                
                const prevPageBtn = document.createElement('button');
                prevPageBtn.className = 'btn btn-sm btn-outline-secondary';
                prevPageBtn.innerHTML = '<i class="ri-arrow-left-line"></i> Previous';
                prevPageBtn.disabled = true;
                
                const nextPageBtn = document.createElement('button');
                nextPageBtn.className = 'btn btn-sm btn-outline-secondary';
                nextPageBtn.innerHTML = 'Next <i class="ri-arrow-right-line"></i>';
                nextPageBtn.disabled = true;
                
                pdfControls.appendChild(prevPageBtn);
                pdfControls.appendChild(pageInfo);
                pdfControls.appendChild(nextPageBtn);
                
                const pdfLoading = document.createElement('div');
                pdfLoading.className = 'pdf-loading text-center p-4';
                pdfLoading.innerHTML = '<div class="spinner-border text-primary" role="status"><span class="visually-hidden">Loading...</span></div><p class="mt-2">Loading PDF...</p>';
                
                pdfContainer.appendChild(pdfControls);
                pdfContainer.appendChild(pdfLoading);
                pdfContainer.appendChild(pdfCanvas);
                videoPlayerContainer.appendChild(pdfContainer);
                
                // PDF rendering variables
                let pdfDoc = null,
                    pageNum = 1,
                    pageRendering = false,
                    pageNumPending = null,
                    scale = 1;
                
                // Render the page
                function renderPage(num) {
                    pageRendering = true;
                    pdfLoading.style.display = 'block';
                    pdfCanvas.style.display = 'none';
                    
                    pdfDoc.getPage(num).then(function(page) {
                        const viewport = page.getViewport({ scale: scale });
                        pdfCanvas.height = viewport.height;
                        pdfCanvas.width = viewport.width;
                        
                        const renderContext = {
                            canvasContext: pdfCanvas.getContext('2d'),
                            viewport: viewport
                        };
                        
                        const renderTask = page.render(renderContext);
                        
                        renderTask.promise.then(function() {
                            pageRendering = false;
                            pdfLoading.style.display = 'none';
                            pdfCanvas.style.display = 'block';
                            
                            if (pageNumPending !== null) {
                                renderPage(pageNumPending);
                                pageNumPending = null;
                            }
                        });
                    });
                    
                    pageInfo.textContent = `Page ${num} of ${pdfDoc.numPages}`;
                    
                    prevPageBtn.disabled = num <= 1;
                    nextPageBtn.disabled = num >= pdfDoc.numPages;
                }
                
                // Queue rendering of the next page
                function queueRenderPage(num) {
                    if (pageRendering) {
                        pageNumPending = num;
                    } else {
                        renderPage(num);
                    }
                }
                
                // Previous page
                prevPageBtn.addEventListener('click', function() {
                    if (pageNum <= 1) return;
                    pageNum--;
                    queueRenderPage(pageNum);
                });
                
                // Next page
                nextPageBtn.addEventListener('click', function() {
                    if (pageNum >= pdfDoc.numPages) return;
                    pageNum++;
                    queueRenderPage(pageNum);
                });
                
                // Load the PDF
                pdfjsLib.getDocument(content).promise.then(function(pdfDoc_) {
                    pdfDoc = pdfDoc_;
                    renderPage(pageNum);
                }).catch(function(error) {
                    pdfLoading.innerHTML = `<div class="alert alert-danger">Error loading PDF: ${error.message}</div>`;
                    console.error('PDF loading error:', error);
                });
                
                // Handle window resize
                window.addEventListener('resize', function() {
                    if (pdfDoc) {
                        queueRenderPage(pageNum);
                    }
                });
                break;
                
            case 'article':
                const articleDiv = document.createElement('div');
                articleDiv.className = 'p-4 h-100 overflow-auto bg-white';
                articleDiv.innerHTML = `<div class="prose editor-content">${content}</div>`;
                videoPlayerContainer.appendChild(articleDiv);
                console.log(content);
                console.log(lesson_file_id);
                break;
                
            case 'quiz':
                const quizDiv = document.createElement('div');
                quizDiv.className = 'p-4 h-100 overflow-auto bg-white';
                quizDiv.innerHTML = `
                    <div class="alert alert-warning">
                        <h5 class="fw-bold">Quiz Instructions</h5>
                        <div class="prose">${content}</div>
                    </div>
                    <a href="<?= base_url('app/subject/attend_quiz/') ?>${lesson_file_id}" class="btn btn-warning  mt-3">Start Quiz</a>
                `;
                videoPlayerContainer.appendChild(quizDiv);
                break;
            // <!-- In your JavaScript, modify the audio case in the loadContent function: -->
           case 'audio':
                videoPlayerContainer.style.aspectRatio = ''; // No specific aspect ratio for audio
                
                const audioWrapper = document.createElement('div');
                audioWrapper.className = 'audio-player-container bg-light p-4 rounded';
                
                const audioElement = document.createElement('audio');
                audioElement.controls = true;
                audioElement.style.width = '100%';
                
                // Get file extension to determine type
                const extension = content.split('.').pop().toLowerCase();
                const mimeTypes = {
                    mp3: 'audio/mpeg',
                    ogg: 'audio/ogg',
                    wav: 'audio/wav',
                    aac: 'audio/aac',
                    m4a: 'audio/mp4',
                    flac: 'audio/flac',
                    webm: 'audio/webm'
                };
                
                // Create source element with detected type
                const sourceElement = document.createElement('source');
                sourceElement.src = content;
                // sourceElement.type = mimeTypes[extension] || 'audio/*'; // Fallback to generic audio type
                console.log('content');
                console.log(content);
                audioElement.appendChild(sourceElement);
                
                // Add fallback message for unsupported formats
                const unsupportedMsg = document.createElement('p');
                unsupportedMsg.className = 'text-muted small mt-2 mb-0';
                unsupportedMsg.textContent = 'Your browser does not support this audio format.';
                audioElement.appendChild(unsupportedMsg);
                
                audioWrapper.appendChild(audioElement);
                videoPlayerContainer.appendChild(audioWrapper);
                break;
        }
    }
    
    // Set up click handlers for lesson file items
    document.querySelectorAll('.lesson-file-item').forEach(item => {
        item.style.cursor = 'pointer';
        item.addEventListener('click', function() {
            const lesson_file_id = this.getAttribute('data-id');
            const title = this.getAttribute('data-title');
            const description = this.getAttribute('data-description');
            const type = this.getAttribute('data-type');
            const content = this.getAttribute('data-content');
            
            loadContent(type, content, title, description, lesson_file_id);
        });
    });
    
    // Auto-load the first lesson file of the first lesson
    const autoLoadItem = document.querySelector('.lesson-file-item[data-auto-load="true"]');
    if(autoLoadItem) {
        const lesson_file_id = autoLoadItem.getAttribute('data-id');
        const title = autoLoadItem.getAttribute('data-title');
        const description = autoLoadItem.getAttribute('data-description');
        const type = autoLoadItem.getAttribute('data-type');
        const content = autoLoadItem.getAttribute('data-content');
        
        loadContent(type, content, title, description, lesson_file_id);
        
        // Also expand the first accordion item
        const firstAccordionButton = document.querySelector('.accordion-button');
        if(firstAccordionButton) {
            firstAccordionButton.click();
        }
    }
});
</script>

<style>
.prose {
    max-width: 100%;
    line-height: 1.6;
}
.prose p {
    margin-bottom: 1em;
}
/* Plyr overrides */
.plyr {
    /*border-radius: 16px 16px 0 0 !important;*/
    width: 100%;
    height: 100%;
}
.plyr__video-embed iframe {
    width: 100%;
    height: 100%;
}
/* PDF Viewer Styles */
.pdf-viewer-container {
    height: 600px;
    max-height: 80vh;
}

.pdf-canvas {
    border: 1px solid #eee;
    box-shadow: 0 0 10px rgba(0,0,0,0.1);
    margin-bottom: 20px;
}

.pdf-controls {
    position: sticky;
    top: 0;
    z-index: 10;
}

.pdf-loading {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
}

/* Lesson file item hover effect */
.lesson-file-item:hover {
    background-color: rgba(0, 0, 0, 0.03);
}

.lesson-file-item {
    transition: background-color 0.2s ease;
}
/* Add these styles to your existing CSS */
.audio-player-container {
    background-color: #f8f9fa;
    border-radius: 8px;
    padding: 20px;
}

audio {
    width: 100%;
    max-width: 600px;
    margin: 0 auto;
    display: block;
}
</style>