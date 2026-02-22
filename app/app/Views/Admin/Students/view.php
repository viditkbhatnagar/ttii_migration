
                    
                    <div class="profile-foreground position-relative mx-n4 mt-n4">
                        <!-- <div class="profile-wid-bg"> -->
                            <!-- <img src="assets/images/profile-bg.jpg" alt="" class="profile-wid-img" />
                        </div> -->
                    </div>
                   <div class="card shadow-sm">
                        <div class="card-body">
                            
                            <div class="row g-4 align-items-center ">
                                <!-- Left Column: Profile Picture -->
                                <div class="col-md-2 text-center text-md-center p-3">
                                    <div class="avatar-lg">
                                        <?php 
                                        if (isset($view_data['profile_picture']) && !empty($view_data['profile_picture'])) { ?>
                                            <img src="<?= base_url(get_file($view_data['profile_picture'])) ?>" alt="user-img" class="img-thumbnail rounded-circle" />
                                        <?php } else { ?>
                                            <img src="<?= base_url('assets/admin/images/place-holder/profile-place-holder.jpg') ?>" alt="user-img" class="img-thumbnail rounded-circle" />
                                        <?php } ?>
                                    </div>
                                </div>

                                <!-- Middle Column: Details -->
                                <div class="col-md-5 p-3 border-end">
                                    <h3 class="mb-3"><?=$view_data['name']?></h3>
                                    <div class="mb-2 text-muted">
                                        <i class="ri-profile-line"></i>
                                        Student ID: <?= $view_data['student_id'] ?? '' ?>
                                    </div>

                                    <div class="mb-2 text-muted">
                                        <i class="ri-user-3-line me-1"></i>
                                        Gender: <?= $user_data['gender'] ?? 'Not specified' ?> | Age: <?= $user_data['age'] ?? '--' ?>
                                    </div>
                                    
                                    <div class="mb-2 text-muted">
                                        <i class="ri-phone-line me-1"></i>
                                        Contact : <?= $view_data['country_code'] ?? '+91' ?> <?= $view_data['phone'] ?? '' ?>
                                    </div>
                                   
                                    
                                </div>

                                <!-- Right Column: Additional Info -->
                                <div class="col-md-4 p-3">
                                    <div class="mb-2 text-muted">
                                        <i class="ri-mail-line me-1"></i>
                                        Email : <?= $view_data['user_email'] ?? '' ?>
                                    </div>
                                     <div class="mb-2 text-muted">
                                        <i class="ri-calendar-line me-1"></i>
                                        Date Of Birth: <?= $user_data['date_of_birth'] ?? '' ?>
                                    </div>
                                    <div class="mb-2 text-muted">
                                        <i class="ri-bank-card-2-line me-1"></i>
                                        Aadhar No: <?= $user_data['aadhar_no'] ?? '' ?>
                                    </div>
                                    <div class="mb-2 text-muted">
                                        <i class="ri-map-pin-user-line me-1"></i>
                                        <?= $user_data['address'] ?? '' ?>, <?= $user_data['district'] ?? '' ?>, <?= $user_data['state'] ?? '' ?>
                                    </div>
                                </div>
                            </div>
                            <div class="row g-4 justify-content-end border-bottom pb-3 mb-3">
                                    <div class="col-md-1 order-last bg-danger text-white text-center rounded p-2 me-2">
                                        <a href="javascript::void()" class="dropdown-item remove-item-btn" onclick="delete_modal('<?= base_url('admin/students/delete/' . $view_data['id']) ?>')">
                                            <i class="ri-delete-bin-fill align-bottom me-2"></i> Delete
                                        </a>
                                    </div>
                            </div>
                             <!-- Tabs -->
                            <ul class="nav nav-pills gap-2" role="tablist">
                                <li class="nav-item">
                                    <a class="nav-link active" data-bs-toggle="tab" href="#overview-tab" role="tab">Overview</a>
                                </li>
                                <li class="nav-item d-none">
                                    <a class="nav-link" data-bs-toggle="tab" href="#activities" role="tab">Academic/Professional Details</a>
                                </li>
                                <li class="nav-item">
                                    <a class="nav-link" data-bs-toggle="tab" href="#projects" role="tab">Enrolment & Payments</a>
                                </li>
                                <li class="nav-item">
                                    <a class="nav-link" data-bs-toggle="tab" href="#documents" role="tab">LMS Progress</a>
                                </li>
                                
                            </ul>
                            
                        </div>
                    </div>

                                          
                    <div class="row">
                        <div class="col-lg-12">
                            <div>
                                <!-- Tab panes -->
                                <div class="tab-content pt-1 text-muted">
                                    <div class="tab-pane active" id="overview-tab" role="tabpanel">
                                        <div class="row">
                                           
                                            <div class="col-xxl-6">
                                                <div class="card d-none">
                                                    <div class="card-body">
                                                        <h5 class="card-title mb-5">Complete Your Profile</h5>
                                                        <div class="progress animated-progress custom-progress progress-label">
                                                            <div class="progress-bar bg-danger" role="progressbar" style="width: 30%" aria-valuenow="30" aria-valuemin="0" aria-valuemax="100">
                                                                <div class="label">30%</div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div class="card">
                                                    <div class="card-body">
                                                        <h5 class="card-title mb-3">Basic Info</h5>
                                                        <div class="table-responsive">
                                                            <table class="table table-borderless mb-0">
                                                                <tbody>
                                                                    <tr>
                                                                        <th class="ps-0" scope="row">St ID :</th>
                                                                        <td class="text-muted"><?=$view_data['student_id']?></td>
                                                                    </tr>
                                                                    <tr>
                                                                        <th class="ps-0" scope="row">Full Name :</th>
                                                                        <td class="text-muted"><?=$view_data['name']?></td>
                                                                    </tr>
                                                                    <tr>
                                                                        <th class="ps-0" scope="row">Mobile :</th>
                                                                        <td class="text-muted"><?=$view_data['country_code']?>  <?=$view_data['phone']?></td>
                                                                    </tr>
                                                                    <tr>
                                                                        <th class="ps-0" scope="row">Father's Name :</th>
                                                                        <td class="text-muted"><?=$user_data['father_name'] ?? ''?></td>
                                                                    </tr>
                                                                     <tr>
                                                                        <th class="ps-0" scope="row">Mother's Name :</th>
                                                                        <td class="text-muted"><?=$user_data['mother_name'] ?? ''?></td>
                                                                    </tr>
                                                                    <tr>
                                                                        <th class="ps-0" scope="row">E-mail :</th>
                                                                        <td class="text-muted"><?=$view_data['user_email']?></td>
                                                                    </tr>
                                                                    <tr>
                                                                        <th class="ps-0" scope="row">DOB :</th>
                                                                        <td class="text-muted"><?=$user_data['date_of_birth'] ?? '' ?></td>
                                                                    </tr>
                                                                     <tr>
                                                                        <th class="ps-0" scope="row">Age :</th>
                                                                        <td class="text-muted"><?=$user_data['age'] ?? ''?></td>
                                                                    </tr>
                                                                     <tr>
                                                                        <th class="ps-0" scope="row">Gender :</th>
                                                                        <td class="text-muted"><?=$user_data['gender'] ?? '' ?></td>
                                                                    </tr>
                                                                    
                                                                     <tr class="d-none">
                                                                        <th class="ps-0" scope="row">Nationality :</th>
                                                                        <td class="text-muted"><?=$user_data['nationality'] ?? ''?></td>
                                                                    </tr>
                                                                     <tr>
                                                                        <th class="ps-0" scope="row">Marital Status :</th>
                                                                        <td class="text-muted"><?=$user_data['marital_status'] ?? ''?></td>
                                                                    </tr>
                                                                    
                                                                    <tr>
                                                                        <th class="ps-0" scope="row">Aadhar Number :</th>
                                                                        <td class="text-muted"><?=$user_data['aadhar_no'] ?? '' ?></td>
                                                                    </tr>
                                                                    
                                                                    <?php
                                                                    if(!empty($user_data['passport_no']))
                                                                    { ?>
                                                                        <tr>
                                                                            <th class="ps-0" scope="row">Passport No :</th>
                                                                            <td class="text-muted"><?=$user_data['passport_no']?></td>
                                                                        </tr>
                                                                    <?php
                                                                    }
                                                                    ?>
                                                                    
                                                                   
                                                                   
                                                                </tbody>
                                                            </table>
                                                        </div>
                                                    </div><!-- end card body -->
                                                </div><!-- end card -->
                                                

                                        <div class="card">
                                            <div class="card-body">
                                                <h5 class="card-title mb-3">Academic/Professional Details</h5>
                                                
                                                    <div class="row">
                                                            
                                                            <div class="live-preview">
                                                                <form action="javascript:void(0);">
                                                                    <div class="row mb-3">
                                                                        <div class="col-lg-3">
                                                                            <label for="nameInput" class="form-label">Highest Qualification </label>
                                                                        </div>
                                                                        <div class="col-lg-9">
                                                                            <h5 class="fs-14 text-truncate mb-1">
                                                                                :&nbsp;<a href="#" class="text-body"> <?=$user_data['highest_qualification'] ?? ''?></a>
                                                                            </h5>
                                                                        </div>
                                                                    </div>
                                                                    
                                                                    <div class="row mb-3">
                                                                        <div class="col-lg-3">
                                                                            <label for="nameInput" class="form-label">Previous School/College*</label>
                                                                        </div>
                                                                        <div class="col-lg-9">
                                                                            <h5 class="fs-14 text-truncate mb-1">
                                                                                :&nbsp;<a href="#" class="text-body">  <?=$user_data['previous_school'] ?? ''?></a>
                                                                            </h5>
                                                                        </div>
                                                                    </div>
                                                                    
                                                                    <div class="row mb-3">
                                                                        <div class="col-lg-3">
                                                                            <label for="nameInput" class="form-label">Year of Passing</label>
                                                                        </div>
                                                                        <div class="col-lg-9">
                                                                            <h5 class="fs-14 text-truncate mb-1">
                                                                                :&nbsp;<a href="#" class="text-body">  <?=$user_data['year_of_passing'] ?? ''?></a>
                                                                            </h5>
                                                                        </div>
                                                                    </div>
                                                                    
                                                                    <div class="row mb-3">
                                                                        <div class="col-lg-3">
                                                                            <label for="nameInput" class="form-label">Percentage/Grade</label>
                                                                        </div>
                                                                        <div class="col-lg-9">
                                                                            <h5 class="fs-14 text-truncate mb-1">
                                                                                :&nbsp;<a href="#" class="text-body">  <?=$user_data['percentage_or_grade'] ?? '' ?></a>
                                                                            </h5>
                                                                        </div>
                                                                    </div>
                                                                    
                                                                    <div class="row mb-3">
                                                                        <div class="col-lg-3">
                                                                            <label for="nameInput" class="form-label">Teaching Experience (Years, if any)  </label>
                                                                        </div>
                                                                        <div class="col-lg-9">
                                                                            <h5 class="fs-14 text-truncate mb-1">
                                                                                :&nbsp;<a href="#" class="text-body">  <?=$user_data['teaching_experience'] ?? ''?></a>
                                                                            </h5>
                                                                        </div>
                                                                    </div>
                                                                    
                                                                 
                                                                  
                                                                </form>
                                                            </div>
                                                            
                                                            
                                                            
                                                        </div>

                                               
                                               
                                               
                                               
                                            </div>
                                            <!--end card-body-->
                                        </div>
                                        <!--end card-->



                                                <div class="card">
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
                                                </div><!-- end card -->
                                                  
                                                <div class="card">
                                                    <div class="card-body">
                                                        <h5 class="card-title">Marketing & Communication</h5>
                                                        <!-- Swiper -->
                                                        <div class="row">
                                                            
                                                            <div class="live-preview">
                                                                <form action="javascript:void(0);">
                                                                    <div class="row mb-3">
                                                                        <div class="col-lg-3">
                                                                            <label for="nameInput" class="form-label">How Did They Hear About Us? </label>
                                                                        </div>
                                                                        <div class="col-lg-9">
                                                                            <h5 class="fs-14 text-truncate mb-1">
                                                                                :&nbsp;<a href="#" class="text-body"><?=$user_data['marketing_source'] ?? ''?></a>
                                                                            </h5>
                                                                        </div>
                                                                    </div>
                                                                    
                                                                   
                                                                </form>
                                                            </div>
                                                            
                                                            <!--end col-->
                                                        </div>

                                                    </div>
                                                    <!-- end card body -->
                                                </div><!-- end card -->

                                                <div class="card d-none">
                                                    <div class="card-body">
                                                        <h5 class="card-title mb-4">Skills</h5>
                                                        <div class="d-flex flex-wrap gap-2 fs-15">
                                                            <a href="javascript:void(0);" class="badge bg-primary-subtle text-primary">Photoshop</a>
                                                            <a href="javascript:void(0);" class="badge bg-primary-subtle text-primary">illustrator</a>
                                                            <a href="javascript:void(0);" class="badge bg-primary-subtle text-primary">HTML</a>
                                                            <a href="javascript:void(0);" class="badge bg-primary-subtle text-primary">CSS</a>
                                                            <a href="javascript:void(0);" class="badge bg-primary-subtle text-primary">Javascript</a>
                                                            <a href="javascript:void(0);" class="badge bg-primary-subtle text-primary">Php</a>
                                                            <a href="javascript:void(0);" class="badge bg-primary-subtle text-primary">Python</a>
                                                        </div>
                                                    </div><!-- end card body -->
                                                </div><!-- end card -->

                                                <div class="card d-none">
                                                    <div class="card-body">
                                                        <div class="d-flex align-items-center mb-4">
                                                            <div class="flex-grow-1">
                                                                <h5 class="card-title mb-0">Suggestions</h5>
                                                            </div>
                                                            <div class="flex-shrink-0">
                                                                <div class="dropdown">
                                                                    <a href="#" role="button" id="dropdownMenuLink2" data-bs-toggle="dropdown" aria-expanded="false">
                                                                        <i class="ri-more-2-fill fs-14"></i>
                                                                    </a>

                                                                    <ul class="dropdown-menu dropdown-menu-end" aria-labelledby="dropdownMenuLink2">
                                                                        <li><a class="dropdown-item" href="#">View</a></li>
                                                                        <li><a class="dropdown-item" href="#">Edit</a></li>
                                                                        <li><a class="dropdown-item" href="#">Delete</a></li>
                                                                    </ul>
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <div>
                                                            <div class="d-flex align-items-center py-3">
                                                                <div class="avatar-xs flex-shrink-0 me-3">
                                                                    <img src="assets/images/users/avatar-3.jpg" alt="" class="img-fluid rounded-circle" />
                                                                </div>
                                                                <div class="flex-grow-1">
                                                                    <div>
                                                                        <h5 class="fs-14 mb-1">Esther James</h5>
                                                                        <p class="fs-13 text-muted mb-0">Frontend Developer</p>
                                                                    </div>
                                                                </div>
                                                                <div class="flex-shrink-0 ms-2">
                                                                    <button type="button" class="btn btn-sm btn-outline-success"><i class="ri-user-add-line align-middle"></i></button>
                                                                </div>
                                                            </div>
                                                            <div class="d-flex align-items-center py-3">
                                                                <div class="avatar-xs flex-shrink-0 me-3">
                                                                    <img src="assets/images/users/avatar-4.jpg" alt="" class="img-fluid rounded-circle" />
                                                                </div>
                                                                <div class="flex-grow-1">
                                                                    <div>
                                                                        <h5 class="fs-14 mb-1">Jacqueline Steve</h5>
                                                                        <p class="fs-13 text-muted mb-0">UI/UX Designer</p>
                                                                    </div>
                                                                </div>
                                                                <div class="flex-shrink-0 ms-2">
                                                                    <button type="button" class="btn btn-sm btn-outline-success"><i class="ri-user-add-line align-middle"></i></button>
                                                                </div>
                                                            </div>
                                                            <div class="d-flex align-items-center py-3">
                                                                <div class="avatar-xs flex-shrink-0 me-3">
                                                                    <img src="assets/images/users/avatar-5.jpg" alt="" class="img-fluid rounded-circle" />
                                                                </div>
                                                                <div class="flex-grow-1">
                                                                    <div>
                                                                        <h5 class="fs-14 mb-1">George Whalen</h5>
                                                                        <p class="fs-13 text-muted mb-0">Backend Developer</p>
                                                                    </div>
                                                                </div>
                                                                <div class="flex-shrink-0 ms-2">
                                                                    <button type="button" class="btn btn-sm btn-outline-success"><i class="ri-user-add-line align-middle"></i></button>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div><!-- end card body -->
                                                </div>
                                                <!--end card-->

                                                <div class="card d-none">
                                                    <div class="card-body">
                                                        <div class="d-flex align-items-center mb-4">
                                                            <div class="flex-grow-1">
                                                                <h5 class="card-title mb-0">Popular Posts</h5>
                                                            </div>
                                                            <div class="flex-shrink-0">
                                                                <div class="dropdown">
                                                                    <a href="#" role="button" id="dropdownMenuLink1" data-bs-toggle="dropdown" aria-expanded="false">
                                                                        <i class="ri-more-2-fill fs-14"></i>
                                                                    </a>

                                                                    <ul class="dropdown-menu dropdown-menu-end" aria-labelledby="dropdownMenuLink1">
                                                                        <li><a class="dropdown-item" href="#">View</a></li>
                                                                        <li><a class="dropdown-item" href="#">Edit</a></li>
                                                                        <li><a class="dropdown-item" href="#">Delete</a></li>
                                                                    </ul>
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <div class="d-flex mb-4">
                                                            <div class="flex-shrink-0">
                                                                <img src="assets/images/small/img-4.jpg" alt="" height="50" class="rounded" />
                                                            </div>
                                                            <div class="flex-grow-1 ms-3 overflow-hidden">
                                                                <a href="javascript:void(0);">
                                                                    <h6 class="text-truncate fs-14">Design your apps in your own way</h6>
                                                                </a>
                                                                <p class="text-muted mb-0">15 Dec 2021</p>
                                                            </div>
                                                        </div>
                                                        <div class="d-flex mb-4">
                                                            <div class="flex-shrink-0">
                                                                <img src="assets/images/small/img-5.jpg" alt="" height="50" class="rounded" />
                                                            </div>
                                                            <div class="flex-grow-1 ms-3 overflow-hidden">
                                                                <a href="javascript:void(0);">
                                                                    <h6 class="text-truncate fs-14">Smartest Applications for Business</h6>
                                                                </a>
                                                                <p class="text-muted mb-0">28 Nov 2021</p>
                                                            </div>
                                                        </div>
                                                        <div class="d-flex">
                                                            <div class="flex-shrink-0">
                                                                <img src="assets/images/small/img-6.jpg" alt="" height="50" class="rounded" />
                                                            </div>
                                                            <div class="flex-grow-1 ms-3 overflow-hidden">
                                                                <a href="javascript:void(0);">
                                                                    <h6 class="text-truncate fs-14">How to get creative in your work</h6>
                                                                </a>
                                                                <p class="text-muted mb-0">21 Nov 2021</p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <!--end card-body-->
                                                </div>
                                                <!--end card-->
                                            </div>
                                           
                                           
                                            <!--end col-->
                                            <div class="col-xxl-6">
                                                <div class="card">
                                                    <div class="card-body">
                                                        <h5 class="card-title mb-4">Contact Information</h5>
                                                      
                                                        <div class="row">
                                                            
                                                            <div class="live-preview">
                                                                <form action="javascript:void(0);">
                                                                     <div class="row mb-3">
                                                                        <div class="col-lg-3">
                                                                            <label for="nameInput" class="form-label">Phone</label>
                                                                        </div>
                                                                        <div class="col-lg-9">
                                                                            <h5 class="fs-14 text-truncate mb-1">
                                                                                :&nbsp;<a href="#" class="text-body"><?=$view_data['country_code'] ?? '' ?>  <?=$view_data['phone'] ?? '' ?></a>
                                                                            </h5>
                                                                        </div>
                                                                    </div>
                                                                    <div class="row mb-3">
                                                                        <div class="col-lg-3">
                                                                            <label for="nameInput" class="form-label">Email</label>
                                                                        </div>
                                                                        <div class="col-lg-9">
                                                                            <h5 class="fs-14 text-truncate mb-1">
                                                                                :&nbsp;<a href="#" class="text-body"><?=$view_data['user_email'] ?? '' ?></a>
                                                                            </h5>
                                                                        </div>
                                                                    </div>
                                                                    <div class="row mb-3">
                                                                        <div class="col-lg-3">
                                                                            <label for="nameInput" class="form-label">Alternative Phone </label>
                                                                        </div>
                                                                        <div class="col-lg-9">
                                                                            <h5 class="fs-14 text-truncate mb-1">
                                                                                :&nbsp;<a href="#" class="text-body"><?=$user_data['second_code'] ?? ''?>  <?=$user_data['second_phone'] ?? ''?></a>
                                                                            </h5>
                                                                        </div>
                                                                    </div>
                                                                    
                                                                    <div class="row mb-3">
                                                                        <div class="col-lg-3">
                                                                            <label for="nameInput" class="form-label">Whatsapp No  </label>
                                                                        </div>
                                                                        <div class="col-lg-9">
                                                                            <h5 class="fs-14 text-truncate mb-1">
                                                                                :&nbsp;<a href="#" class="text-body">  <?=$user_data['whatsapp_no'] ?? ''?></a>
                                                                            </h5>
                                                                        </div>
                                                                    </div>
                                                                    <hr class="my-4" >
                                                                    <div class="row mb-3">
                                                                        <div class="col-lg-3">
                                                                            <label for="nameInput" class="form-label">Address  </label>
                                                                        </div>
                                                                        <div class="col-lg-9">
                                                                            <h5 class="fs-14 text-truncate mb-1">
                                                                                :&nbsp;<a href="#" class="text-body">  <?=$user_data['address'] ?? ''?></a>
                                                                            </h5>
                                                                        </div>
                                                                    </div>
                                                                    
                                                                    <div class="row mb-3">
                                                                        <div class="col-lg-3">
                                                                            <label for="nameInput" class="form-label">Native Address  </label>
                                                                        </div>
                                                                        <div class="col-lg-9">
                                                                            <h5 class="fs-14 text-truncate mb-1">
                                                                                :&nbsp;<a href="#" class="text-body">  <?=$user_data['native_address'] ?? ''?></a>
                                                                            </h5>
                                                                        </div>
                                                                    </div>
                                                                    
                                                                    <div class="row mb-3">
                                                                        <div class="col-lg-3">
                                                                            <label for="nameInput" class="form-label">District  </label>
                                                                        </div>
                                                                        <div class="col-lg-9">
                                                                            <h5 class="fs-14 text-truncate mb-1">
                                                                                :&nbsp;<a href="#" class="text-body">  <?=$user_data['district'] ?? ''?></a>
                                                                            </h5>
                                                                        </div>
                                                                    </div>
                                                                    
                                                                    <div class="row mb-3">
                                                                        <div class="col-lg-3">
                                                                            <label for="nameInput" class="form-label">State </label>
                                                                        </div>
                                                                        <div class="col-lg-9">
                                                                            <h5 class="fs-14 text-truncate mb-1">
                                                                                :&nbsp;<a href="#" class="text-body">  <?=$user_data['state'] ?? ''?></a>
                                                                            </h5>
                                                                        </div>
                                                                    </div>
                                                                    
                                                                  
                                                                </form>
                                                            </div>
                                                            
                                                            
                                                            
                                                            
                                                            
                                                            
                                                            
                                                            
                                                            
                                                            <!--<div class="col-6 col-md-4">-->
                                                            <!--    <div class="d-flex mt-4">-->
                                                            <!--        <div class="flex-shrink-0 avatar-xs align-self-center me-3">-->
                                                            <!--            <div class="avatar-title bg-light rounded-circle fs-16 text-primary">-->
                                                            <!--                <i class="ri-user-2-fill"></i>-->
                                                            <!--            </div>-->
                                                            <!--        </div>-->
                                                            <!--        <div class="flex-grow-1 overflow-hidden">-->
                                                            <!--            <p class="mb-1">Designation :</p>-->
                                                            <!--            <h6 class="text-truncate mb-0">Lead Designer / Developer</h6>-->
                                                            <!--        </div>-->
                                                            <!--    </div>-->
                                                            <!--</div>-->
                                                            <!--end col-->
                                                            <!--<div class="col-6 col-md-4">-->
                                                            <!--    <div class="d-flex mt-4">-->
                                                            <!--        <div class="flex-shrink-0 avatar-xs align-self-center me-3">-->
                                                            <!--            <div class="avatar-title bg-light rounded-circle fs-16 text-primary">-->
                                                            <!--                <i class="ri-global-line"></i>-->
                                                            <!--            </div>-->
                                                            <!--        </div>-->
                                                            <!--        <div class="flex-grow-1 overflow-hidden">-->
                                                            <!--            <p class="mb-1">Website :</p>-->
                                                            <!--            <a href="#" class="fw-semibold">www.velzon.com</a>-->
                                                            <!--        </div>-->
                                                            <!--    </div>-->
                                                            <!--</div>-->
                                                            <!--end col-->
                                                        </div>
                                                        <!--end row-->
                                                    </div>
                                                    <!--end card-body-->
                                                </div><!-- end card -->
                                                
                                                
                                                <div class="card">
                                                    <div class="card-body">
                                                        <h5 class="card-title">Parental/Guardian Information</h5>
                                                        <!-- Swiper -->
                                                        <div class="row">
                                                            
                                                            <div class="live-preview">
                                                                <form action="javascript:void(0);">
                                                                    <div class="row mb-3">
                                                                        <div class="col-lg-3">
                                                                            <label for="nameInput" class="form-label">Father's Name </label>
                                                                        </div>
                                                                        <div class="col-lg-9">
                                                                            <h5 class="fs-14 text-truncate mb-1">
                                                                                :&nbsp;<a href="#" class="text-body"><?=$user_data['father_name'] ?? ''?></a>
                                                                            </h5>
                                                                        </div>
                                                                    </div>
                                                                    
                                                                    <div class="row mb-3">
                                                                        <div class="col-lg-3">
                                                                            <label for="nameInput" class="form-label">Mother's Name  </label>
                                                                        </div>
                                                                        <div class="col-lg-9">
                                                                            <h5 class="fs-14 text-truncate mb-1">
                                                                                :&nbsp;<a href="#" class="text-body">  <?=$user_data['mother_name'] ?? ''?></a>
                                                                            </h5>
                                                                        </div>
                                                                    </div>
                                                                    
                                                                    <div class="row mb-3">
                                                                        <div class="col-lg-3">
                                                                            <label for="nameInput" class="form-label">Guardian's Name </label>
                                                                        </div>
                                                                        <div class="col-lg-9">
                                                                            <h5 class="fs-14 text-truncate mb-1">
                                                                                :&nbsp;<a href="#" class="text-body">  <?=$user_data['guardian_name'] ?? ''?></a>
                                                                            </h5>
                                                                        </div>
                                                                    </div>
                                                                    
                                                                  
                                                                </form>
                                                            </div>
                                                            
                                                            <!--end col-->
                                                        </div>

                                                    </div>
                                                    <!-- end card body -->
                                                </div><!-- end card -->
                                                

                                                 <div class="card">
                                                    <div class="card-body">
                                                        <h5 class="card-title">Work/Professional Information</h5>
                                                        <!-- Swiper -->
                                                        <div class="row">
                                                                    
                                                            <div class="live-preview">
                                                                <form action="javascript:void(0);">
                                                                
                                                                
                                                                    <div class="row mb-3">
                                                                        <div class="col-lg-3">
                                                                            <label for="nameInput" class="form-label">Current Employment Status? </label>
                                                                        </div>
                                                                        <div class="col-lg-9">
                                                                            <h5 class="fs-14 text-truncate mb-1">
                                                                                :&nbsp;<a href="#" class="text-body"><?=$user_data['employment_status'] ?? ''?></a>
                                                                            </h5>
                                                                        </div>
                                                                    </div>
                                                                    
                                                                    <?php
                                                                    if(!empty($user_data['employment_status']) && isset($user_data['employment_status'] )){
                                                                    if($user_data['employment_status'] == 'Employed')
                                                                    {
                                                                    ?>
                                                                        <div class="row mb-3">
                                                                            <div class="col-lg-3">
                                                                                <label for="nameInput" class="form-label">Organization Name </label>
                                                                            </div>
                                                                            <div class="col-lg-9">
                                                                                <h5 class="fs-14 text-truncate mb-1">
                                                                                    :&nbsp;<a href="#" class="text-body"><?=$user_data['organization_name'] ?? ''?></a>
                                                                                </h5>
                                                                            </div>
                                                                        </div>
                                                                        
                                                                        <div class="row mb-3">
                                                                            <div class="col-lg-3">
                                                                                <label for="nameInput" class="form-label">Position/Designation </label>
                                                                            </div>
                                                                            <div class="col-lg-9">
                                                                                <h5 class="fs-14 text-truncate mb-1">
                                                                                    :&nbsp;<a href="#" class="text-body"><?=$user_data['designation'] ?? ''?></a>
                                                                                </h5>
                                                                            </div>
                                                                        </div>
                                                                        
                                                                        <div class="row mb-3">
                                                                            <div class="col-lg-3">
                                                                                <label for="nameInput" class="form-label">Years of Experience </label>
                                                                            </div>
                                                                            <div class="col-lg-9">
                                                                                <h5 class="fs-14 text-truncate mb-1">
                                                                                    :&nbsp;<a href="#" class="text-body"><?=$user_data['experience_years'] ?? ''?></a>
                                                                                </h5>
                                                                            </div>
                                                                        </div>
                                                                        
                                                                        
                                                                        <div class="row mb-3">
                                                                            <div class="col-lg-3">
                                                                                <label for="nameInput" class="form-label">Industry/Sector </label>
                                                                            </div>
                                                                            <div class="col-lg-9">
                                                                                <h5 class="fs-14 text-truncate mb-1">
                                                                                    :&nbsp;<a href="#" class="text-body"><?=$user_data['industry_sector'] ?? '' ?></a>
                                                                                </h5>
                                                                            </div>
                                                                        </div>
                                                                    
                                                                    
                                                                    
                                                                    
                                                                    
                                                                    
                                                                    
                                                                    
                                                                    
                                                                    <?php
                                                                    }
                                                                }
                                                                    ?>
                                                                    
                                                                </form>
                                                            </div>
                                                            <!--end col-->
                                                        </div>
                                                    </div>
                                                    <!-- end card body -->
                                                </div><!-- end card -->
                                                 


                                                <div class="card d-none">
                                                    <div class="card-body">
                                                        <h5 class="card-title">Emergency Contact</h5>
                                                        <!-- Swiper -->
                                                        <div class="row">
                                                            
                                                            <div class="live-preview">
                                                                <form action="javascript:void(0);">
                                                                    <div class="row mb-3">
                                                                        <div class="col-lg-3">
                                                                            <label for="nameInput" class="form-label">Emergency Contact Name </label>
                                                                        </div>
                                                                        <div class="col-lg-9">
                                                                            <h5 class="fs-14 text-truncate mb-1">
                                                                                :&nbsp;<a href="#" class="text-body"><?=$user_data['emergency_name'] ?? ''?></a>
                                                                            </h5>
                                                                        </div>
                                                                    </div>
                                                                    
                                                                    <div class="row mb-3">
                                                                        <div class="col-lg-3">
                                                                            <label for="nameInput" class="form-label">Emergency Contact Phone </label>
                                                                        </div>
                                                                        <div class="col-lg-9">
                                                                            <h5 class="fs-14 text-truncate mb-1">
                                                                                :&nbsp;<a href="#" class="text-body">  <?=$user_data['emergency_relation'] ?? ''?></a>
                                                                            </h5>
                                                                        </div>
                                                                    </div>
                                                                    
                                                                    <div class="row mb-3">
                                                                        <div class="col-lg-3">
                                                                            <label for="nameInput" class="form-label">Relationship to Emergency Contact </label>
                                                                        </div>
                                                                        <div class="col-lg-9">
                                                                            <h5 class="fs-14 text-truncate mb-1">
                                                                                :&nbsp;<a href="#" class="text-body">  <?=$user_data['emergency_phone'] ?? ''?></a>
                                                                            </h5>
                                                                        </div>
                                                                    </div>
                                                                    
                                                                  
                                                                </form>
                                                            </div>
                                                            
                                                            <!--end col-->
                                                        </div>

                                                    </div>
                                                    <!-- end card body -->
                                                </div><!-- end card -->
                                                
                                                <?php
                                                if(!empty($user_data['learning_disabilities']))
                                                { ?>
                                                
                                                 <div class="card">
                                                    <div class="card-body">
                                                        <h5 class="card-title">Special Requirements</h5>
                                                        <!-- Swiper -->
                                                        <div class="row">
                                                            
                                                            <div class="live-preview">
                                                                <form action="javascript:void(0);">
                                                                    <div class="row mb-3">
                                                                        <div class="col-lg-3">
                                                                            <label for="nameInput" class="form-label">Learning Disabilities (if any) </label>
                                                                        </div>
                                                                        <div class="col-lg-9">
                                                                            <h5 class="fs-14 text-truncate mb-1">
                                                                                :&nbsp;<a href="#" class="text-body"><?=$user_data['learning_disabilities'] ?? ''?></a>
                                                                            </h5>
                                                                        </div>
                                                                    </div>
                                                                    
                                                                    <div class="row mb-3">
                                                                        <div class="col-lg-3">
                                                                            <label for="nameInput" class="form-label">Accessibility Needs (if any)</label>
                                                                        </div>
                                                                        <div class="col-lg-9">
                                                                            <h5 class="fs-14 text-truncate mb-1">
                                                                                :&nbsp;<a href="#" class="text-body">  <?=$user_data['accessibility_needs'] ?? ''?></a>
                                                                            </h5>
                                                                        </div>
                                                                    </div>
                                                                    
                                                                   
                                                                  
                                                                </form>
                                                            </div>
                                                            
                                                            <!--end col-->
                                                        </div>

                                                    </div>
                                                    <!-- end card body -->
                                                </div><!-- end card -->

                                                <?php
                                                }
                                                ?>
                                                
                                                 <?php
                                                if(!empty($user_data['marketing_source']))
                                                { ?>
                                                
                                                 <div class="card d-none">
                                                    <div class="card-body">
                                                        <h5 class="card-title">Marketing & Communication</h5>
                                                        <!-- Swiper -->
                                                        <div class="row">
                                                            
                                                            <div class="live-preview">
                                                                <form action="javascript:void(0);">
                                                                    <div class="row mb-3">
                                                                        <div class="col-lg-3">
                                                                            <label for="nameInput" class="form-label">How Did They Hear About Us? </label>
                                                                        </div>
                                                                        <div class="col-lg-9">
                                                                            <h5 class="fs-14 text-truncate mb-1">
                                                                                :&nbsp;<a href="#" class="text-body"><?=$user_data['marketing_source']?></a>
                                                                            </h5>
                                                                        </div>
                                                                    </div>
                                                                    
                                                                   
                                                                </form>
                                                            </div>
                                                            
                                                            <!--end col-->
                                                        </div>

                                                    </div>
                                                    <!-- end card body -->
                                                </div><!-- end card -->

                                                <?php
                                                }
                                                ?>
                                                
                                                

                                                <div class="row d-none">
                                                    <div class="col-lg-12">
                                                        <div class="card">
                                                            <div class="card-header align-items-center d-flex">
                                                                <h4 class="card-title mb-0  me-2">Recent Activity</h4>
                                                                <div class="flex-shrink-0 ms-auto">
                                                                    <ul class="nav justify-content-end nav-tabs-custom rounded card-header-tabs border-bottom-0" role="tablist">
                                                                        <li class="nav-item">
                                                                            <a class="nav-link active" data-bs-toggle="tab" href="#today" role="tab">
                                                                                Today
                                                                            </a>
                                                                        </li>
                                                                        <li class="nav-item">
                                                                            <a class="nav-link" data-bs-toggle="tab" href="#weekly" role="tab">
                                                                                Weekly
                                                                            </a>
                                                                        </li>
                                                                        <li class="nav-item">
                                                                            <a class="nav-link" data-bs-toggle="tab" href="#monthly" role="tab">
                                                                                Monthly
                                                                            </a>
                                                                        </li>
                                                                    </ul>
                                                                </div>
                                                            </div>
                                                            <div class="card-body">
                                                                <div class="tab-content text-muted">
                                                                    <div class="tab-pane active" id="today" role="tabpanel">
                                                                        <div class="profile-timeline">
                                                                            <div class="accordion accordion-flush" id="todayExample">
                                                                                <div class="accordion-item border-0">
                                                                                    <div class="accordion-header" id="headingOne">
                                                                                        <a class="accordion-button p-2 shadow-none" data-bs-toggle="collapse" href="#collapseOne" aria-expanded="true">
                                                                                            <div class="d-flex">
                                                                                                <div class="flex-shrink-0">
                                                                                                    <img src="assets/images/users/avatar-2.jpg" alt="" class="avatar-xs rounded-circle" />
                                                                                                </div>
                                                                                                <div class="flex-grow-1 ms-3">
                                                                                                    <h6 class="fs-14 mb-1">
                                                                                                        Jacqueline Steve
                                                                                                    </h6>
                                                                                                    <small class="text-muted">We has changed 2 attributes on 05:16PM</small>
                                                                                                </div>
                                                                                            </div>
                                                                                        </a>
                                                                                    </div>
                                                                                    <div id="collapseOne" class="accordion-collapse collapse show" aria-labelledby="headingOne" data-bs-parent="#accordionExample">
                                                                                        <div class="accordion-body ms-2 ps-5">
                                                                                            In an awareness campaign, it is vital for people to begin put 2 and 2 together and begin to recognize your cause. Too much or too little spacing, as in the example below, can make things unpleasant for the reader. The goal is to make your text as comfortable to read as possible. A wonderful serenity has taken possession of my entire soul, like these sweet mornings of spring which I enjoy with my whole heart.
                                                                                        </div>
                                                                                    </div>
                                                                                </div>
                                                                                <div class="accordion-item border-0">
                                                                                    <div class="accordion-header" id="headingTwo">
                                                                                        <a class="accordion-button p-2 shadow-none" data-bs-toggle="collapse" href="#collapseTwo" aria-expanded="false">
                                                                                            <div class="d-flex">
                                                                                                <div class="flex-shrink-0 avatar-xs">
                                                                                                    <div class="avatar-title bg-light text-success rounded-circle">
                                                                                                        M
                                                                                                    </div>
                                                                                                </div>
                                                                                                <div class="flex-grow-1 ms-3">
                                                                                                    <h6 class="fs-14 mb-1">
                                                                                                        Megan Elmore
                                                                                                    </h6>
                                                                                                    <small class="text-muted">Adding a new event with attachments - 04:45PM</small>
                                                                                                </div>
                                                                                            </div>
                                                                                        </a>
                                                                                    </div>
                                                                                    <div id="collapseTwo" class="accordion-collapse collapse show" aria-labelledby="headingTwo" data-bs-parent="#accordionExample">
                                                                                        <div class="accordion-body ms-2 ps-5">
                                                                                            <div class="row g-2">
                                                                                                <div class="col-auto">
                                                                                                    <div class="d-flex border border-dashed p-2 rounded position-relative">
                                                                                                        <div class="flex-shrink-0">
                                                                                                            <i class="ri-image-2-line fs-17 text-danger"></i>
                                                                                                        </div>
                                                                                                        <div class="flex-grow-1 ms-2">
                                                                                                            <h6>
                                                                                                                <a href="javascript:void(0);" class="stretched-link">Business Template - UI/UX design</a>
                                                                                                            </h6>
                                                                                                            <small>685 KB</small>
                                                                                                        </div>
                                                                                                    </div>
                                                                                                </div>
                                                                                                <div class="col-auto">
                                                                                                    <div class="d-flex border border-dashed p-2 rounded position-relative">
                                                                                                        <div class="flex-shrink-0">
                                                                                                            <i class="ri-file-zip-line fs-17 text-info"></i>
                                                                                                        </div>
                                                                                                        <div class="flex-grow-1 ms-2">
                                                                                                            <h6 class="mb-0">
                                                                                                                <a href="javascript:void(0);" class="stretched-link">Bank Management System - PSD</a>
                                                                                                            </h6>
                                                                                                            <small>8.78 MB</small>
                                                                                                        </div>
                                                                                                    </div>
                                                                                                </div>
                                                                                            </div>
                                                                                        </div>
                                                                                    </div>
                                                                                </div>
                                                                                <div class="accordion-item border-0">
                                                                                    <div class="accordion-header" id="headingThree">
                                                                                        <a class="accordion-button p-2 shadow-none" data-bs-toggle="collapse" href="#collapsethree" aria-expanded="false">
                                                                                            <div class="d-flex">
                                                                                                <div class="flex-shrink-0">
                                                                                                    <img src="assets/images/users/avatar-5.jpg" alt="" class="avatar-xs rounded-circle" />
                                                                                                </div>
                                                                                                <div class="flex-grow-1 ms-3">
                                                                                                    <h6 class="fs-14 mb-1"> New ticket received</h6>
                                                                                                    <small class="text-muted mb-2">User <span class="text-secondary">Erica245</span> submitted a ticket - 02:33PM</small>
                                                                                                </div>
                                                                                            </div>
                                                                                        </a>
                                                                                    </div>
                                                                                </div>
                                                                                <div class="accordion-item border-0">
                                                                                    <div class="accordion-header" id="headingFour">
                                                                                        <a class="accordion-button p-2 shadow-none" data-bs-toggle="collapse" href="#collapseFour" aria-expanded="true">
                                                                                            <div class="d-flex">
                                                                                                <div class="flex-shrink-0 avatar-xs">
                                                                                                    <div class="avatar-title bg-light text-muted rounded-circle">
                                                                                                        <i class="ri-user-3-fill"></i>
                                                                                                    </div>
                                                                                                </div>
                                                                                                <div class="flex-grow-1 ms-3">
                                                                                                    <h6 class="fs-14 mb-1">
                                                                                                        Nancy Martino
                                                                                                    </h6>
                                                                                                    <small class="text-muted">Commented on 12:57PM</small>
                                                                                                </div>
                                                                                            </div>
                                                                                        </a>
                                                                                    </div>
                                                                                    <div id="collapseFour" class="accordion-collapse collapse show" aria-labelledby="headingFour" data-bs-parent="#accordionExample">
                                                                                        <div class="accordion-body ms-2 ps-5 fst-italic">
                                                                                            " A wonderful serenity has
                                                                                            taken possession of my
                                                                                            entire soul, like these
                                                                                            sweet mornings of spring
                                                                                            which I enjoy with my whole
                                                                                            heart. Each design is a new,
                                                                                            unique piece of art birthed
                                                                                            into this world, and while
                                                                                            you have the opportunity to
                                                                                            be creative and make your
                                                                                            own style choices. "
                                                                                        </div>
                                                                                    </div>
                                                                                </div>
                                                                                <div class="accordion-item border-0">
                                                                                    <div class="accordion-header" id="headingFive">
                                                                                        <a class="accordion-button p-2 shadow-none" data-bs-toggle="collapse" href="#collapseFive" aria-expanded="true">
                                                                                            <div class="d-flex">
                                                                                                <div class="flex-shrink-0">
                                                                                                    <img src="assets/images/users/avatar-7.jpg" alt="" class="avatar-xs rounded-circle" />
                                                                                                </div>
                                                                                                <div class="flex-grow-1 ms-3">
                                                                                                    <h6 class="fs-14 mb-1">
                                                                                                        Lewis Arnold
                                                                                                    </h6>
                                                                                                    <small class="text-muted">Create new project buildng product - 10:05AM</small>
                                                                                                </div>
                                                                                            </div>
                                                                                        </a>
                                                                                    </div>
                                                                                    <div id="collapseFive" class="accordion-collapse collapse show" aria-labelledby="headingFive" data-bs-parent="#accordionExample">
                                                                                        <div class="accordion-body ms-2 ps-5">
                                                                                            <p class="text-muted mb-2"> Every team project can have a velzon. Use the velzon to share information with your team to understand and contribute to your project.</p>
                                                                                            <div class="avatar-group">
                                                                                                <a href="javascript: void(0);" class="avatar-group-item" data-bs-toggle="tooltip" data-bs-trigger="hover" data-bs-placement="top" title="" data-bs-original-title="Christi">
                                                                                                    <img src="assets/images/users/avatar-4.jpg" alt="" class="rounded-circle avatar-xs">
                                                                                                </a>
                                                                                                <a href="javascript: void(0);" class="avatar-group-item" data-bs-toggle="tooltip" data-bs-trigger="hover" data-bs-placement="top" title="" data-bs-original-title="Frank Hook">
                                                                                                    <img src="assets/images/users/avatar-3.jpg" alt="" class="rounded-circle avatar-xs">
                                                                                                </a>
                                                                                                <a href="javascript: void(0);" class="avatar-group-item" data-bs-toggle="tooltip" data-bs-trigger="hover" data-bs-placement="top" title="" data-bs-original-title=" Ruby">
                                                                                                    <div class="avatar-xs">
                                                                                                        <div class="avatar-title rounded-circle bg-light text-primary">
                                                                                                            R
                                                                                                        </div>
                                                                                                    </div>
                                                                                                </a>
                                                                                                <a href="javascript: void(0);" class="avatar-group-item" data-bs-toggle="tooltip" data-bs-trigger="hover" data-bs-placement="top" title="" data-bs-original-title="more">
                                                                                                    <div class="avatar-xs">
                                                                                                        <div class="avatar-title rounded-circle">
                                                                                                            2+
                                                                                                        </div>
                                                                                                    </div>
                                                                                                </a>
                                                                                            </div>
                                                                                        </div>
                                                                                    </div>
                                                                                </div>
                                                                            </div>
                                                                            <!--end accordion-->
                                                                        </div>
                                                                    </div>
                                                                    <div class="tab-pane" id="weekly" role="tabpanel">
                                                                        <div class="profile-timeline">
                                                                            <div class="accordion accordion-flush" id="weeklyExample">
                                                                                <div class="accordion-item border-0">
                                                                                    <div class="accordion-header" id="heading6">
                                                                                        <a class="accordion-button p-2 shadow-none" data-bs-toggle="collapse" href="#collapse6" aria-expanded="true">
                                                                                            <div class="d-flex">
                                                                                                <div class="flex-shrink-0">
                                                                                                    <img src="assets/images/users/avatar-3.jpg" alt="" class="avatar-xs rounded-circle" />
                                                                                                </div>
                                                                                                <div class="flex-grow-1 ms-3">
                                                                                                    <h6 class="fs-14 mb-1">
                                                                                                        Joseph Parker
                                                                                                    </h6>
                                                                                                    <small class="text-muted">New people joined with our company - Yesterday</small>
                                                                                                </div>
                                                                                            </div>
                                                                                        </a>
                                                                                    </div>
                                                                                    <div id="collapse6" class="accordion-collapse collapse show" aria-labelledby="heading6" data-bs-parent="#accordionExample">
                                                                                        <div class="accordion-body ms-2 ps-5">
                                                                                            It makes a statement, it’s
                                                                                            impressive graphic design.
                                                                                            Increase or decrease the
                                                                                            letter spacing depending on
                                                                                            the situation and try, try
                                                                                            again until it looks right,
                                                                                            and each letter has the
                                                                                            perfect spot of its own.
                                                                                        </div>
                                                                                    </div>
                                                                                </div>
                                                                                <div class="accordion-item border-0">
                                                                                    <div class="accordion-header" id="heading7">
                                                                                        <a class="accordion-button p-2 shadow-none" data-bs-toggle="collapse" href="#collapse7" aria-expanded="false">
                                                                                            <div class="d-flex">
                                                                                                <div class="avatar-xs">
                                                                                                    <div class="avatar-title rounded-circle bg-light text-danger">
                                                                                                        <i class="ri-shopping-bag-line"></i>
                                                                                                    </div>
                                                                                                </div>
                                                                                                <div class="flex-grow-1 ms-3">
                                                                                                    <h6 class="fs-14 mb-1">
                                                                                                        Your order is placed <span class="badge bg-success-subtle text-success align-middle">Completed</span>
                                                                                                    </h6>
                                                                                                    <small class="text-muted">These customers can rest assured their order has been placed - 1 week Ago</small>
                                                                                                </div>
                                                                                            </div>
                                                                                        </a>
                                                                                    </div>
                                                                                </div>
                                                                                <div class="accordion-item border-0">
                                                                                    <div class="accordion-header" id="heading8">
                                                                                        <a class="accordion-button p-2 shadow-none" data-bs-toggle="collapse" href="#collapse8" aria-expanded="true">
                                                                                            <div class="d-flex">
                                                                                                <div class="flex-shrink-0 avatar-xs">
                                                                                                    <div class="avatar-title bg-light text-success rounded-circle">
                                                                                                        <i class="ri-home-3-line"></i>
                                                                                                    </div>
                                                                                                </div>
                                                                                                <div class="flex-grow-1 ms-3">
                                                                                                    <h6 class="fs-14 mb-1">
                                                                                                        Velzon admin dashboard templates layout upload
                                                                                                    </h6>
                                                                                                    <small class="text-muted">We talked about a project on linkedin - 1 week Ago</small>
                                                                                                </div>
                                                                                            </div>
                                                                                        </a>
                                                                                    </div>
                                                                                    <div id="collapse8" class="accordion-collapse collapse show" aria-labelledby="heading8" data-bs-parent="#accordionExample">
                                                                                        <div class="accordion-body ms-2 ps-5 fst-italic">
                                                                                            Powerful, clean & modern
                                                                                            responsive bootstrap 5 admin
                                                                                            template. The maximum file
                                                                                            size for uploads in this demo :
                                                                                            <div class="row mt-2">
                                                                                                <div class="col-xxl-6">
                                                                                                    <div class="row border border-dashed gx-2 p-2">
                                                                                                        <div class="col-3">
                                                                                                            <img src="assets/images/small/img-3.jpg" alt="" class="img-fluid rounded" />
                                                                                                        </div>
                                                                                                        <!--end col-->
                                                                                                        <div class="col-3">
                                                                                                            <img src="assets/images/small/img-5.jpg" alt="" class="img-fluid rounded" />
                                                                                                        </div>
                                                                                                        <!--end col-->
                                                                                                        <div class="col-3">
                                                                                                            <img src="assets/images/small/img-7.jpg" alt="" class="img-fluid rounded" />
                                                                                                        </div>
                                                                                                        <!--end col-->
                                                                                                        <div class="col-3">
                                                                                                            <img src="assets/images/small/img-9.jpg" alt="" class="img-fluid rounded" />
                                                                                                        </div>
                                                                                                        <!--end col-->
                                                                                                    </div>
                                                                                                    <!--end row-->
                                                                                                </div>
                                                                                            </div>
                                                                                        </div>
                                                                                    </div>
                                                                                </div>
                                                                                <div class="accordion-item border-0">
                                                                                    <div class="accordion-header" id="heading9">
                                                                                        <a class="accordion-button p-2 shadow-none" data-bs-toggle="collapse" href="#collapse9" aria-expanded="false">
                                                                                            <div class="d-flex">
                                                                                                <div class="flex-shrink-0">
                                                                                                    <img src="assets/images/users/avatar-6.jpg" alt="" class="avatar-xs rounded-circle" />
                                                                                                </div>
                                                                                                <div class="flex-grow-1 ms-3">
                                                                                                    <h6 class="fs-14 mb-1">
                                                                                                        New ticket created <span class="badge bg-info-subtle text-info align-middle">Inprogress</span>
                                                                                                    </h6>
                                                                                                    <small class="text-muted mb-2">User <span class="text-secondary">Jack365</span> submitted a ticket - 2 week Ago</small>
                                                                                                </div>
                                                                                            </div>
                                                                                        </a>
                                                                                    </div>
                                                                                </div>
                                                                                <div class="accordion-item border-0">
                                                                                    <div class="accordion-header" id="heading10">
                                                                                        <a class="accordion-button p-2 shadow-none" data-bs-toggle="collapse" href="#collapse10" aria-expanded="true">
                                                                                            <div class="d-flex">
                                                                                                <div class="flex-shrink-0">
                                                                                                    <img src="assets/images/users/avatar-5.jpg" alt="" class="avatar-xs rounded-circle" />
                                                                                                </div>
                                                                                                <div class="flex-grow-1 ms-3">
                                                                                                    <h6 class="fs-14 mb-1">
                                                                                                        Jennifer Carter
                                                                                                    </h6>
                                                                                                    <small class="text-muted">Commented - 4 week Ago</small>
                                                                                                </div>
                                                                                            </div>
                                                                                        </a>
                                                                                    </div>
                                                                                    <div id="collapse10" class="accordion-collapse collapse show" aria-labelledby="heading10" data-bs-parent="#accordionExample">
                                                                                        <div class="accordion-body ms-2 ps-5">
                                                                                            <p class="text-muted fst-italic mb-2">
                                                                                                " This is an awesome
                                                                                                admin dashboard
                                                                                                template. It is
                                                                                                extremely well
                                                                                                structured and uses
                                                                                                state of the art
                                                                                                components (e.g. one of
                                                                                                the only templates using
                                                                                                boostrap 5.1.3 so far).
                                                                                                I integrated it into a
                                                                                                Rails 6 project. Needs
                                                                                                manual integration work
                                                                                                of course but the
                                                                                                template structure made
                                                                                                it easy. "</p>
                                                                                        </div>
                                                                                    </div>
                                                                                </div>
                                                                            </div>
                                                                            <!--end accordion-->
                                                                        </div>
                                                                    </div>
                                                                    <div class="tab-pane" id="monthly" role="tabpanel">
                                                                        <div class="profile-timeline">
                                                                            <div class="accordion accordion-flush" id="monthlyExample">
                                                                                <div class="accordion-item border-0">
                                                                                    <div class="accordion-header" id="heading11">
                                                                                        <a class="accordion-button p-2 shadow-none" data-bs-toggle="collapse" href="#collapse11" aria-expanded="false">
                                                                                            <div class="d-flex">
                                                                                                <div class="flex-shrink-0 avatar-xs">
                                                                                                    <div class="avatar-title bg-light text-success rounded-circle">
                                                                                                        M
                                                                                                    </div>
                                                                                                </div>
                                                                                                <div class="flex-grow-1 ms-3">
                                                                                                    <h6 class="fs-14 mb-1">
                                                                                                        Megan Elmore
                                                                                                    </h6>
                                                                                                    <small class="text-muted">Adding a new event with attachments - 1 month Ago.</small>
                                                                                                </div>
                                                                                            </div>
                                                                                        </a>
                                                                                    </div>
                                                                                    <div id="collapse11" class="accordion-collapse collapse show" aria-labelledby="heading11" data-bs-parent="#accordionExample">
                                                                                        <div class="accordion-body ms-2 ps-5">
                                                                                            <div class="row g-2">
                                                                                                <div class="col-auto">
                                                                                                    <div class="d-flex border border-dashed p-2 rounded position-relative">
                                                                                                        <div class="flex-shrink-0">
                                                                                                            <i class="ri-image-2-line fs-17 text-danger"></i>
                                                                                                        </div>
                                                                                                        <div class="flex-grow-1 ms-2">
                                                                                                            <h6 class="mb-0">
                                                                                                                <a href="javascript:void(0);" class="stretched-link">Business Template - UI/UX design</a>
                                                                                                            </h6>
                                                                                                            <small>685 KB</small>
                                                                                                        </div>
                                                                                                    </div>
                                                                                                </div>
                                                                                                <div class="col-auto">
                                                                                                    <div class="d-flex border border-dashed p-2 rounded position-relative">
                                                                                                        <div class="flex-shrink-0">
                                                                                                            <i class="ri-file-zip-line fs-17 text-info"></i>
                                                                                                        </div>
                                                                                                        <div class="flex-grow-1 ms-2">
                                                                                                            <h6 class="mb-0">
                                                                                                                <a href="javascript:void(0);" class="stretched-link">Bank Management System - PSD</a>
                                                                                                            </h6>
                                                                                                            <small>8.78 MB</small>
                                                                                                        </div>
                                                                                                    </div>
                                                                                                </div>
                                                                                                <div class="col-auto">
                                                                                                    <div class="d-flex border border-dashed p-2 rounded position-relative">
                                                                                                        <div class="flex-shrink-0">
                                                                                                            <i class="ri-file-zip-line fs-17 text-info"></i>
                                                                                                        </div>
                                                                                                        <div class="flex-grow-1 ms-2">
                                                                                                            <h6 class="mb-0">
                                                                                                                <a href="javascript:void(0);" class="stretched-link">Bank Management System - PSD</a>
                                                                                                            </h6>
                                                                                                            <small>8.78 MB</small>
                                                                                                        </div>
                                                                                                    </div>
                                                                                                </div>
                                                                                            </div>
                                                                                        </div>
                                                                                    </div>
                                                                                </div>
                                                                                <div class="accordion-item border-0">
                                                                                    <div class="accordion-header" id="heading12">
                                                                                        <a class="accordion-button p-2 shadow-none" data-bs-toggle="collapse" href="#collapse12" aria-expanded="true">
                                                                                            <div class="d-flex">
                                                                                                <div class="flex-shrink-0">
                                                                                                    <img src="assets/images/users/avatar-2.jpg" alt="" class="avatar-xs rounded-circle" />
                                                                                                </div>
                                                                                                <div class="flex-grow-1 ms-3">
                                                                                                    <h6 class="fs-14 mb-1">
                                                                                                        Jacqueline Steve
                                                                                                    </h6>
                                                                                                    <small class="text-muted">We has changed 2 attributes on 3 month Ago</small>
                                                                                                </div>
                                                                                            </div>
                                                                                        </a>
                                                                                    </div>
                                                                                    <div id="collapse12" class="accordion-collapse collapse show" aria-labelledby="heading12" data-bs-parent="#accordionExample">
                                                                                        <div class="accordion-body ms-2 ps-5">
                                                                                            In an awareness campaign, it
                                                                                            is vital for people to begin
                                                                                            put 2 and 2 together and
                                                                                            begin to recognize your
                                                                                            cause. Too much or too
                                                                                            little spacing, as in the
                                                                                            example below, can make
                                                                                            things unpleasant for the
                                                                                            reader. The goal is to make
                                                                                            your text as comfortable to
                                                                                            read as possible. A
                                                                                            wonderful serenity has taken
                                                                                            possession of my entire
                                                                                            soul, like these sweet
                                                                                            mornings of spring which I
                                                                                            enjoy with my whole heart.
                                                                                        </div>
                                                                                    </div>
                                                                                </div>
                                                                                <div class="accordion-item border-0">
                                                                                    <div class="accordion-header" id="heading13">
                                                                                        <a class="accordion-button p-2 shadow-none" data-bs-toggle="collapse" href="#collapse13" aria-expanded="false">
                                                                                            <div class="d-flex">
                                                                                                <div class="flex-shrink-0">
                                                                                                    <img src="assets/images/users/avatar-5.jpg" alt="" class="avatar-xs rounded-circle" />
                                                                                                </div>
                                                                                                <div class="flex-grow-1 ms-3">
                                                                                                    <h6 class="fs-14 mb-1">
                                                                                                        New ticket received
                                                                                                    </h6>
                                                                                                    <small class="text-muted mb-2">User <span class="text-secondary">Erica245</span> submitted a ticket - 5 month Ago</small>
                                                                                                </div>
                                                                                            </div>
                                                                                        </a>
                                                                                    </div>
                                                                                </div>
                                                                                <div class="accordion-item border-0">
                                                                                    <div class="accordion-header" id="heading14">
                                                                                        <a class="accordion-button p-2 shadow-none" data-bs-toggle="collapse" href="#collapse14" aria-expanded="true">
                                                                                            <div class="d-flex">
                                                                                                <div class="flex-shrink-0 avatar-xs">
                                                                                                    <div class="avatar-title bg-light text-muted rounded-circle">
                                                                                                        <i class="ri-user-3-fill"></i>
                                                                                                    </div>
                                                                                                </div>
                                                                                                <div class="flex-grow-1 ms-3">
                                                                                                    <h6 class="fs-14 mb-1">
                                                                                                        Nancy Martino
                                                                                                    </h6>
                                                                                                    <small class="text-muted">Commented on 24 Nov, 2021.</small>
                                                                                                </div>
                                                                                            </div>
                                                                                        </a>
                                                                                    </div>
                                                                                    <div id="collapse14" class="accordion-collapse collapse show" aria-labelledby="heading14" data-bs-parent="#accordionExample">
                                                                                        <div class="accordion-body ms-2 ps-5 fst-italic">
                                                                                            " A wonderful serenity has
                                                                                            taken possession of my
                                                                                            entire soul, like these
                                                                                            sweet mornings of spring
                                                                                            which I enjoy with my whole
                                                                                            heart. Each design is a new,
                                                                                            unique piece of art birthed
                                                                                            into this world, and while
                                                                                            you have the opportunity to
                                                                                            be creative and make your
                                                                                            own style choices. "
                                                                                        </div>
                                                                                    </div>
                                                                                </div>
                                                                                <div class="accordion-item border-0">
                                                                                    <div class="accordion-header" id="heading15">
                                                                                        <a class="accordion-button p-2 shadow-none" data-bs-toggle="collapse" href="#collapse15" aria-expanded="true">
                                                                                            <div class="d-flex">
                                                                                                <div class="flex-shrink-0">
                                                                                                    <img src="assets/images/users/avatar-7.jpg" alt="" class="avatar-xs rounded-circle" />
                                                                                                </div>
                                                                                                <div class="flex-grow-1 ms-3">
                                                                                                    <h6 class="fs-14 mb-1">
                                                                                                        Lewis Arnold
                                                                                                    </h6>
                                                                                                    <small class="text-muted">Create new project buildng product - 8 month Ago</small>
                                                                                                </div>
                                                                                            </div>
                                                                                        </a>
                                                                                    </div>
                                                                                    <div id="collapse15" class="accordion-collapse collapse show" aria-labelledby="heading15" data-bs-parent="#accordionExample">
                                                                                        <div class="accordion-body ms-2 ps-5">
                                                                                            <p class="text-muted mb-2">
                                                                                                Every team project can
                                                                                                have a velzon. Use the
                                                                                                velzon to share
                                                                                                information with your
                                                                                                team to understand and
                                                                                                contribute to your
                                                                                                project.</p>
                                                                                            <div class="avatar-group">
                                                                                                <a href="javascript: void(0);" class="avatar-group-item" data-bs-toggle="tooltip" data-bs-trigger="hover" data-bs-placement="top" title="" data-bs-original-title="Christi">
                                                                                                    <img src="assets/images/users/avatar-4.jpg" alt="" class="rounded-circle avatar-xs">
                                                                                                </a>
                                                                                                <a href="javascript: void(0);" class="avatar-group-item" data-bs-toggle="tooltip" data-bs-trigger="hover" data-bs-placement="top" title="" data-bs-original-title="Frank Hook">
                                                                                                    <img src="assets/images/users/avatar-3.jpg" alt="" class="rounded-circle avatar-xs">
                                                                                                </a>
                                                                                                <a href="javascript: void(0);" class="avatar-group-item" data-bs-toggle="tooltip" data-bs-trigger="hover" data-bs-placement="top" title="" data-bs-original-title=" Ruby">
                                                                                                    <div class="avatar-xs">
                                                                                                        <div class="avatar-title rounded-circle bg-light text-primary">
                                                                                                            R
                                                                                                        </div>
                                                                                                    </div>
                                                                                                </a>
                                                                                                <a href="javascript: void(0);" class="avatar-group-item" data-bs-toggle="tooltip" data-bs-trigger="hover" data-bs-placement="top" title="" data-bs-original-title="more">
                                                                                                    <div class="avatar-xs">
                                                                                                        <div class="avatar-title rounded-circle">
                                                                                                            2+
                                                                                                        </div>
                                                                                                    </div>
                                                                                                </a>
                                                                                            </div>
                                                                                        </div>
                                                                                    </div>
                                                                                </div>
                                                                            </div>
                                                                            <!--end accordion-->
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div><!-- end card body -->
                                                        </div><!-- end card -->
                                                    </div><!-- end col -->
                                                </div><!-- end row -->

                                                <div class="card d-none">
                                                    <div class="card-body">
                                                        <h5 class="card-title">Projects</h5>
                                                        <!-- Swiper -->
                                                        <div class="swiper project-swiper mt-n4">
                                                            <div class="d-flex justify-content-end gap-2 mb-2">
                                                                <div class="slider-button-prev">
                                                                    <div class="avatar-title fs-18 rounded px-1">
                                                                        <i class="ri-arrow-left-s-line"></i>
                                                                    </div>
                                                                </div>
                                                                <div class="slider-button-next">
                                                                    <div class="avatar-title fs-18 rounded px-1">
                                                                        <i class="ri-arrow-right-s-line"></i>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                            <div class="swiper-wrapper">
                                                                <div class="swiper-slide">
                                                                    <div class="card profile-project-card shadow-none profile-project-success mb-0">
                                                                        <div class="card-body p-4">
                                                                            <div class="d-flex">
                                                                                <div class="flex-grow-1 text-muted overflow-hidden">
                                                                                    <h5 class="fs-14 text-truncate mb-1">
                                                                                        <a href="#" class="text-body">ABC Project Customization</a>
                                                                                    </h5>
                                                                                    <p class="text-muted text-truncate mb-0"> Last Update : <span class="fw-semibold text-body">4 hr Ago</span></p>
                                                                                </div>
                                                                                <div class="flex-shrink-0 ms-2">
                                                                                    <div class="badge bg-warning-subtle text-warning fs-10"> Inprogress</div>
                                                                                </div>
                                                                            </div>
                                                                            <div class="d-flex mt-4">
                                                                                <div class="flex-grow-1">
                                                                                    <div class="d-flex align-items-center gap-2">
                                                                                        <div>
                                                                                            <h5 class="fs-12 text-muted mb-0"> Members :</h5>
                                                                                        </div>
                                                                                        <div class="avatar-group">
                                                                                            <div class="avatar-group-item">
                                                                                                <div class="avatar-xs">
                                                                                                    <img src="assets/images/users/avatar-4.jpg" alt="" class="rounded-circle img-fluid" />
                                                                                                </div>
                                                                                            </div>
                                                                                            <div class="avatar-group-item">
                                                                                                <div class="avatar-xs">
                                                                                                    <img src="assets/images/users/avatar-5.jpg" alt="" class="rounded-circle img-fluid" />
                                                                                                </div>
                                                                                            </div>
                                                                                            <div class="avatar-group-item">
                                                                                                <div class="avatar-xs">
                                                                                                    <div class="avatar-title rounded-circle bg-light text-primary">
                                                                                                        A
                                                                                                    </div>
                                                                                                </div>
                                                                                            </div>
                                                                                            <div class="avatar-group-item">
                                                                                                <div class="avatar-xs">
                                                                                                    <img src="assets/images/users/avatar-2.jpg" alt="" class="rounded-circle img-fluid" />
                                                                                                </div>
                                                                                            </div>
                                                                                        </div>
                                                                                    </div>
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                        <!-- end card body -->
                                                                    </div>
                                                                    <!-- end card -->
                                                                </div>
                                                                <!-- end slide item -->
                                                                <div class="swiper-slide">
                                                                    <div class="card profile-project-card shadow-none profile-project-danger mb-0">
                                                                        <div class="card-body p-4">
                                                                            <div class="d-flex">
                                                                                <div class="flex-grow-1 text-muted overflow-hidden">
                                                                                    <h5 class="fs-14 text-truncate mb-1">
                                                                                        <a href="#" class="text-body">Client - John</a>
                                                                                    </h5>
                                                                                    <p class="text-muted text-truncate mb-0"> Last Update : <span class="fw-semibold text-body">1 hr Ago</span></p>
                                                                                </div>
                                                                                <div class="flex-shrink-0 ms-2">
                                                                                    <div class="badge bg-success-subtle text-success fs-10"> Completed</div>
                                                                                </div>
                                                                            </div>
                                                                            <div class="d-flex mt-4">
                                                                                <div class="flex-grow-1">
                                                                                    <div class="d-flex align-items-center gap-2">
                                                                                        <div>
                                                                                            <h5 class="fs-12 text-muted mb-0"> Members :</h5>
                                                                                        </div>
                                                                                        <div class="avatar-group">
                                                                                            <div class="avatar-group-item">
                                                                                                <div class="avatar-xs">
                                                                                                    <img src="assets/images/users/avatar-2.jpg" alt="" class="rounded-circle img-fluid" />
                                                                                                </div>
                                                                                            </div>
                                                                                            <div class="avatar-group-item">
                                                                                                <div class="avatar-xs">
                                                                                                    <div class="avatar-title rounded-circle bg-light text-primary">
                                                                                                        C
                                                                                                    </div>
                                                                                                </div>
                                                                                            </div>
                                                                                        </div>
                                                                                    </div>
                                                                                </div>
                                                                            </div>
                                                                        </div><!-- end card body -->
                                                                    </div><!-- end card -->
                                                                </div><!-- end slide item -->
                                                                <div class="swiper-slide">
                                                                    <div class="card profile-project-card shadow-none profile-project-info mb-0">
                                                                        <div class="card-body p-4">
                                                                            <div class="d-flex">
                                                                                <div class="flex-grow-1 text-muted overflow-hidden">
                                                                                    <h5 class="fs-14 text-truncate mb-1">
                                                                                        <a href="#" class="text-body">Brand logo Design</a>
                                                                                    </h5>
                                                                                    <p class="text-muted text-truncate mb-0">Last Update : <span class="fw-semibold text-body">2 hr Ago</span></p>
                                                                                </div>
                                                                                <div class="flex-shrink-0 ms-2">
                                                                                    <div class="badge bg-warning-subtle text-warning fs-10"> Inprogress</div>
                                                                                </div>
                                                                            </div>
                                                                            <div class="d-flex mt-4">
                                                                                <div class="flex-grow-1">
                                                                                    <div class="d-flex align-items-center gap-2">
                                                                                        <div>
                                                                                            <h5 class="fs-12 text-muted mb-0"> Members :</h5>
                                                                                        </div>
                                                                                        <div class="avatar-group">
                                                                                            <div class="avatar-group-item">
                                                                                                <div class="avatar-xs">
                                                                                                    <img src="assets/images/users/avatar-5.jpg" alt="" class="rounded-circle img-fluid" />
                                                                                                </div>
                                                                                            </div>
                                                                                        </div>
                                                                                    </div>
                                                                                </div>
                                                                            </div>
                                                                        </div><!-- end card body -->
                                                                    </div><!-- end card -->
                                                                </div><!-- end slide item -->
                                                                <div class="swiper-slide">
                                                                    <div class="card profile-project-card shadow-none profile-project-danger mb-0">
                                                                        <div class="card-body p-4">
                                                                            <div class="d-flex">
                                                                                <div class="flex-grow-1 text-muted overflow-hidden">
                                                                                    <h5 class="fs-14 text-truncate mb-1">
                                                                                        <a href="#" class="text-body">Project update</a>
                                                                                    </h5>
                                                                                    <p class="text-muted text-truncate mb-0"> Last Update : <span class="fw-semibold text-body">4 hr Ago</span></p>
                                                                                </div>
                                                                                <div class="flex-shrink-0 ms-2">
                                                                                    <div class="badge bg-success-subtle text-success fs-10"> Completed</div>
                                                                                </div>
                                                                            </div>

                                                                            <div class="d-flex mt-4">
                                                                                <div class="flex-grow-1">
                                                                                    <div class="d-flex align-items-center gap-2">
                                                                                        <div>
                                                                                            <h5 class="fs-12 text-muted mb-0"> Members :</h5>
                                                                                        </div>
                                                                                        <div class="avatar-group">
                                                                                            <div class="avatar-group-item">
                                                                                                <div class="avatar-xs">
                                                                                                    <img src="assets/images/users/avatar-4.jpg" alt="" class="rounded-circle img-fluid" />
                                                                                                </div>
                                                                                            </div>
                                                                                            <div class="avatar-group-item">
                                                                                                <div class="avatar-xs">
                                                                                                    <img src="assets/images/users/avatar-5.jpg" alt="" class="rounded-circle img-fluid" />
                                                                                                </div>
                                                                                            </div>
                                                                                        </div>
                                                                                    </div>
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                        <!-- end card body -->
                                                                    </div>
                                                                    <!-- end card -->
                                                                </div>
                                                                <!-- end slide item -->
                                                                <div class="swiper-slide">
                                                                    <div class="card profile-project-card shadow-none profile-project-warning mb-0">
                                                                        <div class="card-body p-4">
                                                                            <div class="d-flex">
                                                                                <div class="flex-grow-1 text-muted overflow-hidden">
                                                                                    <h5 class="fs-14 text-truncate mb-1">
                                                                                        <a href="#" class="text-body">Chat App</a>
                                                                                    </h5>
                                                                                    <p class="text-muted text-truncate mb-0"> Last Update : <span class="fw-semibold text-body">1 hr Ago</span></p>
                                                                                </div>
                                                                                <div class="flex-shrink-0 ms-2">
                                                                                    <div class="badge bg-warning-subtle text-warning fs-10"> Inprogress</div>
                                                                                </div>
                                                                            </div>

                                                                            <div class="d-flex mt-4">
                                                                                <div class="flex-grow-1">
                                                                                    <div class="d-flex align-items-center gap-2">
                                                                                        <div>
                                                                                            <h5 class="fs-12 text-muted mb-0"> Members :</h5>
                                                                                        </div>
                                                                                        <div class="avatar-group">
                                                                                            <div class="avatar-group-item">
                                                                                                <div class="avatar-xs">
                                                                                                    <img src="assets/images/users/avatar-4.jpg" alt="" class="rounded-circle img-fluid" />
                                                                                                </div>
                                                                                            </div>
                                                                                            <div class="avatar-group-item">
                                                                                                <div class="avatar-xs">
                                                                                                    <img src="assets/images/users/avatar-5.jpg" alt="" class="rounded-circle img-fluid" />
                                                                                                </div>
                                                                                            </div>
                                                                                            <div class="avatar-group-item">
                                                                                                <div class="avatar-xs">
                                                                                                    <div class="avatar-title rounded-circle bg-light text-primary">
                                                                                                        A
                                                                                                    </div>
                                                                                                </div>
                                                                                            </div>
                                                                                        </div>
                                                                                    </div>
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                        <!-- end card body -->
                                                                    </div>
                                                                    <!-- end card -->
                                                                </div>
                                                                <!-- end slide item -->
                                                            </div>

                                                        </div>

                                                    </div>
                                                    <!-- end card body -->
                                                </div><!-- end card -->

                                            </div>
                                            <!--end col-->

                                            <div class="card">
                                                <div class="card-body">
                                                    <h5 class="card-title">Certificates</h5>
                                                    <!-- Swiper -->
                                                    <div class="row">
                                                        <div class="col-lg-12">
                                                            <div class="table-responsive">
                                                                <table class="table table-borderless align-middle mb-0">
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
                                        <!--end row-->
                                    </div>
                                    
                                    
                                    
                                    
                                    <div class="tab-pane fade" id="activities" role="tabpanel">
                                        
                                        <div class="card d-none">
                                            <div class="card-body">
                                                <h5 class="card-title mb-3">Academic/Professional Details</h5>
                                                
                                                    <div class="row">
                                                            
                                                            <div class="live-preview">
                                                                <form action="javascript:void(0);">
                                                                    <div class="row mb-3">
                                                                        <div class="col-lg-3">
                                                                            <label for="nameInput" class="form-label">Highest Qualification </label>
                                                                        </div>
                                                                        <div class="col-lg-9">
                                                                            <h5 class="fs-14 text-truncate mb-1">
                                                                                :&nbsp;<a href="#" class="text-body"> <?=$user_data['highest_qualification'] ?? ''?></a>
                                                                            </h5>
                                                                        </div>
                                                                    </div>
                                                                    
                                                                    <div class="row mb-3">
                                                                        <div class="col-lg-3">
                                                                            <label for="nameInput" class="form-label">Previous School/College*</label>
                                                                        </div>
                                                                        <div class="col-lg-9">
                                                                            <h5 class="fs-14 text-truncate mb-1">
                                                                                :&nbsp;<a href="#" class="text-body">  <?=$user_data['previous_school'] ?? ''?></a>
                                                                            </h5>
                                                                        </div>
                                                                    </div>
                                                                    
                                                                    <div class="row mb-3">
                                                                        <div class="col-lg-3">
                                                                            <label for="nameInput" class="form-label">Year of Passing</label>
                                                                        </div>
                                                                        <div class="col-lg-9">
                                                                            <h5 class="fs-14 text-truncate mb-1">
                                                                                :&nbsp;<a href="#" class="text-body">  <?=$user_data['year_of_passing'] ?? ''?></a>
                                                                            </h5>
                                                                        </div>
                                                                    </div>
                                                                    
                                                                    <div class="row mb-3">
                                                                        <div class="col-lg-3">
                                                                            <label for="nameInput" class="form-label">Percentage/Grade</label>
                                                                        </div>
                                                                        <div class="col-lg-9">
                                                                            <h5 class="fs-14 text-truncate mb-1">
                                                                                :&nbsp;<a href="#" class="text-body">  <?=$user_data['percentage_or_grade'] ?? '' ?></a>
                                                                            </h5>
                                                                        </div>
                                                                    </div>
                                                                    
                                                                    <div class="row mb-3">
                                                                        <div class="col-lg-3">
                                                                            <label for="nameInput" class="form-label">Teaching Experience (Years, if any)  </label>
                                                                        </div>
                                                                        <div class="col-lg-9">
                                                                            <h5 class="fs-14 text-truncate mb-1">
                                                                                :&nbsp;<a href="#" class="text-body">  <?=$user_data['teaching_experience'] ?? ''?></a>
                                                                            </h5>
                                                                        </div>
                                                                    </div>
                                                                    
                                                                 
                                                                  
                                                                </form>
                                                            </div>
                                                            
                                                            
                                                            
                                                        </div>

                                               
                                               
                                               
                                               
                                            </div>
                                            <!--end card-body-->
                                        </div>
                                        <!--end card-->
                                        
                                        <div class="card d-none">
                                            <div class="card-body">
                                                <h5 class="card-title">Certificates</h5>
                                                <!-- Swiper -->
                                                <div class="row">
                                                    <div class="col-lg-12">
                                                        <div class="table-responsive">
                                                            <table class="table table-borderless align-middle mb-0">
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
                                        
                                        
                                        <div class="card d-none">
                                            <div class="card-body">
                                                <h5 class="card-title">Work/Professional Information</h5>
                                                <!-- Swiper -->
                                                <div class="row">
                                                            
                                                    <div class="live-preview">
                                                        <form action="javascript:void(0);">
                                                           
                                                           
                                                            <div class="row mb-3">
                                                                <div class="col-lg-3">
                                                                    <label for="nameInput" class="form-label">Current Employment Status? </label>
                                                                </div>
                                                                <div class="col-lg-9">
                                                                    <h5 class="fs-14 text-truncate mb-1">
                                                                        :&nbsp;<a href="#" class="text-body"><?=$user_data['employment_status'] ?? ''?></a>
                                                                    </h5>
                                                                </div>
                                                            </div>
                                                            
                                                            <?php
                                                            if(!empty($user_data['employment_status']) && isset($user_data['employment_status'])){
                                                            if($user_data['employment_status'] == 'Employed')
                                                            {
                                                            ?>
                                                                <div class="row mb-3">
                                                                    <div class="col-lg-3">
                                                                        <label for="nameInput" class="form-label">Organization Name </label>
                                                                    </div>
                                                                    <div class="col-lg-9">
                                                                        <h5 class="fs-14 text-truncate mb-1">
                                                                            :&nbsp;<a href="#" class="text-body"><?=$user_data['organization_name'] ?? ''?></a>
                                                                        </h5>
                                                                    </div>
                                                                </div>
                                                                
                                                                <div class="row mb-3">
                                                                    <div class="col-lg-3">
                                                                        <label for="nameInput" class="form-label">Position/Designation </label>
                                                                    </div>
                                                                    <div class="col-lg-9">
                                                                        <h5 class="fs-14 text-truncate mb-1">
                                                                            :&nbsp;<a href="#" class="text-body"><?=$user_data['designation'] ?? ''?></a>
                                                                        </h5>
                                                                    </div>
                                                                </div>
                                                                
                                                                <div class="row mb-3">
                                                                    <div class="col-lg-3">
                                                                        <label for="nameInput" class="form-label">Years of Experience </label>
                                                                    </div>
                                                                    <div class="col-lg-9">
                                                                        <h5 class="fs-14 text-truncate mb-1">
                                                                            :&nbsp;<a href="#" class="text-body"><?=$user_data['experience_years'] ?? ''?></a>
                                                                        </h5>
                                                                    </div>
                                                                </div>
                                                                
                                                                
                                                                 <div class="row mb-3">
                                                                    <div class="col-lg-3">
                                                                        <label for="nameInput" class="form-label">Industry/Sector </label>
                                                                    </div>
                                                                    <div class="col-lg-9">
                                                                        <h5 class="fs-14 text-truncate mb-1">
                                                                            :&nbsp;<a href="#" class="text-body"><?=$user_data['industry_sector'] ?? '' ?></a>
                                                                        </h5>
                                                                    </div>
                                                                </div>
                                                            
                                                            <?php
                                                            }
                                                        }
                                                            ?>
                                                            
                                                        </form>
                                                    </div>
                                                    <!--end col-->
                                                </div>
                                            </div>
                                            <!-- end card body -->
                                        </div><!-- end card -->

                                              
                                              
                                        
                                    </div>
                                    <!--end tab-pane-->



                                    <div class="tab-pane fade" id="projects" role="tabpanel">

    <?php if (!empty($all_courses)): ?>

    <div class="row">

        <!-- LEFT SIDE COURSE SELECTOR -->
        <div class="col-md-3">

            <div class="list-group shadow-sm">
                <?php foreach ($all_courses as $idx => $course): ?>
                    <a class="list-group-item list-group-item-action <?= $idx == 0 ? 'active' : '' ?>"
                       data-bs-toggle="tab"
                       href="#course_<?= $course['course_id'] ?>">
                        <i class="ri-book-open-line me-2"></i>
                        <?= $course['course_title'] ?>
                    </a>
                <?php endforeach; ?>
            </div>

        </div>

        <!-- RIGHT SIDE DETAILS -->
        <div class="col-md-9">

            <div class="tab-content">

                <?php foreach ($all_courses as $idx => $course): ?>

                <!-- Course-specific tab -->
                <div class="tab-pane fade <?= $idx == 0 ? 'show active' : '' ?>" id="course_<?= $course['course_id'] ?>">

                    <!-- Course Title Card -->
                    <div class="card mb-3 shadow-sm">
                        <div class="card-body">
                            <h4 class="fw-bold mb-1">
                                <?= $course['course_title'] ?>
                            </h4>
                            <small class="text-muted">Short Name: <?= $course['course_short_name'] ?></small><br>
                            <!-- <small class="text-muted">Course ID: <?= $course['course_id'] ?></small> -->
                        </div>
                    </div>

                    <!-- Info Cards -->
                    <div class="row g-3">

                        <div class="col-md-4">
                            <div class="card shadow-sm h-100">
                                <div class="card-body">
                                    <i class="ri-team-fill fs-3 text-primary"></i>
                                    <h6 class="mt-2 mb-1">Batch</h6>
                                    <p class="text-muted"><?= $course['batch_title'] ?></p>
                                </div>
                            </div>
                        </div>

                        <div class="col-md-4">
                            <div class="card shadow-sm h-100">
                                <div class="card-body">
                                    <i class="ri-calendar-fill fs-3 text-success"></i>
                                    <h6 class="mt-2 mb-1">Enrollment Date</h6>
                                    <p class="text-muted">
                                        <?= date('d-m-Y', strtotime($course['enrollment_date'])) ?>
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div class="col-md-4">
                            <div class="card shadow-sm h-100">
                                <div class="card-body">
                                    <i class="ri-flag-2-fill fs-3 text-danger"></i>
                                    <h6 class="mt-2 mb-1">Enrollment Status</h6>
                                    <p class="text-muted"><?= $course['enrollment_status'] ?></p>
                                </div>
                            </div>
                        </div>

                    </div>

                    <!-- Enrollment Details -->
                    <div class="card mt-4 shadow-sm">
                        <div class="card-body">

                            <h5 class="card-title mb-3">Enrolment Details</h5>

                            <div class="row mb-2">
                                <div class="col-4 text-muted">Course</div>
                                <div class="col-8 fw-semibold"><?= $course['course_title'] ?></div>
                            </div>

                            <div class="row mb-2">
                                <div class="col-4 text-muted">Batch</div>
                                <div class="col-8 fw-semibold"><?= $course['batch_title'] ?></div>
                            </div>

                            <div class="row mb-2">
                                <div class="col-4 text-muted">Mode of Study</div>
                                <div class="col-8 fw-semibold"><?= $course['mode_of_study'] ?></div>
                            </div>

                            <div class="row mb-2">
                                <div class="col-4 text-muted">Preferred Language</div>
                                <div class="col-8 fw-semibold"><?= $course['language_title'] ?></div>
                            </div>

                        </div>
                    </div>

                </div>

                <?php endforeach; ?>

            </div>

        </div>

    </div>

    <?php else: ?>

        <!-- NO COURSE ENROLLED -->
        <div class="alert alert-warning text-center my-4">
            <i class="ri-information-line fs-4 me-2"></i>
            No courses enrolled for this student.
        </div>

    <?php endif; ?>

                                <!-- COMMON PAYMENT SECTION -->
                                <div class="card">
                                            <div class="card-body">
                                                <h5 class="card-title">Payments</h5>
                                                <!-- Payment Table -->
                                                    <div class="col-12">
                                                        <!-- Add Payment Button -->
                                                        <div class="col-12">
                                                            <div class="text-end mt-3">
                                                                <button 
                                                                    class="btn btn-primary rounded-3 <?= isset($view_data['id']) && !empty($this->data['view_data']['course_id']) ? '' : 'disabled' ?>"
                                                                    onclick="show_ajax_modal('<?= base_url('admin/student_fee/add/' 
                                                                        . (isset($view_data['id']) ? $view_data['id'] : '') 
                                                                        . '?course_id=' . (isset($this->data['view_data']['course_id']) ? $this->data['view_data']['course_id'] : '')
                                                                    ) ?>', 'Add payment')">
                                                                    <i class="ri-add-line me-2"></i>
                                                                    Add Payment
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
                                                                                <th>Installment Details</th>
                                                                                <th>Amount</th>
                                                                                <th>Due Date</th>
                                                                                <th>Mode of Payment</th>
                                                                                <th>Payment To</th>
                                                                                <th>Paid Date</th>
                                                                                <th>Status</th>
                                                                                <th>Action</th>
                                                                            </tr>
                                                                        </thead>
                                                                        <tbody id="payment-rows">
                                                                            <?php if (isset($view_data['id']) && !empty($this->data['view_data']['course_id'])) : ?>
                                                                                <?php foreach ($payments as $key => $payment): ?>
                                                                                    <tr>
                                                                                        <td><?= $key + 1; ?></td>
                                                                                        <td><?= $payment['course_title']; ?></td>
                                                                                        <td><?= htmlspecialchars($payment['installment_details']); ?></td>
                                                                                        <td>INR <?= number_format($payment['amount'], 2) ?></td>
                                                                                        <td><?= $payment['due_date'] ? date('d/m/Y', strtotime($payment['due_date'])) : '' ?></td>
                                                                                        <td><?= htmlspecialchars($payment['payment_mode']); ?></td>
                                                                                        <td><?= htmlspecialchars($payment['payment_to']); ?></td>
                                                                                        <td><?= $payment['paid_date'] && $payment['paid_date'] !== '0000-00-00' ? date('d/m/Y', strtotime($payment['paid_date'])) : '' ?></td>
                                                                                        <td
                                                                                            <?php
                                                                                            $today = date('Y-m-d');
                                                                                            $due_date = $payment['due_date'];

                                                                                            if ($payment['status'] === 'Pending' && $due_date < $today) {
                                                                                                echo '<span class="badge bg-danger">Overdue</span>';
                                                                                            } elseif ($due_date === $today) {
                                                                                                echo '<span class="badge bg-info">Due</span>';
                                                                                            } else {
                                                                                                switch ($payment['status']) {
                                                                                                    case 'Paid':
                                                                                                        echo '<span class="badge bg-success">Paid</span>';
                                                                                                        break;
                                                                                                    case 'Pending':
                                                                                                        echo '<span class="badge bg-warning">Pending</span>';
                                                                                                        break;
                                                                                                    default:
                                                                                                        echo '<span class="badge bg-light text-dark">Unknown</span>';
                                                                                                        break;
                                                                                                }
                                                                                            }
                                                                                            ?>
                                                                                        </td>
                                                                                        <td>
                                                                                            <a onclick="show_ajax_modal('<?= base_url('admin/student_fee/edit/' . $payment['id']) ?>', 'Edit payment')" class="btn btn-sm btn-primary">
                                                                                                <i class="ri-pencil-line"></i>
                                                                                            </a>
                                                                                            <a onclick="delete_modal('<?= base_url('admin/student_fee/delete/?id=' . $payment['id'] . '&student_id=' . $payment['user_id']) ?>')" class="btn btn-sm btn-danger">
                                                                                                <i class="ri-delete-bin-line"></i>
                                                                                            </a>
                                                                                        </td>
                                                                                    </tr>
                                                                                <?php endforeach; ?>
                                                                            <?php else : ?>
                                                                                <div class="alert alert-warning" role="alert">
                                                                                    Please provide basic information and course details first.
                                                                                </div>
                                                                            <?php endif; ?>
                                                                        </tbody>

                                                                    </table>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                
                                                <!-- Swiper
                                                <div class="row">
                                                    <div class="col-lg-12">
                                                        <div class="table-responsive">
                                                            <table class="table table-borderless align-middle mb-0">
                                                                <thead class="table-light">
                                                                    <tr>
                                                                        <th scope="col">Installment Details</th>
                                                                        <th scope="col">Amount</th>
                                                                        <th scope="col">Due Date</th>
                                                                        <th scope="col">Mode of Payment</th>
                                                                        <th scope="col">Payment To</th>
                                                                    </tr>
                                                                </thead>
                                                                <tbody>
                                                                <?php foreach ($payments as $key => $payment): ?>

                                                                    <tr>
                                                                        <td><?= htmlspecialchars($payment['installment_details']); ?></td>
                                                                        <td>INR <?= htmlspecialchars($payment['amount']); ?></td>
                                                                        <td><?= date('d/m/Y', strtotime($payment['due_date'])); ?></td>
                                                                        <td><?= htmlspecialchars($payment['payment_mode']); ?></td>
                                                                        <td><?= htmlspecialchars($payment['payment_to']); ?></td>
                                                                    </tr>
                                                                <?php endforeach; ?>
                                                                </tbody>
                                                            </table>
                                                        </div>
                                                     
                                                    </div>
                                                </div> -->
                                            </div>
                                        <!-- end card body -->
                                        </div><!-- end card -->

