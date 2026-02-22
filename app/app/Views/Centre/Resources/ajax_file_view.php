<?php
$fileName = $view_data['path'];
$ext = strtolower(pathinfo($fileName, PATHINFO_EXTENSION));
$fileUrl = base_url(get_file($fileName)); // Ensure get_file() handles the path logic
?>

<div class="text-center">
    <?php if (in_array($ext, ['jpg', 'jpeg', 'png', 'gif'])): ?>
        <img class="img-fluid gallery-img" src="<?= $fileUrl ?>" alt="<?= esc($fileName) ?>" style="max-height: 500px;" />

    <?php elseif ($ext === 'pdf'): ?>
        <iframe src="<?= $fileUrl ?>" width="100%" height="500px" frameborder="0"></iframe>

    <?php elseif (in_array($ext, ['mp4', 'webm', 'ogg'])): ?>
        <video controls width="100%" style="max-height: 500px;">
            <source src="<?= $fileUrl ?>" type="video/<?= $ext ?>">
            Your browser does not support the video tag.
        </video>

    <?php elseif (in_array($ext, ['mp3', 'wav'])): ?>
        <audio controls class="w-100">
            <source src="<?= $fileUrl ?>" type="audio/<?= $ext ?>">
            Your browser does not support the audio element.
        </audio>

    <?php else: ?>
        <a href="<?= $fileUrl ?>" target="_blank" class="btn btn-primary">Open File</a>
    <?php endif; ?>
</div>
