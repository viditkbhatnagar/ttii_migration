<div class="container pdf-section">
    <div style="padding-top:5px;">
        <div class="row mx-auto text-center p-2" style="width: 400px">
            <div class="col-4">
                <button id="zoom_out" class="btn btn-sm btn-dark" style="width: 90px;">
                    <i class="ri-zoom-out-line"></i>
                </button>
            </div>
            <div class="col-4" style="border-radius:4px; padding:7px; background-color: #3c67b9; color: #fff; font-size: 15px;">
                <span id="zoom_level">140%</span>
            </div>
            <div class="col-4">
                <button id="zoom_in" class="btn btn-sm btn-dark" style="width: 90px;">
                    <i class="ri-zoom-in-line"></i>
                </button>
            </div>
        </div>
        <div id="pdf-container" style="overflow-y: scroll; height: 100vh; border: 1px solid #ccc; background-color: #bababa"></div>
    </div>
</div>

<style>
    .pdf-section {
        overflow-x: scroll;
    }

    #pdf-container canvas {
        direction: ltr;
        margin: 10px auto;
        display: block;
    }

    @media print {
        body { display: none; }
    }

    #pdf-container {
        width: 100%;
        min-height: 100vh;
        overflow: auto;
        cursor: grab;
    }

    #pdf-container:active {
        cursor: grabbing;
    }

    /* Custom scrollbar styles */
    #pdf-container::-webkit-scrollbar {
        width: 5px;
        height: 5px;
    }

    #pdf-container::-webkit-scrollbar-thumb {
        background: #888;
        border-radius: 4px;
    }

    #pdf-container::-webkit-scrollbar-thumb:hover {
        background: #555;
    }

    #pdf-container::-webkit-scrollbar-track {
        background: #f1f1f1;
        border-radius: 4px;
    }

    #pdf-container::-webkit-scrollbar-corner {
        background: #f1f1f1;
    }
</style>

<script src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.9.359/pdf.js"></script>
<script>
    // Disable Canvas Image Downloading and Shortcut Keys
    document.addEventListener('contextmenu', event => event.preventDefault());
    document.addEventListener('keydown', function(event) {
        if (event.ctrlKey || event.key === 'F5' || event.key === 'F12' || event.key === 'F5') {
            event.preventDefault();
        }
    });

    var url = '<?= $file ?>'; // Replace with your PDF file URL

    var pdfjsLib = window['pdfjs-dist/build/pdf'];

    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.9.359/pdf.worker.min.js';

    var scale = 1.4;
    var zoomStep = 0.1;

    document.getElementById('zoom_in').addEventListener('click', function () {
        scale += zoomStep;
        document.getElementById('zoom_level').textContent = Math.round(scale.toFixed(1) * 100) + '%';
        renderAllPages();
    });

    document.getElementById('zoom_out').addEventListener('click', function () {
        if (scale > zoomStep) {
            scale -= zoomStep;
            document.getElementById('zoom_level').textContent = Math.round(scale.toFixed(1) * 100) + '%';
            renderAllPages();
        }
    });

    function renderPage(page) {
        var canvas = document.createElement('canvas');
        document.getElementById('pdf-container').appendChild(canvas);
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
        document.getElementById('pdf-container').innerHTML = '';
        pdfjsLib.getDocument(url).promise.then(function (pdfDoc) {
            var total = pdfDoc.numPages;
            var promises = Array.from({ length: total }, function (_, i) {
                return pdfDoc.getPage(i + 1).then(renderPage);
            });
            return Promise.all(promises);
        });
    }

    renderAllPages();
</script>

<script>
    var container = document.getElementById('pdf-container');
    var isDown = false;
    var startX, startY, scrollLeft, scrollTop;

    container.addEventListener('mousedown', function (e) {
        isDown = true;
        container.style.cursor = 'grabbing';
        startX = e.pageX - container.offsetLeft;
        startY = e.pageY - container.offsetTop;
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
        const x = e.pageX - container.offsetLeft;
        const y = e.pageY - container.offsetTop;
        const walkX = (x - startX) * 1; // Adjust for smoother scrolling
        const walkY = (y - startY) * 1; // Adjust for smoother scrolling
        container.scrollLeft = scrollLeft - walkX;
        container.scrollTop = scrollTop - walkY;
    });
</script>
