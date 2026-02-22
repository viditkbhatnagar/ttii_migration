<div class="container mt-4">
    <div class="card">
        <div class="card-header d-flex justify-content-between">
            <h5><?= $fileName ?></h5>
            <a href="<?= site_url("centre/resources/browse/{$currentFolder}") ?>" class="btn btn-sm btn-secondary">
                <i class="ri-arrow-left-line"></i> Back
            </a>
        </div>
        <div class="card-body">
            <?php if (in_array($fileType, ['jpg', 'jpeg', 'png', 'gif'])): ?>
                <img src="data:image/<?= $fileType ?>;base64,<?= base64_encode($fileContent) ?>" 
                     class="img-fluid" alt="<?= $fileName ?>">
            
            <?php elseif ($fileType === 'pdf'): ?>
                <embed src="data:application/pdf;base64,<?= base64_encode($fileContent) ?>" 
                       type="application/pdf" width="100%" height="600px">
            
            <?php else: ?>
                <pre><?= htmlspecialchars($fileContent) ?></pre>
            <?php endif; ?>
        </div>
    </div>
</div>