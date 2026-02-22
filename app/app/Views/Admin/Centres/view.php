<!-- start page title -->
<div class="row">
    <div class="col-12">
        <div class="page-title-box d-sm-flex align-items-center justify-content-between">
            <h4 class="mb-sm-0"><?= $page_title ?? '' ?></h4>

            <div class="page-title-right">
                <ol class="breadcrumb m-0">
                    <li class="breadcrumb-item"><a href="<?= base_url('admin/dashboard/index') ?>">Dashboard</a></li>
                    <li class="breadcrumb-item"><a href="<?= base_url('admin/centres/index') ?>">Centre</a></li>
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
                <li class="nav-item d-none">
                    <a class="nav-link fs-14" data-bs-toggle="tab" href="#activities" role="tab">
                        <i class="ri-list-unordered d-inline-block d-md-none"></i> <span class="d-none d-md-inline-block">Student Details</span>
                    </a>
                </li>
                <li class="nav-item d-none">
                    <a class="nav-link fs-14" data-bs-toggle="tab" href="#documents" role="tab">
                        <i class="ri-list-unordered d-inline-block d-md-none"></i> <span class="d-none d-md-inline-block">Documents & Uploads</span>
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
                                <h5 class="card-title mb-3">Basic Info</h5>
                                <div class="table-responsive">
                                    <table class="table table-borderless mb-0">
                                        <tbody>
                                            <tr>
                                                <th class="ps-0" scope="row">Centre ID :</th>
                                                <td class="text-muted"><?=$view_data['centre_id']?></td>
                                            </tr>
                                            <tr>
                                                <th class="ps-0" scope="row">Centre Name :</th>
                                                <td class="text-muted"><?=$view_data['centre_name']?></td>
                                            </tr>
                                            <tr>
                                                <th class="ps-0" scope="row">Country Code :</th>
                                                <td class="text-muted"><?= $view_data['country_id'] ?? 'N/A' ?></td>
                                            </tr>
                                            <tr>
                                                <th class="ps-0" scope="row">State :</th>
                                                <td class="text-muted"><?=$view_data['state_id'] ?? 'N/A' ?></td>
                                            </tr>
                                            <tr>
                                                <th class="ps-0" scope="row">District :</th>
                                                <td class="text-muted"><?=$view_data['district_id'] ?? 'N/A' ?></td>
                                            </tr>
                                            <tr>
                                                <th class="ps-0" scope="row">Address :</th>
                                                <td class="text-muted"><?=$view_data['address'] ?? 'N/A' ?></td>
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
                                <h5 class="card-title mb-3">Contact Information</h5>
                                      
                                <div class="row">
                                    <div class="live-preview">
                                        <form >
                                            <div class="row mb-3">
                                                <div class="col-lg-3">
                                                    <label for="nameInput" class="form-label">Contact Person :</label>
                                                </div>
                                                <div class="col-lg-9">
                                                    <h5 class="fs-14 text-truncate mb-1">
                                                        <a href="#" class="text-body"><?=$view_data['contact_person']?></a>
                                                    </h5>
                                                </div>
                                            </div>
                                            
                                            <div class="row mb-3">
                                                <div class="col-lg-3">
                                                    <label for="nameInput" class="form-label">Designation :</label>
                                                </div>
                                                <div class="col-lg-9">
                                                    <h5 class="fs-14 text-truncate mb-1">
                                                        <a href="#" class="text-body"><?=$view_data['contact_person_designation']?></a>
                                                    </h5>
                                                </div>
                                            </div>
                                            
                                            <div class="row mb-3">
                                                <div class="col-lg-3">
                                                    <label for="nameInput" class="form-label">Phone :</label>
                                                </div>
                                                <div class="col-lg-9">
                                                    <h5 class="fs-14 text-truncate mb-1">
                                                        <a href="#" class="text-body"><?=$view_data['country_code']?>  <?=$view_data['phone']?></a>
                                                    </h5>
                                                </div>
                                            </div>
                                            
                                            <div class="row mb-3">
                                                <div class="col-lg-3">
                                                    <label for="nameInput" class="form-label">Whatsapp :  </label>
                                                </div>
                                                <div class="col-lg-9">
                                                    <h5 class="fs-14 text-truncate mb-1">
                                                        <a href="#" class="text-body"><?=$view_data['whatsapp']?></a>
                                                    </h5>
                                                </div>
                                            </div>
                                            
                                            <div class="row mb-3">
                                                <div class="col-lg-3">
                                                    <label for="nameInput" class="form-label">Email :  </label>
                                                </div>
                                                <div class="col-lg-9">
                                                    <h5 class="fs-14 text-truncate mb-1">
                                                        <a href="#" class="text-body"><?=$view_data['email']?></a>
                                                    </h5>
                                                </div>
                                            </div>
                                            
                                            <div class="row mb-3">
                                                <div class="col-lg-3">
                                                    <label for="nameInput" class="form-label">Alternative Contact : </label>
                                                </div>
                                                <div class="col-lg-9">
                                                    <h5 class="fs-14 text-truncate mb-1">
                                                        <a href="#" class="text-body"> <?=$view_data['secondary_phone']?></a>
                                                    </h5>
                                                </div>
                                            </div>
                                            
                                          
                                        </form>
                                    </div>
                                </div>
                                <!--end row-->
                            </div>
                            <!--end card-body-->
                        </div><!-- end card -->
                                
                                
                        <div class="card">
                            <div class="card-body">
                                <h5 class="card-title mb-3">Affiliation Information</h5>
                                <!-- Swiper -->
                                <div class="row">
                                    <div class="live-preview">
                                        <div class="row mb-3">
                                            <div class="col-lg-3">
                                                <label for="nameInput" class="form-label">Date of Registration :</label>
                                            </div>
                                            <div class="col-lg-9">
                                                <h5 class="fs-14 text-truncate mb-1">
                                                    <a href="#" class="text-body"><?=$view_data['date_of_registration']?></a>
                                                </h5>
                                            </div>
                                        </div>
                                        <div class="row mb-3">
                                            <div class="col-lg-3">
                                                <label for="nameInput" class="form-label">Date of Expiry :</label>
                                            </div>
                                            <div class="col-lg-9">
                                                <h5 class="fs-14 text-truncate mb-1">
                                                    <a href="#" class="text-body"><?=$view_data['date_of_expiry']?></a>
                                                </h5>
                                            </div>
                                        </div>
                                        
                                        <div class="row mb-3">
                                            <div class="col-lg-3">
                                                <label for="nameInput" class="form-label">Registration Certificate :</label>
                                            </div>
                                            <div class="col-lg-9">
                                                <h5 class="fs-14 text-truncate mb-1">
                                                    <a href="#" class="text-body"> 
                                                        <?= !empty($registraion_certificate) ? '<a href="' . base_url(get_file($registraion_certificate)) . '" target="_blank" class="btn btn-secondary w-100 btn-sm mb-2 rounded-pill">View File</a>' : '' ?>
                                                        <?php if (empty($registraion_certificate)) : ?>
                                                            <small class="text-danger">File not uploaded</small>
                                                        <?php endif; ?>
                                                    </a>
                                                </h5>
                                            </div>
                                        </div>
                                        
                                        <div class="row mb-3">
                                            <div class="col-lg-3">
                                                <label for="nameInput" class="form-label">Affiliation Document :</label>
                                            </div>
                                            <div class="col-lg-9">
                                                <h5 class="fs-14 text-truncate mb-1">
                                                    <a href="#" class="text-body"> 
                                                        <?= !empty($affiliation_document) ? '<a href="' . base_url(get_file($affiliation_document)) . '" target="_blank" class="btn btn-secondary w-100 btn-sm mb-2 rounded-pill">View File</a>' : '' ?>
                                                        <?php if (empty($affiliation_document)) : ?>
                                                            <small class="text-danger">File not uploaded</small>
                                                        <?php endif; ?>
                                                    </a>
                                                </h5>
                                            </div>
                                        </div>
                                    </div>
                                    <!--end col-->
                                </div>
                            </div>
                            <!-- end card body -->
                        </div><!-- end card -->
                                
                    </div>
                    <!--end col-->
                </div>
                <!--end row-->
            </div>
                                
                                
            <div class="tab-pane fade" id="activities" role="tabpanel">
                
                <div class="card">
                    <div class="card-body">
                        <h5 class="card-title">Students</h5>
                        <!-- Swiper -->
                        <div class="row">
                            <div class="col-lg-12">
                                <div class="table-responsive">
                                    <table class="table table-borderless align-middle mb-0 d-none">
                                        <thead class="table-light">
                                            <tr>
                                                <th scope="col">Qualification</th>
                                                <th scope="col">Board/University</th>
                                                <th scope="col">Percentage</th>
                                                <th scope="col">Degree Uploaded</th>
                                                <th scope="col">Marksheet Uploaded</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                        <?php
                                            $qualifications = ['10th', '12th', 'Degree'];
                                            foreach ($qualifications as $index => $qual) :
                                                $board = isset($qualification[$index]['board']) ? $qualification[$index]['board'] : '';
                                                $percentage = isset($qualification[$index]['percentage']) ? $qualification[$index]['percentage'] : '';
                                                $certificate = isset($qualification[$index]['certificate']) ? $qualification[$index]['certificate'] : '';
                                                $marksheet = isset($qualification[$index]['marksheet']) ? $qualification[$index]['marksheet'] : '';
                                            ?>
                                                <tr>
                                                    <td><?= $qual ?></td>
                                                    <td><?= $board ?></td>
                                                    <td><?= $percentage ?></td>
                                                    <td>
                                                        <?= !empty($certificate) ? '<a href="' . base_url(get_file($certificate)) . '" target="_blank" class="btn btn-secondary w-100 btn-sm mb-2 rounded-pill">View File</a>' : '' ?>
                                                        <?php if (empty($certificate)) : ?>
                                                            <small class="text-danger">File not uploaded</small>
                                                        <?php endif; ?>
                                                    </td>
                                                    <td>
                                                        <?= !empty($marksheet) ? '<a href="' . base_url(get_file($marksheet)) . '" target="_blank" class="btn btn-secondary w-100 btn-sm mb-2 rounded-pill">View File</a>' : '' ?>
                                                        <?php if (empty($marksheet)) : ?>
                                                            <small class="text-danger">File not uploaded</small>
                                                        <?php endif; ?>
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
                                
                               
            <div class="tab-pane fade" id="documents" role="tabpanel">
                <div class="card ">
                    <div class="card-body">
                        <div class="d-flex align-items-center mb-4">
                            <h5 class="card-title flex-grow-1 mb-0">Documents</h5>
                            <div class="flex-shrink-0">
                                <input class="form-control" type="file" id="formFile">
                                <label for="formFile" class="btn btn-danger mt-2"><i class="ri-upload-2-fill me-1 align-bottom"></i> Upload File</label>
                            </div>
                        </div>
                        <div class="row d-none">
                            <div class="col-lg-12">
                                <div class="table-responsive">
                                    <table class="table table-borderless align-middle mb-0">
                                        <thead class="table-light">
                                            <tr>
                                                <th scope="col">File Name</th>
                                                <th scope="col">Type</th>
                                                <th scope="col">Size</th>
                                                <th scope="col">Upload Date</th>
                                                <th scope="col">Action</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            <tr>
                                                <td>
                                                    <div class="d-flex align-items-center">
                                                        <div class="avatar-sm">
                                                            <div class="avatar-title bg-primary-subtle text-primary rounded fs-20">
                                                                <i class="ri-file-zip-fill"></i>
                                                            </div>
                                                        </div>
                                                        <div class="ms-3 flex-grow-1">
                                                            <h6 class="fs-15 mb-0"><a href="javascript:void(0)">Artboard-documents.zip</a>
                                                            </h6>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td>Zip File</td>
                                                <td>4.57 MB</td>
                                                <td>12 Dec 2021</td>
                                                <td>
                                                    <div class="dropdown">
                                                        <a href="javascript:void(0);" class="btn btn-light btn-icon" id="dropdownMenuLink15" data-bs-toggle="dropdown" aria-expanded="true">
                                                            <i class="ri-equalizer-fill"></i>
                                                        </a>
                                                        <ul class="dropdown-menu dropdown-menu-end" aria-labelledby="dropdownMenuLink15">
                                                            <li><a class="dropdown-item" href="javascript:void(0);"><i class="ri-eye-fill me-2 align-middle text-muted"></i>View</a></li>
                                                            <li><a class="dropdown-item" href="javascript:void(0);"><i class="ri-download-2-fill me-2 align-middle text-muted"></i>Download</a></li>
                                                            <li class="dropdown-divider"></li>
                                                            <li><a class="dropdown-item" href="javascript:void(0);"><i class="ri-delete-bin-5-line me-2 align-middle text-muted"></i>Delete</a></li>
                                                        </ul>
                                                    </div>
                                                </td>
                                            </tr>
                                            <tr>
                                                <td>
                                                    <div class="d-flex align-items-center">
                                                        <div class="avatar-sm">
                                                            <div class="avatar-title bg-danger-subtle text-danger rounded fs-20">
                                                                <i class="ri-file-pdf-fill"></i>
                                                            </div>
                                                        </div>
                                                        <div class="ms-3 flex-grow-1">
                                                            <h6 class="fs-15 mb-0"><a href="javascript:void(0);">Bank Management System</a></h6>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td>PDF File</td>
                                                <td>8.89 MB</td>
                                                <td>24 Nov 2021</td>
                                                <td>
                                                    <div class="dropdown">
                                                        <a href="javascript:void(0);" class="btn btn-light btn-icon" id="dropdownMenuLink3" data-bs-toggle="dropdown" aria-expanded="true">
                                                            <i class="ri-equalizer-fill"></i>
                                                        </a>
                                                        <ul class="dropdown-menu dropdown-menu-end" aria-labelledby="dropdownMenuLink3">
                                                            <li><a class="dropdown-item" href="javascript:void(0);"><i class="ri-eye-fill me-2 align-middle text-muted"></i>View</a></li>
                                                            <li><a class="dropdown-item" href="javascript:void(0);"><i class="ri-download-2-fill me-2 align-middle text-muted"></i>Download</a></li>
                                                            <li class="dropdown-divider"></li>
                                                            <li><a class="dropdown-item" href="javascript:void(0);"><i class="ri-delete-bin-5-line me-2 align-middle text-muted"></i>Delete</a></li>
                                                        </ul>
                                                    </div>
                                                </td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <!--end tab-pane-->
        </div>
        <!--end tab-content-->
    </div>
    <!--end col-->
