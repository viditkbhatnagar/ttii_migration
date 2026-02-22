<style>
    .play-btn-circle {
        width: 65px;
        height: 65px;
        background: rgba(0,0,0,0.55);
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all .25s ease;
    }

    .play-btn-icon {
        font-size: 32px;
        color: #fff;
        margin-left: 4px; /* visually center the ▲ */
    }

    .play-btn-hover:hover .play-btn-circle {
        background: rgba(0,0,0,0.8);
        transform: scale(1.12);
    }
</style>

<!-- Page Title -->
<div class="row">
    <div class="col-12">
        <div class="page-title-box d-sm-flex align-items-center justify-content-between">
            <h4 class="mb-sm-0"><?= $page_title ?? 'Training Library' ?></h4>

            <div class="page-title-right">
                <ol class="breadcrumb m-0">
                    <li class="breadcrumb-item">
                        <a href="<?= base_url('centre/dashboard/index') ?>">Dashboard</a>
                    </li>
                    <li class="breadcrumb-item active"><?= $page_title ?? '' ?></li>
                </ol>
            </div>
        </div>
    </div>
</div>

<!-- Search & Filters -->
<div class="row mb-3">
    <div class="col-md-6">
        <div class="search-box">
            <i class="ri-search-line search-icon"></i>
            <input type="text" id="searchVideos" class="form-control" placeholder="Search videos...">
        </div>
    </div>

</div>

<!-- Filters -->
<div class="row mb-4">
    <div class="col-12 d-flex gap-2">
        <button class="btn btn-outline-dark active filter-btn" data-filter="all">All</button>
        <button class="btn btn-outline-dark filter-btn" data-filter="Live">Live</button>
        <button class="btn btn-outline-dark filter-btn" data-filter="Lectures">Lectures</button>
        <button class="btn btn-outline-dark filter-btn" data-filter="Tutorials">Tutorials</button>
    </div>
</div>

<!-- Video Grid -->
<div class="row" id="trainingGrid">
    <?php if (!empty($list_items)) : ?>
        <?php foreach ($list_items as $item): ?>
            <div class="col-md-4 mb-4 video-card"
                 data-category="<?= esc($item['category']) ?>"
                 data-title="<?= esc($item['title']) ?>">

                <div class="card shadow-sm border-0 h-100">

                    <!-- Thumbnail or Color Block -->
                    <div class="ratio ratio-16x9 position-relative"
                        style="background: #<?= rand(100000, 999999) ?>; border-radius: .75rem;">

                        <?php if (!empty($item['thumbnail'])): ?>
                            <img src="<?= base_url(get_file($item['thumbnail'])) ?>"
                                class="w-100 h-100 rounded-top object-cover">
                        <?php endif; ?>

                        <div class="overlay d-flex align-items-center justify-content-center">
                            <!-- Play Button Overlay -->
                        <a href="<?= $item['video_url'] ?>" 
                        target="_blank"
                        class="position-absolute top-50 start-50 translate-middle play-btn-hover "
                        style="text-decoration:none;">
                            <div class="play-btn-circle">
                                <i class="ri-play-fill play-btn-icon"></i>
                            </div>
                        </a>
                        </div>
                        
                    </div>


                    <div class="card-body">
                        <h5 class="mb-1"><?= esc($item['title']) ?>
                        
                            <?php if ($item['category'] === 'Live'): ?>
                                <span class="badge bg-danger position-absolute top-0 end-0 m-2">LIVE</span> 
                            <?php elseif ($item['category'] === 'Lectures'): ?>
                                <span class="badge bg-info position-absolute top-0 end-0 m-2">LECTURE</span> 
                            <?php elseif ($item['category'] === 'Tutorials'): ?>
                                <span class="badge bg-success position-absolute top-0 end-0 m-2">TUTORIAL</span>
                            <?php endif ?></h5>

                        <p class="text-muted mb-1">
                            <i class="ri-book-line"></i>
                            <?= !empty($item['description']) ? htmlspecialchars_decode($item['description']) : ''; ?>
                        </p>

                        <p class="text-muted small mb-2">
                            <i class="ri-book-open-line"></i>
                            <?= esc($item['category']) ?>
                        </p>


                    </div>
                </div>
            </div>
        <?php endforeach ?>
    <?php else : ?>
        <div class="col-12 text-center text-muted">
            No videos available.
        </div>
    <?php endif ?>
</div>

<script>
    // Search
    document.getElementById('searchVideos').addEventListener('keyup', function () {
        const value = this.value.toLowerCase();
        document.querySelectorAll('.video-card').forEach(card => {
            const title = card.dataset.title.toLowerCase();
            card.style.display = title.includes(value) ? '' : 'none';
        });
    });

    // Filters
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', function () {
            document.querySelector('.filter-btn.active').classList.remove('active');
            this.classList.add('active');

            const filter = this.dataset.filter;
            document.querySelectorAll('.video-card').forEach(card => {
                const category = card.dataset.category;
                card.style.display = (filter === 'all' || category === filter) ? '' : 'none';
            });
        });
    });
</script>