</div>

                                    <!--end tab-pane-->
                                    
                                    
                                    
                                    
                                    
                                    
                                    
                                    
                                    
                                    
                                    
                                    
                                    
                                    <div class="tab-pane fade" id="documents" role="tabpanel">
                                        <div class="card d-none">
                                            <div class="card-body">
                                                <div class="d-flex align-items-center mb-4">
                                                    <h5 class="card-title flex-grow-1 mb-0">Documents</h5>
                                                    <div class="flex-shrink-0">
                                                        <input class="form-control d-none" type="file" id="formFile">
                                                        <label for="formFile" class="btn btn-danger"><i class="ri-upload-2-fill me-1 align-bottom"></i> Upload File</label>
                                                    </div>
                                                </div>
                                                <div class="row">
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
                                                                    <tr>
                                                                        <td>
                                                                            <div class="d-flex align-items-center">
                                                                                <div class="avatar-sm">
                                                                                    <div class="avatar-title bg-secondary-subtle text-secondary rounded fs-20">
                                                                                        <i class="ri-video-line"></i>
                                                                                    </div>
                                                                                </div>
                                                                                <div class="ms-3 flex-grow-1">
                                                                                    <h6 class="fs-15 mb-0"><a href="javascript:void(0);">Tour-video.mp4</a></h6>
                                                                                </div>
                                                                            </div>
                                                                        </td>
                                                                        <td>MP4 File</td>
                                                                        <td>14.62 MB</td>
                                                                        <td>19 Nov 2021</td>
                                                                        <td>
                                                                            <div class="dropdown">
                                                                                <a href="javascript:void(0);" class="btn btn-light btn-icon" id="dropdownMenuLink4" data-bs-toggle="dropdown" aria-expanded="true">
                                                                                    <i class="ri-equalizer-fill"></i>
                                                                                </a>
                                                                                <ul class="dropdown-menu dropdown-menu-end" aria-labelledby="dropdownMenuLink4">
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
                                                                                    <div class="avatar-title bg-success-subtle text-success rounded fs-20">
                                                                                        <i class="ri-file-excel-fill"></i>
                                                                                    </div>
                                                                                </div>
                                                                                <div class="ms-3 flex-grow-1">
                                                                                    <h6 class="fs-15 mb-0"><a href="javascript:void(0);">Account-statement.xsl</a></h6>
                                                                                </div>
                                                                            </div>
                                                                        </td>
                                                                        <td>XSL File</td>
                                                                        <td>2.38 KB</td>
                                                                        <td>14 Nov 2021</td>
                                                                        <td>
                                                                            <div class="dropdown">
                                                                                <a href="javascript:void(0);" class="btn btn-light btn-icon" id="dropdownMenuLink5" data-bs-toggle="dropdown" aria-expanded="true">
                                                                                    <i class="ri-equalizer-fill"></i>
                                                                                </a>
                                                                                <ul class="dropdown-menu dropdown-menu-end" aria-labelledby="dropdownMenuLink5">
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
                                                                                    <div class="avatar-title bg-info-subtle text-info rounded fs-20">
                                                                                        <i class="ri-folder-line"></i>
                                                                                    </div>
                                                                                </div>
                                                                                <div class="ms-3 flex-grow-1">
                                                                                    <h6 class="fs-15 mb-0"><a href="javascript:void(0);">Project Screenshots Collection</a></h6>
                                                                                </div>
                                                                            </div>
                                                                        </td>
                                                                        <td>Floder File</td>
                                                                        <td>87.24 MB</td>
                                                                        <td>08 Nov 2021</td>
                                                                        <td>
                                                                            <div class="dropdown">
                                                                                <a href="javascript:void(0);" class="btn btn-light btn-icon" id="dropdownMenuLink6" data-bs-toggle="dropdown" aria-expanded="true">
                                                                                    <i class="ri-equalizer-fill"></i>
                                                                                </a>
                                                                                <ul class="dropdown-menu dropdown-menu-end" aria-labelledby="dropdownMenuLink6">
                                                                                    <li><a class="dropdown-item" href="javascript:void(0);"><i class="ri-eye-fill me-2 align-middle"></i>View</a></li>
                                                                                    <li>
                                                                                        <a class="dropdown-item" href="javascript:void(0);"><i class="ri-download-2-fill me-2 align-middle"></i>Download</a>
                                                                                    </li>
                                                                                    <li><a class="dropdown-item" href="javascript:void(0);"><i class="ri-delete-bin-5-line me-2 align-middle"></i>Delete</a></li>
                                                                                </ul>
                                                                            </div>
                                                                        </td>
                                                                    </tr>
                                                                    <tr>
                                                                        <td>
                                                                            <div class="d-flex align-items-center">
                                                                                <div class="avatar-sm">
                                                                                    <div class="avatar-title bg-danger-subtle text-danger rounded fs-20">
                                                                                        <i class="ri-image-2-fill"></i>
                                                                                    </div>
                                                                                </div>
                                                                                <div class="ms-3 flex-grow-1">
                                                                                    <h6 class="fs-15 mb-0">
                                                                                        <a href="javascript:void(0);">Velzon-logo.png</a>
                                                                                    </h6>
                                                                                </div>
                                                                            </div>
                                                                        </td>
                                                                        <td>PNG File</td>
                                                                        <td>879 KB</td>
                                                                        <td>02 Nov 2021</td>
                                                                        <td>
                                                                            <div class="dropdown">
                                                                                <a href="javascript:void(0);" class="btn btn-light btn-icon" id="dropdownMenuLink7" data-bs-toggle="dropdown" aria-expanded="true">
                                                                                    <i class="ri-equalizer-fill"></i>
                                                                                </a>
                                                                                <ul class="dropdown-menu dropdown-menu-end" aria-labelledby="dropdownMenuLink7">
                                                                                    <li><a class="dropdown-item" href="javascript:void(0);"><i class="ri-eye-fill me-2 align-middle"></i>View</a></li>
                                                                                    <li><a class="dropdown-item" href="javascript:void(0);"><i class="ri-download-2-fill me-2 align-middle"></i>Download</a></li>
                                                                                    <li>
                                                                                        <a class="dropdown-item" href="javascript:void(0);"><i class="ri-delete-bin-5-line me-2 align-middle"></i>Delete</a>
                                                                                    </li>
                                                                                </ul>
                                                                            </div>
                                                                        </td>
                                                                    </tr>
                                                                </tbody>
                                                            </table>
                                                        </div>
                                                        <div class="text-center mt-3">
                                                            <a href="javascript:void(0);" class="text-success"><i class="mdi mdi-loading mdi-spin fs-20 align-middle me-2"></i> Load more </a>
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
                        </div>
                        <!--end col-->
                    </div>
                    <!--end row-->

    <!-- JAVASCRIPT -->
    <script src="assets/libs/bootstrap/js/bootstrap.bundle.min.js"></script>
    <script src="assets/libs/simplebar/simplebar.min.js"></script>
    <script src="assets/libs/node-waves/waves.min.js"></script>
    <script src="assets/libs/feather-icons/feather.min.js"></script>
    <script src="assets/js/pages/plugins/lord-icon-2.1.0.js"></script>
    <script src="assets/js/plugins.js"></script>

    <!-- swiper js -->
    <script src="assets/libs/swiper/swiper-bundle.min.js"></script>

    <!-- profile init js -->
    <script src="assets/js/pages/profile.init.js"></script>

    <!-- App js -->
    <script src="assets/js/app.js"></script>
</body>

</html>