</div>
                    


                                <div class="card">
                                            <div class="card-body">
                                                <h5 class="card-title">Course Plans Assign</h5>
                                                <!-- Payment Table -->
                                                    <div class="col-12">
                                                        <!-- Add New Button -->
                                                        <div class="col-12">
                                                            <div class="text-end mt-3">
                                                                <button 
                                                                    class="btn btn-primary rounded-3"
                                                                    onclick="show_ajax_modal('<?= base_url('admin/centres/ajax_assign_plan/' . $view_data['id']) ?>', 'Assign Course Plan')">
                                                                    <i class="ri-add-line me-2"></i>
                                                                    Assign Course Plan
                                                                </button>
                                                            </div>
                                                        </div>
                                                        <div class="card">
                                                            <div class="card-body">
                                                                <div class="table-responsive">
                                                                    <table class="data_table_basic table table-bordered">
                                                                        <thead class="table-light">
                                                                            <tr>
                                                                                <th>Sl No</th>
                                                                                <th>Course</th>
                                                                                <th>Assigned Amount</th>
                                                                                <th>Start Date</th>
                                                                                <th>End Date</th>
                                                                                <th>Status</th>
                                                                                <th>Action</th>
                                                                            </tr>
                                                                        </thead>
                                                                        <tbody id="payment-rows">
                                                                            <?php if (isset($view_data['id']) && $view_data['centre_course_plans']) : ?>
                                                                                <?php foreach ($view_data['centre_course_plans'] as $key => $plans): ?>
                                                                                    <tr>
                                                                                        <td><?= $key + 1; ?></td>
                                                                                        <td><?= $plans['course_title']; ?></td>
                                                                                        <td>INR <?= number_format($plans['assigned_amount'], 2) ?></td>
                                                                                        <td><?= $plans['start_date'] ? date('d/m/Y', strtotime($plans['start_date'])) : '' ?></td>
                                                                                        <td><?= $plans['end_date'] ? date('d/m/Y', strtotime($plans['end_date'])) : '' ?></td>
                                                                                        <td
                                                                                            <?php
                                                                                            $today = date('Y-m-d');
                                                                                            $end_date = $plans['end_date'];

                                                                                            if ($end_date < $today) {
                                                                                                echo '<span class="badge rounded-pill bg-danger">Expired</span>';
                                                                                            } elseif ($end_date === $today) {
                                                                                                echo '<span class="badge rounded-pill bg-info">Ends Today</span>';
                                                                                            } else {
                                                                                                echo '<span class="badge rounded-pill bg-success">Active Plan</span>';
                                                                                            }
                                                                                            ?>
                                                                                        </td>
                                                                                        <td>
                                                                                            <a onclick="show_ajax_modal('<?= base_url('admin/centres/ajax_edit_plan/' . $plans['id']) ?>', 'Edit Course Plan')" class="btn btn-sm btn-primary">
                                                                                                <i class="ri-pencil-line"></i>
                                                                                            </a>
                                                                                            <a onclick="delete_modal('<?= base_url('admin/centres/delete_assign_plan/' . $plans['id']. '/' . $view_data['id']) ?>')" class="btn btn-sm btn-danger">
                                                                                                <i class="ri-delete-bin-line"></i>
                                                                                            </a>
                                                                                        </td>
                                                                                    </tr>
                                                                                <?php endforeach; ?>
                                                                            <?php else : ?>
                                                                                <!-- <div class="alert alert-warning" role="alert">
                                                                                    Please provide basic information and course details first.
                                                                                </div> -->
                                                                            <?php endif; ?>
                                                                        </tbody>

                                                                    </table>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                            </div>
                                        <!-- end card body -->
                                </div><!-- end card -->




<style>
    .profile-nav.nav-pills .nav-link {
        color: black;
    }
    .nav-pills .nav-link.active, .nav-pills .show>.nav-link {
        background-color:#fb803d;
    }
</style>