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
        <div class="card">
            <div class="card-header">
                <div class="row">
                    <div class="col-8">
                        <h5 class="card-title mb-0"><?= $page_title ?? '' ?></h5>
                    </div>
                    <?php if (has_permission('students/add')) { ?>
                        <div class="col-4">
                            <a href="<?= base_url('admin/students/add/') ?>" class="btn btn-md btn-primary float-end">
                                <i class="mdi mdi-plus"></i>
                                Add <?= $page_title ?? '' ?>
                            </a>
                        </div>
                    <?php } ?>
                </div>
            </div>
            <div class="card-body">
                <div class="row">
                    <form method="get" action="">
                        <div class="row g-3">

                             <div class="col-xxl-2 col-sm-4">
                                <label for="stud_course" class="form-label">Course</label>
                                <select class="form-control select2" name="course_id" id="stud_course">
                                    <option value="">Select course</option>
                                    <?php if (isset($course)) {
                                        foreach ($course as $course) { ?>
                                            <option value="<?= $course['id'] ?>" <?= (isset($_GET['course_id']) && $_GET['course_id'] === $course['id']) ? 'selected' : '' ?>><?= $course['title'] ?></option>
                                        <?php }
                                    }
                                    ?>
                                </select>
                            </div>

                            <div class="col-xxl-2 col-sm-4">
                                <label for="stud_course" class="form-label">Batch</label>
                                <select class="form-control select2" name="batch_id" id="stud_course">
                                    <option value="">Select batch</option>
                                    <?php if (isset($batch)) {
                                        foreach ($batch as $batch) { ?>
                                            <option value="<?= $batch['id'] ?>" <?= (isset($_GET['batch_id']) && $_GET['batch_id'] === $batch['id']) ? 'selected' : '' ?>><?= $batch['title'] ?></option>
                                        <?php }
                                    }
                                    ?>
                                </select>
                            </div>

                            <div class="col-xxl-2 col-sm-4">
                                <label for="stud_status" class="form-label">Status</label>
                                <select class="form-control select2" name="status" id="stud_status">
                                    <option value="">Select Status</option>
                                    <option value="Active" <?= (isset($_GET['status']) && $_GET['status'] === 'Active') ? 'selected' : '' ?>>Active </option>
                                    <option value="Inactive" <?= (isset($_GET['status']) && $_GET['status'] === 'Inactive') ? 'selected' : '' ?>>Inactive</option>
                                </select>
                            </div>

                            <div class="d-none">
                                    <input type="hidden" name="list_by" value="<?=(isset($_GET['list_by']))?>" class="form-control">
                            </div>
                            
                            <div class="col-12 col-md-2 col-xxl-1 pt-md-1">
                                <button type="submit" class="btn btn-primary w-100 mt-md-4 py-md-2">
                                    <i class="ri-equalizer-fill align-bottom"></i> Filters
                                </button>
                            </div>
                            <div class="col-12 col-md-2 col-xxl-1 pt-md-1">
                                <a href="<?= base_url('admin/students/index') ?>" class="btn btn-danger w-100 mt-md-4 py-md-2">
                                    <i class="ri-brush-fill align-bottom"></i> Clear
                                </a>
                            </div>
                        </div>
                    </form>
                </div>
            </div>
        </div>


        <div class="card p-3 overflow-auto">

            <ul class="nav nav-tabs nav-tabs-custom nav-success mb-3" role="tablist">
                <li class="nav-item">
                    <a class="nav-link py-3 All <?= !isset($_GET['list_by']) ? 'active' : '' ?>" id="All"
                        href="<?= base_url('admin/students/index') ?>" role="tab" aria-selected="true">
                        All
                    </a>
                </li>

                <li class="nav-item">
                    <a class="nav-link py-3 Active <?= (isset($_GET['list_by']) && $_GET['list_by'] == 'Active') ? 'active' : '' ?>"
                        id="Active" href="<?= base_url('admin/students/index?list_by=Active') ?>">
                        Active
                    </a>
                </li>

                <li class="nav-item">
                    <a class="nav-link py-3 Inactive <?= (isset($_GET['list_by']) && $_GET['list_by'] == 'Inactive') ? 'active' : '' ?>"
                        id="Incative" href="<?= base_url('admin/students?list_by=Inactive') ?>">
                        Inactive
                    </a>
                </li>
            </ul>


            <table class="data_table_basic table table-borderless table-nowrap bg-white rounded">
                <thead>
                    <tr>
                        <th style="width: 50px;">#</th>
                        <th>Student ID</th>
                        <th>Profile</th>
                        <th>Name</th>
                        <th>Course</th>
                        <th>Batch</th>
                        <th>Enrollment ID</th>
                        <th>Phone</th>
                        <th>E-mail</th>
                        
                        <th>Status</th>
                        <th style="width: 120px;">Action</th>
                    </tr>
                </thead>
                <tbody>
                    <?php if (isset($students)) {
                        foreach ($students as $key => $student) {
                            $student_id = $student['id'];
                            // if ($student['status'] == 0) {
                            //     $status = '<span class="badge badge1-danger   mb-2">Inactive</span>';
                            // } else {
                            //    $status = '<span class="badge badge-success mb-2">' . $student['course_enrol_status'] . '</span>';
                            // }
                    ?>
                            <tr>
                                <td><b><?= ++$key ?></b></td>
                                <td><?= $student['student_id'] ?? '' ?></td>
                                <td>
                                    <?php
                                    if(!empty($student['profile_picture']))
                                    { ?>
                                        <img src="<?= base_url(get_file($student['profile_picture'])) ?>" class="img-thumbnail rounded-circle" alt="profile image" style="width: 50px; height: 50px;">
                                    <?php
                                    }else{
                                        echo '<img src="https://placehold.co/600x400?text=Student" class="img-thumbnail rounded-circle" alt="profile image" style="width: 50px; height: 50px;">';
                                    }
                                    ?>
                                </td>
                                <td><?= $student['name'] ?></td>
                                
                                <td><?= $student['course_title'] ?? '' ?></td>
                                <td><?= $student['batch_title'] ?? '' ?></td>
                                <td><?= $student['enrollment_id'] ?? '' ?></td>
                                <td><?= '+' . $student['country_code'] . ' ' . $student['phone'] ?></td>
                                <td><?= $student['user_email'] ?></td>
                                
                                <!-- <td><span class="badge badge-success mb-2"></?= $student['course_enrol_status'] ?></span></td> -->
                                <td><?= $student['course_enrol_status'] ?> </td>
                                <td>

                                        <div class="dropdown d-inline-block">
                                            <button class="btn btn-transprent btn-sm dropdown" type="button" data-bs-toggle="dropdown" aria-expanded="false">
                                                <i class="ri-more-fill align-middle fs-4"></i>
                                            </button>
                                            <ul class="dropdown-menu dropdown-menu-end">
                                                <li class="d-none">
                                                    <a href="javascript::void()" class="dropdown-item" onclick="show_ajax_modal('<?= base_url('admin/students/view/' . $student['id']) ?>','View Student')">
                                                        <i class="ri-eye-fill align-bottom me-2 text-muted"></i> View
                                                    </a>
                                                </li>
                                                <li>
                                                    <a href="<?= base_url('admin/students/view/' . $student['id']) ?>" class="dropdown-item" >
                                                        <i class="ri-eye-fill align-bottom me-2 text-muted"></i> View
                                                    </a>
                                                </li>
                                                <li>
                                                    <a href="<?= base_url('admin/students/edit/' . $student['id']) ?>" class="dropdown-item edit-item-btn">
                                                        <i class="ri-pencil-fill align-bottom me-2 text-muted"></i> Edit
                                                    </a>
                                                </li>
                                                <li>
                                                    <a href="javascript::void()" class="dropdown-item edit-item-btn"
                                                        onclick="show_small_modal('<?= base_url('admin/students/ajax_edit_password/' . $student['id']) ?>', 'Edit Username and Password')">
                                                        <i class="ri-pencil-fill align-bottom me-2 text-muted"></i> Change Username/Password
                                                    </a>
                                                </li>
                                                <li>
                                                    <a href="javascript::void()" class="dropdown-item edit-item-btn"
                                                        onclick="show_small_modal('<?= base_url('admin/students/ajax_edit_enrollment/' . $student['id']) ?>', 'Edit Enrollment ID')">
                                                        <i class="ri-pencil-fill align-bottom me-2 text-muted"></i> Edit Enrollment ID
                                                    </a>
                                                </li>
                                                <li class="d-none">
                                                    <a href="javascript::void()" class="dropdown-item remove-item-btn" onclick="delete_modal('<?= base_url('admin/students/delete/' . $student['id']) ?>')">
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
</div><!--end row-->

<style>
    .badge {
        color: white;
        /* White text */
        padding: 0.25em 0.4em;
        /* Padding around the badge */
        font-size: 75%;
        /* Slightly smaller font size */
        font-weight: 700;
        /* Bold text */
        border-radius: 0.2rem;
        /* Rounded corners */
        text-align: center;
        /* Center the text */
        display: inline-block;
        /* Ensure the badge is inline */
        white-space: nowrap;
        /* Prevent text from wrapping */
        vertical-align: baseline;
        /* Align with baseline of text */
    }

    .badge1-success {
        background-color: #28a745;
    }

    .badge1-danger {
        background-color: #dc3545;
        /* Red background */
    }

    .badge1-warning {
        background-color: #ffff00;
        /* Yellow background */
    }

    .badge1-info {
        background-color: #0080ff;
        /* Blue background */
    }
    
    .data_table_basic tbody tr:hover{
	    box-shadow: 0px 0px 10px rgba(0,0,0,0.1);
    }
</style>

<script>
    $(document).ready(function() {
        $('.select2').select2();
    });
</script>