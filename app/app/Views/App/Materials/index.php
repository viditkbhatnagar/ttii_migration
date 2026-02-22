<div class="container mt-4">
    <h3 class="h2 mb-3">Materials
        <a href="<?= base_url('app/course/my_course') ?>" class="btn btn-myred float-end">Back</a>
    </h3>
    <!-- Bootstrap Tabs -->
    <ul class="nav nav-tabs mb-4" id="myTab" role="tablist">
        <li class="nav-item" role="presentation">
            <a class="nav-link active mx-2" id="materials-tab" data-bs-toggle="tab" href="#materials" role="tab" aria-controls="materials" aria-selected="true">Materials</a>
        </li>
        <li class="nav-item" role="presentation">
            <a class="nav-link" id="practice-tab" data-bs-toggle="tab" href="#practice" role="tab" aria-controls="practice" aria-selected="false">Practice</a>
        </li>
    </ul>

    <div class="tab-content" id="myTabContent">
        <!-- Materials Tab -->
        <div class="tab-pane fade show active" id="materials" role="tabpanel" aria-labelledby="materials-tab">
            <?php 
            $materials_available = false;
            if (!empty($material_data['materials'])) { 
                foreach ($material_data['materials'] as $item) { ?>
                    <a href="<?= base_url('app/materials/materials_view/' . $item['id']) ?>" target="_blank" class="text-decoration-none">
                        <div class="card rounded-4 shadow course-list-a mb-3">
                            <div class="card-body py-2 d-flex align-items-center justify-content-between">
                                <div class="d-flex align-items-center">
                                    <div class="px-2">
                                        <i class="bx bxs-file-pdf fs-2 text-info"></i>
                                    </div>
                                    <div class="ms-2">
                                        <h3 class="fw-bold h4 mb-0"><?= $item['title'] ?></h3>
                                    </div>
                                </div>
                                <div>
                                    <i class="ri-arrow-right-s-line" style="font-size: 2.5rem;"></i>
                                </div>
                            </div>
                        </div>
                    </a>
                <?php 
                }
                $materials_available = true;
            } 
            if (!$materials_available) { ?>
                <p>No materials available.</p>
            <?php } ?>
        </div>

        <!-- Practice Tab -->
        <div class="tab-pane fade" id="practice" role="tabpanel" aria-labelledby="practice-tab">
            <?php 
            $practice_available = false;
            if (!empty($material_data['practice'])) { 
                foreach ($material_data['practice'] as $item) { ?>
                    <a href="<?= base_url('app/materials/materials_view/' . $item['id']) ?>" target="_blank" class="text-decoration-none">
                        <div class="card rounded-4 shadow course-list-a mb-3">
                            <div class="card-body py-2 d-flex align-items-center justify-content-between">
                                <div class="d-flex align-items-center">
                                    <div class="px-2">
                                        <i class="bx bxs-file-pdf fs-2 text-info"></i>
                                    </div>
                                    <div class="ms-2">
                                        <h3 class="fw-bold h4 mb-0"><?= $item['title'] ?></h3>
                                    </div>
                                </div>
                                <div>
                                    <i class="ri-arrow-right-s-line" style="font-size: 2.5rem;"></i>
                                </div>
                            </div>
                        </div>
                    </a>
                <?php 
                }
                $practice_available = true;
            } 
            if (!$practice_available) { ?>
                <p>No practice files available.</p>
            <?php } ?>
        </div>
    </div>
</div>

<!-- Custom CSS -->
<style>
    .nav-tabs .nav-link {
        border-radius: 0.375rem;
        border: 1px solid #dee2e6;
    }
    .nav-tabs .nav-link.active {
        color: #fff;
        background-color: #007bff;
        border-color: #007bff;
    }
    .card {
        transition: transform 0.2s ease;
    }
    .card:hover {
        transform: translateY(-5px);
        box-shadow: 0 4px 8px rgba(0,0,0,0.1);
    }
    .btn-myred {
        background-color: #dc3545;
        color: white;
    }
    .btn-myred:hover {
        background-color: #c82333;
        color: white;
    }
</style>
