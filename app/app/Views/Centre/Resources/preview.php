<div class="modal fade show d-block" tabindex="-1" style="background: rgba(0,0,0,0.5)">
  <div class="modal-dialog modal-dialog-centered">
    <div class="modal-content">
      <div class="modal-header">
        <h5><?= esc($file_name) ?></h5>
        <a href="<?= site_url('centre/resources') ?>" class="btn-close"></a>
      </div>
      <div class="modal-body text-center">
        <?php if (in_array($file_type, ['jpg', 'jpeg', 'png', 'gif'])): ?>
          <img src="<?= $file_url ?>" class="img-fluid" style="max-height: 70vh">
        <?php elseif ($file_type === 'pdf'): ?>
          <iframe src="<?= $file_url ?>#toolbar=0" width="100%" height="500px"></iframe>
        <?php endif; ?>
      </div>
      <div class="modal-footer">
        <a href="<?= $file_url ?>" download class="btn btn-primary">Download</a>
        <a href="<?= site_url('centre/resources') ?>" class="btn btn-secondary">Close</a>
      </div>
    </div>
  </div>
</div>