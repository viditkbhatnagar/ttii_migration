<!-- start page title -->
<div class="row">
    <div class="col-12">
        <div class="page-title-box d-sm-flex align-items-center justify-content-between">
            <h4 class="mb-sm-0"><?= $page_title ?? '' ?></h4>

            <div class="page-title-right">
                <ol class="breadcrumb m-0">
                    <li class="breadcrumb-item"><a href="<?= base_url('admin/dashboard/index') ?>">Dashboard</a></li>
                    <li class="breadcrumb-item active"><?= $page_title ?? '' ?></li>
                </ol>
            </div>
        </div>
    </div>
</div>


<div class="row">
    <div class="col-lg-12">
        <div class="d-flex profile-wrapper">
            <!-- Nav tabs -->
            <ul class="nav nav-pills profile-nav gap-2 gap-lg-3 flex-grow-1" role="tablist">
                <li class="nav-item text-dark">
                    <a class="nav-link fs-14 active" data-bs-toggle="tab" href="#overview-tab" role="tab">
                        <i class="ri-airplay-fill d-inline-block d-md-none"></i> <span class="d-none d-md-inline-block">Overview</span>
                    </a>
                </li>
                <li class="nav-item">
                    <a class="nav-link fs-14" data-bs-toggle="tab" href="#students" role="tab">
                        <i class="ri-list-unordered d-inline-block d-md-none"></i> <span class="d-none d-md-inline-block">Students</span>
                    </a>
                </li>
            </ul>
        </div>
        <!-- Tab panes -->
        <div class="tab-content pt-4 text-muted">
            <div class="tab-pane active" id="overview-tab" role="tabpanel">
                <div class="row">
                    
                    <div class="col-xxl-4">
                        <!--card-->
                        <div class="card">
                            <div class="card-body">
                                <h5 class="card-title mb-3">Cohort Info</h5>
                                <div class="table-responsive">
                                    <table class="table table-borderless mb-0">
                                        <tbody>
                                            <tr>
                                                <th class="ps-0" scope="row">Cohort ID :</th>
                                                <td class="text-muted"><?= $list_items['cohort_id'] ?></td>
                                            </tr>
                                            <tr>
                                                <th class="ps-0" scope="row">Title :</th>
                                                <td class="text-muted"><?= $list_items['title'] ?></td>
                                            </tr>
                                            <tr>
                                                <th class="ps-0" scope="row">Course :</th>
                                                <td class="text-muted"><?= $course['title'] ?></td>
                                            </tr>
                                            <tr>
                                                <th class="ps-0" scope="row">Subject :</th>
                                                <td class="text-muted"></td>
                                            </tr>
                                            <tr>
                                                <th class="ps-0" scope="row">Language :</th>
                                                <td class="text-muted"><?= $language['title'] ?></td>
                                            </tr>
                                            <tr>
                                                <th class="ps-0" scope="row">Instructor :</th>
                                                <td class="text-muted"><?= $instructor['name'] ?></td>
                                            </tr>
                                            <tr>
                                                <th class="ps-0" scope="row">Start Date :</th>
                                                <td class="text-muted"><?= $list_items['start_date'] ?></td>
                                            </tr>
                                            <tr>
                                                <th class="ps-0" scope="row">End Date :</th>
                                                <td class="text-muted"><?= $list_items['end_date'] ?></td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                            </div><!-- end card body -->
                        </div>
                        <!-- end card -->
                        
                        <div class="card d-none">
                            <div class="card-body">
                                <h5 class="card-title mb-3">Documents</h5>
                                <div class="table-responsive">
                                    <table class="table table-borderless mb-0">
                                        <tbody>
                                            
                                            <?php
                                            if(!empty($documents))
                                            {
                                                foreach ($documents as $index => $doc)
                                                {
                                            ?>
                                                <tr>
                                                    <th class="ps-0" scope="row"><?=$doc['label']?> :</th>
                                                    <td class="text-muted">                                                    
                                                        <?= !empty($doc['file']) ? '<a href="' . base_url(get_file($doc['file'])) . '" target="_blank" class="btn btn-secondary w-100 btn-sm mb-2 rounded-pill">View File</a>' : '' ?>
                                                    </td>
                                                </tr>
                                            <?php
                                                }
                                            }
                                            ?>
                                            
                                        </tbody>
                                    </table>
                                </div>
                            </div><!-- end card body -->
                        </div>
                        <!-- end card -->

                    </div>
                    <!--end col-->
                    
                    
                    <div class="col-xxl-8">
                        <div class="card">
                            <div class="card-body">
                                <h5 class="card-title mb-3">Announcements</h5>
                                      
                                <div class="row">
                                    <div class="live-preview">
                                        <form >
                                            
                                            <?php
                                            if(!empty($announcements))
                                            {
                                                foreach ($announcements as $index => $announcement)
                                                {
                                            ?>
                                                <div class="row mb-3">
                                                    <div class="col-lg-3">
                                                        <label for="nameInput" class="form-label">Title :</label>
                                                    </div>
                                                    <div class="col-lg-9">
                                                        <h5 class="fs-14 text-truncate mb-1">
                                                            <a href="#" class="text-body"><?= $announcement['title'] ?></a>
                                                        </h5>
                                                    </div>
                                                </div>
                                                
                                                <div class="row mb-3">
                                                    <div class="col-lg-3">
                                                        <label for="nameInput" class="form-label">Content :</label>
                                                    </div>
                                                    <div class="col-lg-9">
                                                        <h5 class="fs-14 text-truncate mb-1">
                                                            <a href="#" class="text-body"><?= $announcement['content'] ?></a>
                                                        </h5>
                                                    </div>
                                                </div>
                                                
                                                <div class="row mb-3">
                                                    <div class="col-lg-3">
                                                        <label for="nameInput" class="form-label">Description :</label>
                                                    </div>
                                                    <div class="col-lg-9">
                                                        <h5 class="fs-14 text-truncate mb-1">
                                                            <a href="#" class="text-body"><?= $announcement['description'] ?></a>
                                                        </h5>
                                                    </div>
                                                </div>
                                            <?php
                                                }
                                            }
                                            ?>
                                            
                                        </form>
                                    </div>
                                </div>
                                <!--end row-->
                            </div>
                            <!--end card-body-->
                        </div><!-- end card -->
                                
                                
                        <!--<div class="card">-->
                        <!--    <div class="card-body">-->
                        <!--        <h5 class="card-title mb-3">Affiliation Information</h5>-->
                                <!-- Swiper -->
                        <!--        <div class="row">-->
                        <!--            <div class="live-preview">-->
                        <!--                <div class="row mb-3">-->
                        <!--                    <div class="col-lg-3">-->
                        <!--                        <label for="nameInput" class="form-label">Date of Registration :</label>-->
                        <!--                    </div>-->
                        <!--                    <div class="col-lg-9">-->
                        <!--                        <h5 class="fs-14 text-truncate mb-1">-->
                        <!--                            <a href="#" class="text-body"></a>-->
                        <!--                        </h5>-->
                        <!--                    </div>-->
                        <!--                </div>-->
                        <!--                <div class="row mb-3">-->
                        <!--                    <div class="col-lg-3">-->
                        <!--                        <label for="nameInput" class="form-label">Date of Expiry :</label>-->
                        <!--                    </div>-->
                        <!--                    <div class="col-lg-9">-->
                        <!--                        <h5 class="fs-14 text-truncate mb-1">-->
                        <!--                            <a href="#" class="text-body"></a>-->
                        <!--                        </h5>-->
                        <!--                    </div>-->
                        <!--                </div>-->
                                        
                        <!--                <div class="row mb-3">-->
                        <!--                    <div class="col-lg-3">-->
                        <!--                        <label for="nameInput" class="form-label">Registration Certificate :</label>-->
                        <!--                    </div>-->
                        <!--                    <div class="col-lg-9">-->
                                                <!--<h5 class="fs-14 text-truncate mb-1">-->
                                                <!--    <a href="#" class="text-body"> -->
                                                <!--        <//?= !empty($registraion_certificate) ? '<a href="' . base_url(get_file($registraion_certificate)) . '" target="_blank" class="btn btn-secondary w-100 btn-sm mb-2 rounded-pill">View File</a>' : '' ?>-->
                                                <!--        <//?php if (empty($registraion_certificate)) : ?>-->
                                                <!--            <small class="text-danger">File not uploaded</small>-->
                                                <!--        <//?php endif; ?>-->
                                                <!--    </a>-->
                                                <!--</h5>-->
                        <!--                    </div>-->
                        <!--                </div>-->
                                        
                        <!--                <div class="row mb-3">-->
                        <!--                    <div class="col-lg-3">-->
                        <!--                        <label for="nameInput" class="form-label">Affiliation Document :</label>-->
                        <!--                    </div>-->
                        <!--                    <div class="col-lg-9">-->
                                                <!--<h5 class="fs-14 text-truncate mb-1">-->
                                                <!--    <a href="#" class="text-body"> -->
                                                <!--        <//?= !empty($affiliation_document) ? '<a href="' . base_url(get_file($affiliation_document)) . '" target="_blank" class="btn btn-secondary w-100 btn-sm mb-2 rounded-pill">View File</a>' : '' ?>-->
                                                <!--        <//?php if (empty($affiliation_document)) : ?>-->
                                                <!--            <small class="text-danger">File not uploaded</small>-->
                                                <!--        <//?php endif; ?>-->
                                                <!--    </a>-->
                                                <!--</h5>-->
                        <!--                    </div>-->
                        <!--                </div>-->
                        <!--            </div>-->
                                    <!--end col-->
                        <!--        </div>-->
                        <!--    </div>-->
                            <!-- end card body -->
                        <!--</div><!-- end card -->
                                
                    </div>
                    <!--end col-->
                </div>
                <!--end row-->
            </div>
                                
                                
            <div class="tab-pane fade" id="students" role="tabpanel">
                
                <div class="card">
                    <div class="card-body">
                        <h5 class="card-title">Students</h5>
                        <!-- Swiper -->
                        <div class="row">
                            <div class="col-lg-12">
                                <div class="table-responsive">
                                    <table class="table table-borderless align-middle mb-0">
                                        <thead class="table-light">
                                            <tr>
                                                <th scope="col">Student ID</th>
                                                <th scope="col">Name</th>
                                                <th scope="col">Email</th>
                                                <!--<th scope="col">Action</th>-->
                                            </tr>
                                        </thead>
                                        <tbody>
                                            <?php foreach ($students as $index => $student): ?>
                                                <tr>
                                                    <td><?= $student['student_id'] ?></td>
                                                    <td><?= $student['name'] ?></td>
                                                    <td><?= $student['email'] ?></td>
                                                    <td class="action d-none">
                                                        <ul class="list-inline hstack gap-2 mb-0">
                                                            <li class="list-inline-item" data-bs-toggle="tooltip" data-bs-trigger="hover" data-bs-placement="top" title="Remove">
                                                                <a href="javascript::void()"  onclick="delete_modal('<?= base_url('admin/cohorts/delete_cohort_student/' . $student['id'] . '/' . $student['cohort_id']) ?>')" class="link-danger fs-15"><i class="ri-delete-bin-line"></i></a>
                                                            </li>
                                                        </ul>
                                                    </td>
                                                </tr>
                                            <?php endforeach; ?>
                                        </tbody>
                                    </table>
                                </div>
                               
                               
                            </div>
                        </div>
                    </div>
                <!-- end card body -->
                </div><!-- end card -->
                
            </div>
            <!--end tab-pane-->
                            
        </div>
        <!--end tab-content-->
    </div>
    <!--end col-->
</div>
                    
                    
<style>
    .profile-nav.nav-pills .nav-link {
        color: black;
    }
    .nav-pills .nav-link.active, .nav-pills .show>.nav-link {
        background-color:#fb803d;
    }
</style>