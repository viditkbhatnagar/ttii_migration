<!-- start page title -->
<div class="row">
    <div class="col-12">
        <div class="page-title-box d-sm-flex align-items-center justify-content-between">
            <h4 class="mb-sm-0"><?=$page_title ?? ''?></h4>

            <div class="page-title-right">
                <ol class="breadcrumb m-0">
                    <li class="breadcrumb-item"><a href="<?=base_url('app/dashboard/index')?>">Dashboard</a></li>
                    <li class="breadcrumb-item active"><?=$page_title ?? ''?></li>
                </ol>
            </div>
        </div>
    </div>
</div>
<div class="row">
        
    <div class="col-lg-12">
        <div class="card">
            <div class="card-header">
                <div class="row">
                    <div class="col-8">
                        <h5 class="card-title mb-0"><?=$page_title ?? ''?></h5>
                    </div>
                    <?php if(has_permission('students/add')){ ?>
                    <div class="col-4">
                        <button class="btn btn-md btn-primary float-end"  onclick="show_ajax_modal('<?=base_url('app/students/ajax_add/')?>', 'Add Student')">
                            <i class="mdi mdi-plus"></i>
                            Create <?=$page_title ?? ''?>
                        </button>
                    </div>
                    <?php } ?>
                </div>
            </div>
            <div class="card-body">
                <div class="row">
                    <form method="get" action="">
                        <div class="row g-3">

                                <div class="col-xxl-2 col-sm-4">
                                    <label for="enrollment_status" class="form-label">Enrollment Status</label>
                                    <select class="form-control select2" name="enrollment_status" id="enrollment_status">
                                        <option value="">Select Enrollment Status</option>
                                        <option value="1" <?= (isset($_GET['enrollment_status']) && $_GET['enrollment_status'] === '1') ? 'selected' : '' ?>>Deferred </option>
                                        <option value="0" <?= (isset($_GET['enrollment_status']) && $_GET['enrollment_status'] === '0') ? 'selected' : '' ?>>Dropout</option>
                                        <option value="0" <?= (isset($_GET['enrollment_status']) && $_GET['enrollment_status'] === '2') ? 'selected' : '' ?>>Enrolled</option>
                                        <option value="0" <?= (isset($_GET['enrollment_status']) && $_GET['enrollment_status'] === '3') ? 'selected' : '' ?>>Graduated</option>
                                    </select>
                                </div>
                                <div class="col-xxl-2 col-sm-4">
                                    <label for="university_id" class="form-label">University</label>
                                    <select class="form-control select2" name="university_id" id="university_id">
                                        <option value="">Select University</option>
                                       <?php foreach($universities as $key=>$universty)
                                                {
                                                    if(isset($_GET['university_id']) && $_GET['university_id'] == $key) {
                                                        echo "<option value='".$key."'>".$universty."</option>";
                                                    } else {
                                                       echo "<option value='".$key."'>".$universty."</option>"; 
                                                    }
                                                }
                                            ?>
                                    </select>
                                </div>
                                <div class="col-12 col-md-2 col-xxl-1 pt-md-1">
                                    <button type="submit" class="btn btn-primary w-100 mt-md-4 py-md-2">
                                        <i class="ri-equalizer-fill align-bottom"></i> Filters
                                    </button>
                                </div>
                                <div class="col-12 col-md-2 col-xxl-1 pt-md-1">
                                    <a href="<?= base_url('app/students/index') ?>" class="btn btn-danger w-100 mt-md-4 py-md-2">
                                        <i class="ri-brush-fill align-bottom"></i> Clear
                                    </a>
                                </div>
                        </div>
                    </form>
                </div>
            </div>
        </div>
        <div class="row">
            <div class="col-12 col-md-6 col-lg-4 col-xl-3">
                <div class="card card-animate">
                    <div class="card-body">
                        <div class="d-flex justify-content-between">
                            <div>
                                <p class="fw-medium text-muted mb-0" style="font-size: 16px">TOTAL</p>
                                <h2 class="mt-4 ff-secondary fw-semibold"><span class="counter-value" data-target="<?=count($students) ?? 0?>">0</span></h2>
                            </div>
                            <div>
                                <div class="avatar-sm flex-shrink-0">
                                    <span class="avatar-title bg-info-subtle rounded-circle fs-2">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feather feather-users text-info"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <div class="col-12 col-md-6 col-lg-4 col-xl-3">
                <?php
                    $active_count = 0;
                    $dropout_count = 0;
                    
                    foreach ($students as $student) {
                        if ($student['enrollment_status'] == 1) {
                            $active_count++;
                        } elseif ($student['enrollment_status'] == 0) {
                            $dropout_count++;
                        }
                    }
                ?>
                <!--<div class="card card-animate">-->
                <!--    <div class="card-body">-->
                <!--        <div class="d-flex justify-content-between">-->
                <!--            <div>-->
                <!--                <p class="fw-medium text-muted mb-0" style="font-size: 16px">Enrolled Students</p>-->
                <!--                <h2 class="mt-4 ff-secondary fw-semibold"><span class="counter-value" data-target="<?= $active_count ?? 0?>">0</span></h2>-->
                <!--            </div>-->
                <!--            <div>-->
                <!--                <div class="avatar-sm flex-shrink-0">-->
                <!--                    <span class="avatar-title bg-success-subtle rounded-circle fs-2">-->
                <!--                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feather feather-users text-success"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>-->
                <!--                    </span>-->
                <!--                </div>-->
                <!--            </div>-->
                <!--        </div>-->
                <!--    </div>-->
                <!--</div>-->
            </div>
            
        </div>
        <div class="card">
            <div class="card-body">
                <div class="table-responsive">
                    <table id="" class="data_table_basic table table-bordered nowrap table-striped align-middle" style="width:100%">
                        <thead>
                            <tr>
                                <th style="width: 50px;">#</th>
                                <th>Name</th>
                                <th>Enrollment ID</th>
                                <th>Phone</th>
                                <th>E-mail</th>
                                <th>University</th>
                                <th>Enrollment Status</th>
                                <?php if(!is_client()){ ?>
                                    <th>Referred by</th>
                                <?php } ?>
                                <th style="width: 120px;">Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            <?php if (isset($students)) {
                                foreach ($students as $key => $student) {
                                    $student_id = $student['id'];
                                    if ($student['enrollment_status'] == 0) {
                                        $status = '<span class="badge badge1-danger   mb-2">Dropped</span>';
                                    } else if($student['enrollment_status'] == 2) {
                                        $status = '<span class="badge badge1-success   mb-2">Enrolled </span>';
                                    } else if($student['enrollment_status'] == 3) {
                                        $status = '<span class="badge badge1-warning text-black  mb-2">Graduated</span>';
                                    } else {
                                        $status = '<span class="badge badge1-info   mb-2">Deferred </span>';
                                    }
                                    ?>
                                    <tr>
                                        <td><?= ++$key ?></td>
                                        <td><?=$student['name']?></td>
                                        <td><?= $student['enrollment_id'] ?? '' ?></td>
                                        <td><?= '+' . $student['code'] . ' ' . $student['phone'] ?></td>
                                        <td><?= $student['email'] ?></td>
                                        <td>
                                            <?php foreach($universities as $key=>$universty){
                                                if($student['university_id'] == $key) 
                                                { 
                                                    echo "<li>".$universty."</li>";
                                                }
                                            }
                                            ?>
                                        </td>
                                        <td><?= $status ?></td>
                                        <td>
                                           <div class="dropdown d-inline-block">
                                                <button class="btn btn-soft-secondary btn-sm dropdown" type="button" data-bs-toggle="dropdown" aria-expanded="false">
                                                    <i class="ri-more-fill align-middle"></i>
                                                </button>
                                                <ul class="dropdown-menu dropdown-menu-end">
                                                    <li>
                                                        <a href="javascript::void()" class="dropdown-item"  onclick="show_ajax_modal('<?=base_url('app/students/view/'.$student['id'])?>','View Student')">
                                                            <i class="ri-eye-fill align-bottom me-2 text-muted"></i> View
                                                        </a>
                                                    </li>
                                                        <li>
                                                            <a href="javascript::void()" class="dropdown-item edit-item-btn" 
                                                               onclick="show_ajax_modal('<?= base_url('app/students/edit/' . $student['id']) ?>', 'Edit Student')">
                                                                <i class="ri-pencil-fill align-bottom me-2 text-muted"></i> Edit
                                                            </a>
                                                        </li>
                                                        <li>
                                                            <a href="javascript::void()" class="dropdown-item edit-item-btn" 
                                                               onclick="show_small_modal('<?= base_url('app/students/ajax_edit_password/' . $student['id']) ?>', 'Edit Username and Password')">
                                                                <i class="ri-pencil-fill align-bottom me-2 text-muted"></i> Change Username/Password
                                                            </a>
                                                        </li>
                                                        <li>
                                                            <a href="javascript::void()" class="dropdown-item remove-item-btn" onclick="delete_modal('<?=base_url('app/students/delete/'.$student['id'])?>')">
                                                                <i class="ri-delete-bin-fill align-bottom me-2 text-muted"></i> Delete
                                                            </a>
                                                        </li>
    
                                                </ul>
                                            </div>
                                        </td>
                                    </tr>
                                <?php }
                            } ?>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    </div>
</div><!--end row-->

<style>
.badge{
    color: white; /* White text */
    padding: 0.25em 0.4em; /* Padding around the badge */
    font-size: 75%; /* Slightly smaller font size */
    font-weight: 700; /* Bold text */
    border-radius: 0.2rem; /* Rounded corners */
    text-align: center; /* Center the text */
    display: inline-block; /* Ensure the badge is inline */
    white-space: nowrap; /* Prevent text from wrapping */
    vertical-align: baseline; /* Align with baseline of text */
}
.badge1-success {
    background-color: #28a745;
}

.badge1-danger {
    background-color: #dc3545; /* Red background */
}

.badge1-warning {
    background-color: #ffff00; /* Yellow background */
}

.badge1-info {
    background-color: #0080ff; /* Blue background */
}
</style>

<script>
     $(document).ready(function() {
        $('.select2').select2(); 
    });
</script>