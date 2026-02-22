<div class="container">
    <div>
        <?php if (!empty($feeds)) { ?>
            <?php foreach ($feeds as $feed) { ?>
                <div class="card rounded-4 mb-4">
                    <div class="row g-0">
                        <div class="col-md-4 p-3">
                            <img class="rounded-4 w-100 img-fluid object-fit-contain" src="<?= base_url(get_file($feed['image'])) ?>" alt="Card image">
                        </div>
                        <div class="col-md-8">
                            <div class="card-header rounded-4 d-flex align-items-center justify-content-between">
                                <div>
                                    <h5 class="card-title mb-0"><?= $feed['title'] ?></h5>
                                    <p class="card-text"><small class="text-muted">Updated on <?= date('d/m/Y', strtotime($feed['updated_at'])) ?></small></p>
                                </div>
                                <button class="btn btn-myred rounded-3">Share</button>
                            </div>
                            <div class="card-body">
                                <p class="card-text mb-2"><?= $feed['content'] ?></p>
                            </div>
                        </div>
                    </div>
                </div><!-- end card -->
            <?php } ?>
        <?php }else{ ?>
            <p>No feeds available.</p>
        <?php } ?>
    </div>
</div>
