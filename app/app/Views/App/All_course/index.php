<div class="row">
    <div class="col-12">
        <div class="page-title-box d-sm-flex align-items-center justify-content-between">
            <h4 class="mb-sm-0"><?=$page_title ?? ''?></h4>
            <div class="page-title-right">
                <ol class="breadcrumb m-0">
                    <li class="breadcrumb-item"><a href="<?=base_url('admin/dashboard/index')?>">Dashboard</a></li>
                    <li class="breadcrumb-item active"><?=$page_title ?? ''?></li>
                </ol>
            </div>
        </div>
    </div>
</div>
<!-- End page title -->

<!-- Tabs and Search -->
<div class="row mb-3">
    <div class="col-12 col-md-8">
        <ul class="nav nav-tabs nav-border-top nav-border-top-primary mb-3" role="tablist">
            <li class="nav-item">
                <a class="nav-link " href="<?=base_url('app/My_course/index')?>" role="tab" aria-selected="true">
                    My Courses
                </a>
            </li>
            <li class="nav-item">
                <a class="nav-link active" href="<?=base_url('app/All_course/index')?>" role="tab" aria-selected="false">
                    All Courses
                </a>
            </li>
        </ul>
    </div>
    <div class="col-12 col-md-4">
        <div class="search-container">
            <input type="text" placeholder="Search courses..." class="search-input">
            <i class="fa fa-search search-button"></i>
        </div>
    </div>
</div>

<!-- Course Cards -->
<div class="row">
    <!-- Card 1 -->
    <div class="col-sm-6 col-xl-3 mb-4">
        <div class="card">
            <img class="img-fluid" src="https://bright-culture.com/wp-content/uploads/2021/06/learn-chemistry-optimized.jpg" alt="Card image cap" />
            <div class="card-body">
                <h6 class="card-subtitle font-14 text-muted">Chemistry</h6>
                <h4 class="card-title mb-2">Chemistry for Beginners</h4>
                <p class="card-text">Lorem ipsum dolor sit amet consectetur, adipisicing elit.</p>
                <div class="rating text-warning">
                    <i class="bx bxs-star"></i>
                    <i class="bx bxs-star"></i>
                    <i class="bx bxs-star"></i>
                    <i class="bx bxs-star"></i>
                    <i class="bx bx-star"></i>
                    <span>(4.5)</span>
                </div>
                <div class="progress-bar-wrapper">
                    <div class="progress">
                        <div class="progress-bar" role="progressbar" style="width: 75%;" aria-valuenow="75" aria-valuemin="0" aria-valuemax="100"></div>
                    </div>
                    <small class="text-muted">Progress: 75%</small>
                </div>
            </div>
            <div class="card-footer">
                <a href="<?=base_url('app/Course/index')?>" class="card-link link-secondary">Course Details <i class="bx bxs-info-circle"></i></a>
                <a href="<?=base_url('app/My_subjects/index')?>" class="card-link link-success">Start Lesson <i class="bx bx-play-circle"></i></a>
            </div>
        </div>
    </div>
</div>
<style>
    .page-title-box {
            margin-bottom: 20px;
        }
        .search-container {
            display: flex;
            align-items: center;
            background-color: #fff;
            border-radius: 3em;
            padding: 5px;
            width: 100%;
            max-width: 500px;
            margin-top: 10px;
        }
        .search-input {
            border: none;
            padding: 4px;
            border-radius: 25px;
            padding-left: 16px;
            width: 100%;
            outline: none;
            font-size: 13px;
        }
        .search-button {
            border: none;
            color: black;
            padding: 10px 20px;
            margin-left: 10px;
            cursor: pointer;
            transition: background-color 0.3s;
        }
        .search-button i {
            font-size: 16px;
        }
        .search-button:hover {
            background-color: #0056b3;
        }
        .nav-tabs .nav-link {
            border: none;
            font-weight: 600;
            padding: 10px 15px;
            transition: background-color 0.3s, color 0.3s;
        }
        .nav-tabs .nav-link.active {
            background-color: transparent;
            border-bottom: 2px solid #007bff;
            
            color: #007bff;
        }
        .nav-tabs .nav-link:hover {
            background-color: #e9ecef;
        }
        .card {
            border: 1px solid #e0e0e0;
            border-radius: 15px;
            overflow: hidden;
            transition: transform 0.3s ease, box-shadow 0.3s ease;
        }
        .card:hover {
            transform: translateY(-5px);
            box-shadow: 0 8px 16px rgba(0, 0, 0, 0.15);
        }
        .card-body {
            padding: 1.25rem;
        }
        .card-subtitle {
            margin-bottom: 0.5rem;
        }
        .card-title {
            font-size: 1.25rem;
            margin-bottom: 0.5rem;
        }
        .card-text {
            font-size: 0.875rem;
            color: #6c757d;
        }
        .card-footer {
            background: #f8f9fa;
            border-top: 1px solid #e0e0e0;
            padding: 0.75rem 1.25rem;
        }
        .card-footer .card-link {
            font-size: 0.875rem;
        }
        .rating {
            display: flex;
            align-items: center;
            gap: 0.5rem;
            margin-bottom: 1rem;
        }
        .rating .fa-star {
            color: #ffc107;
        }
        .progress-bar {
            background-color: #007bff;
            transition: width 0.6s ease;
        }
        .progress-bar-wrapper {
            margin-top: 1rem;
        }
    </style>
    
<script>
    document.querySelector('.search-input').addEventListener('input', function() {
    const query = this.value.toLowerCase();
    const cards = document.querySelectorAll('.card');
    
    cards.forEach(card => {
        const title = card.querySelector('.card-title').textContent.toLowerCase();
        if (title.includes(query)) {
            card.parentElement.style.display = 'block';
        } else {
            card.parentElement.style.display = 'none';
        }
    });
});

</script>