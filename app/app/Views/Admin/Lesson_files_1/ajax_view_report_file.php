<div class="container pdf-section">
    <div style="background-color:#b7b7b7;padding-top:5px;">
        <div class="row mx-auto text-center p-2" style="width: 400px">
            <div class="col-4">
                <button id="zoom_out" class="btn btn-sm btn-dark" style="width: 90px;"><i class="ri-zoom-out-line"></i></button>
            </div>
            <div class="col-4" style="border-radius:4px; padding:7px; background-color: #3c67b9; color: #fff; font-size: 15px;">
                <span id="zoom_level">100%</span>
            </div>
            <div class="col-4">
                <button id="zoom_in" class="btn btn-sm btn-dark" style="width: 90px;"><i class="ri-zoom-in-line"></i></button>
            </div>
        </div>
        <div id="file-container" style="position: relative; overflow-y: auto; height: 100vh;">
            <!-- Overlay to prevent interactions -->
            <div id="overlay" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; background: rgba(255, 255, 255, 0); z-index: 100;"></div>
        </div>
    </div>
</div>

<style>
    /* Additional styles */
    .pdf-section {
        overflow-x: scroll;
    }
    
    #file-container img, #file-container iframe {
        width: 100%;
        height: 100%;
        transition: transform 0.2s; /* Smooth zoom transition */
    }

    #file-container canvas {
        direction: ltr;
        margin: 10px auto;
        display: block;
    }
    
    /* Hide content in print view */
    @media print {
        body {
            display: none;
        }
    }
    
    #file-container {
        width: 100%;
        min-height: 100vh;
        overflow: auto;
        cursor: grab;
        position: relative;
    }
    
    #overlay {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(255, 255, 255, 0); /* Transparent overlay */
        z-index: 100; /* Ensure it sits on top of other content */
    }

    iframe {
        pointer-events: auto; /* Allow interactions */
    }
</style>

<script src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.9.359/pdf.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js"></script> <!-- SheetJS for Excel -->

<script>
    // Disable right-click globally
    document.addEventListener('contextmenu', event => event.preventDefault());

    // Intercept and disable any print commands
    document.addEventListener('keydown', function(event) {
        if ((event.ctrlKey && event.key === 'p') || event.key === 'PrintScreen') {
            event.preventDefault();
            alert('Printing is disabled on this page.');
        }
    });

    // Disable print options
    function disablePrintOptions() {
        // Example: Disable print actions
        document.querySelectorAll('[data-tooltip]').forEach(function(item) {
            item.addEventListener('click', function(event) {
                if (item.getAttribute('data-tooltip') === 'print') {
                    event.preventDefault();
                    alert('Printing is disabled.');
                }
            });
        });
    }

    disablePrintOptions();

    // Load and render files based on type
    var url = '<?=$file?>'; // Replace with your file URL
    var file_type = '<?=$file_type?>'; // e.g., 'pdf', 'jpg', 'doc', 'ppt', 'xlsx'
    
    console.log("File URL:", url);
    console.log("File Type:", file_type);
    
    var scale = 1.0; // Default scale for zoom

    // Zoom functionality
    function zoomContent() {
        document.querySelectorAll('#file-container img, #file-container iframe').forEach(el => {
            el.style.transform = 'scale(' + scale + ')';
            el.style.transformOrigin = '0 0';
        });
        document.querySelectorAll('#file-container canvas').forEach(el => {
            el.style.transform = 'scale(' + scale + ')';
            el.style.transformOrigin = '0 0';
        });
        document.getElementById('zoom_level').textContent = Math.round(scale * 100) + '%';
    }

    document.getElementById('zoom_in').addEventListener('click', function () {
        scale += 0.1;
        zoomContent();
    });

    document.getElementById('zoom_out').addEventListener('click', function () {
        if (scale > 0.2) { // Prevent scaling too small
            scale -= 0.1;
            zoomContent();
        }
    });

    // PDF rendering
    function renderPDF() {
        var pdfjsLib = window['pdfjs-dist/build/pdf'];
        pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.9.359/pdf.worker.min.js';

        function renderPage(page) {
            var canvas = document.createElement('canvas');
            document.getElementById('file-container').appendChild(canvas);
            var ctx = canvas.getContext('2d');
            var viewport = page.getViewport({ scale: scale });
            canvas.height = viewport.height;
            canvas.width = viewport.width;

            var renderContext = {
                canvasContext: ctx,
                viewport: viewport
            };
            var renderTask = page.render(renderContext);
            return renderTask.promise;
        }

        function renderAllPages() {
            document.getElementById('file-container').innerHTML = ''; // Clear content
            pdfjsLib.getDocument(url).promise.then(function (pdfDoc) {
                var total = pdfDoc.numPages;
                var promises = Array.from({ length: total }, function (_, i) {
                    return pdfDoc.getPage(i + 1).then(renderPage);
                });
                return Promise.all(promises);
            });
        }

        renderAllPages();
    }

    // Render image
    function renderImage() {
        document.getElementById('file-container').innerHTML = '<img src="' + url + '" alt="Image" style="width:100%;">';
        zoomContent();
    }

    // Render Google Docs Viewer for documents
    function renderDoc() {
        document.getElementById('file-container').innerHTML = '<iframe src="https://docs.google.com/gview?url=' + encodeURIComponent(url) + '&embedded=true" style="width:100%; height:100%; border: none;"></iframe>';
        zoomContent();
    }

    // Render PPT
    function renderPpt() {
        document.getElementById('file-container').innerHTML = '<iframe src="https://docs.google.com/viewer?url=' + encodeURIComponent(url) + '&embedded=true" style="width:100%; height:100%; border: none;"></iframe>';
        zoomContent();
    }

    // Render Excel files
    function renderExcel() {
        document.getElementById('file-container').innerHTML = '<iframe src="https://docs.google.com/viewer?url=' + encodeURIComponent(url) + '&embedded=true" style="width:100%; height:100%; border: none;"></iframe>';
        zoomContent();
    }

    // Based on file type, render the appropriate file
    switch (file_type) {
        case 'pdf':
            renderPDF();
            break;
        case 'img':
        case 'jpg':
        case 'jpeg':
        case 'png':
        case 'gif':
            renderImage();
            break;
        case 'doc':
        case 'docx':
            renderDoc();
            break;
        case 'ppt':
        case 'pptx':
            renderPpt();
            break;
        case 'excel':
        case 'xls':
        case 'xlsx':
            renderExcel();
            break;
        default:
            document.getElementById('file-container').innerHTML = 'Unsupported file type.';
            break;
    }
</script>

<script>
    // Drag-to-scroll functionality for file-container
    var container = document.getElementById('file-container');
    var isDown = false;
    var startX, startY, scrollLeft, scrollTop;

    container.addEventListener('mousedown', function (e) {
        isDown = true;
        container.style.cursor = 'grabbing';
        startX = e.pageX;
        startY = e.pageY;
        scrollLeft = container.scrollLeft;
        scrollTop = container.scrollTop;
    });

    container.addEventListener('mouseleave', function () {
        isDown = false;
        container.style.cursor = 'grab';
    });

    container.addEventListener('mouseup', function () {
        isDown = false;
        container.style.cursor = 'grab';
    });

    container.addEventListener('mousemove', function (e) {
        if (!isDown) return;
        e.preventDefault();
        const x = e.pageX;
        const walkX = x - startX;
        const y = e.pageY;
        const walkY = y - startY;
        container.scrollLeft = scrollLeft - walkX;
        container.scrollTop = scrollTop - walkY;
    });
</script>
