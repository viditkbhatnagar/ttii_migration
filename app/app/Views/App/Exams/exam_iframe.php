<div class="iframe-container">
    <iframe src="<?= $exam_url ?>" frameborder="0" allowfullscreen></iframe>
</div>
<style>
    .iframe-container {
    position: relative;
    width: 100%;
    height: 0;
    padding-top: 56.25%; /* Aspect ratio for 16:9 screens */
    overflow: hidden;
}

.iframe-container iframe {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
}

</style>