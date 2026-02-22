<!-- start page title -->
<div class="row">
    <div class="col-12">
        <div class="page-title-box d-sm-flex align-items-center justify-content-between">
            <h4 class="mb-sm-0"><?= $page_title ?? '' ?></h4>

            <div class="page-title-right">
                <ol class="breadcrumb m-0">
                    <li class="breadcrumb-item"><a href="<?= base_url('centre/dashboard/index') ?>">Dashboard</a></li>
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
                    <?php if (has_permission('applications/add')) { ?>
                        <div class="col-4">
                            <a href="<?= base_url('centre/applications/add/') ?>" class="btn btn-md btn-primary float-end">
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
                                <label for="course" class="form-label">Status</label>
                                <select class="form-control select2" name="course" id="course">
                                    <option value="">Select Course</option>
                                    <?php if(isset($assigned_courses) && !empty($assigned_courses)) :
                                        foreach ($assigned_courses as $course) { ?>
                                        <option value="<?= $course['course_id'] ?>" <?= (isset($_GET['course']) && $_GET['course'] === $course['course_id']) ? 'selected' : '' ?>><?= $course['course_title'] ?></option>
                                    <?php }
                                    endif; ?>
                                </select>
                            </div>

                            <div class="col-xxl-2 col-sm-4">
                                <label for="stud_status" class="form-label">Status</label>
                                <select class="form-control select2" name="status" id="stud_status">
                                    <option value="">Select Status</option>
                                    <option value="1" <?= (isset($_GET['status']) && $_GET['status'] === '1') ? 'selected' : '' ?>>Active </option>
                                    <option value="0" <?= (isset($_GET['status']) && $_GET['status'] === '0') ? 'selected' : '' ?>>Inactive</option>
                                </select>
                            </div>
                            
                            <div class="col-12 col-md-2 col-xxl-1 pt-md-1">
                                <button type="submit" class="btn btn-primary w-100 mt-md-4 py-md-2">
                                    <i class="ri-equalizer-fill align-bottom"></i> Filters
                                </button>
                            </div>
                            <div class="col-12 col-md-2 col-xxl-1 pt-md-1">
                                <a href="<?= base_url('centre/applications/index') ?>" class="btn btn-danger w-100 mt-md-4 py-md-2">
                                    <i class="ri-brush-fill align-bottom"></i> Clear
                                </a>
                            </div>
                        </div>
                    </form>
                </div>
            </div>
        </div>


        <div class="card p-3 overflow-auto">

        <?php $params = $_GET; ?>
            
            <ul class="nav nav-tabs nav-tabs-custom nav-success mb-3" role="tablist">
                <li class="nav-item">
                    <a class="nav-link py-3 All <?= !isset($_GET['list_by']) ? 'active' : '' ?>" id="All"
                        href="<?= base_url('centre/applications/index?' . http_build_query(array_merge($params, ['list_by' => null]))) ?>" role="tab" aria-selected="true">
                        All
                    </a>
                </li>

                <li class="nav-item">
                    <a class="nav-link py-3 New <?= (isset($_GET['list_by']) && $_GET['list_by'] == 'pending') ? 'active' : '' ?>"
                        id="New" href="<?= base_url('centre/applications/index?' . http_build_query(array_merge($params, ['list_by' => 'pending']))) ?>">
                        Pending
                        <span class="badge bg-danger align-middle ms-1">
                            <?= $pending_count ?>
                        </span>
                    </a>
                </li>

                <li class="nav-item">
                    <a class="nav-link py-3 Rejected <?= (isset($_GET['list_by']) && $_GET['list_by'] == 'rejected') ? 'active' : '' ?>"
                        id="Rejected" href="<?= base_url('centre/applications/index?' . http_build_query(array_merge($params, ['list_by' => 'rejected']))) ?>">
                        Rejected
                        <span class="badge bg-danger align-middle ms-1">
                            <?= $rejected_count ?>
                        </span>
                    </a>
                </li>

            </ul>

            <table class="data_table_basic table table-borderless table-nowrap bg-white rounded">
                <thead>
                    <tr>
                        <th style="width: 50px;">#</th>
                        <th>Application ID</th>
                        <th>Application Date</th>
                        <th>Name</th>
                        <th>Course</th>
                        <th>Phone No</th>
                        <th>E-mail</th>
                        <!-- <th>Pipeline</th>
                        <th>Pipeline User</th> -->
                        <th style="width: 120px;">Action</th>
                    </tr>
                </thead>
                <tbody>
                    <?php if (isset($students) && !empty($students)) {
                        foreach ($students as $key => $student) {
                            $student_id = $student['id'];
                            if ($student['status'] == 0) {
                                $status = '<span class="badge badge1-danger   mb-2">Inactive</span>';
                            } else {
                                $status = '<span class="badge badge1-success   mb-2">Active</span>';
                            }
                    ?>
                            <tr>
                                <td><b><?= ++$key ?></b></td>
                                <td><?= $student['application_id'] ?></td>
                                <td><?= date('d F Y', strtotime($student['created_at'])) ?></td>
                                <td><?= $student['name'] ?></td>
                                <td>
                                    <span class="badge text-success bg-success-subtle ms-2" style="font-size: 0.7rem;">
                                        <?= $student['course_title'] ?>
                                    </span>
                                </td>
                                <td><?= '+' . $student['country_code'] . ' ' . $student['phone'] ?></td>
                                <td><?= $student['user_email'] ?></td>
                                <!-- <td></?= $student['pipeline'] ?></td>
                                <td></?= $student['pipeline_user'] ?></td> -->
                                <!--<td>-->
                                <!--     <a href="javascript:void(0);" -->
                                <!--           onclick="confirmConversion('<?= base_url('centre/applications/convert/' . $student['id']) ?>')" -->
                                <!--           class="btn btn-outline-primary btn-sm rounded-4">-->
                                <!--           Convert to Student-->
                                <!--        </a>                                -->
                                <!--</td>-->
                                
                                <td>

                                        <div class="dropdown d-inline-block">
                                            <button class="btn btn-transprent btn-sm dropdown" type="button" data-bs-toggle="dropdown" aria-expanded="false">
                                                <i class="ri-more-fill align-middle fs-4"></i>
                                            </button>
                                            <ul class="dropdown-menu dropdown-menu-end">
                                               
                                                <li>
                                                    <a href="<?= base_url('centre/applications/view/' . $student['id']) ?>" class="dropdown-item" >
                                                        <i class="ri-eye-fill align-bottom me-2 text-muted"></i> View
                                                    </a>
                                                </li>
                                                <li>
                                                    <a href="<?= base_url('centre/applications/edit/' . $student['id']) ?>" class="dropdown-item edit-item-btn">
                                                        <i class="ri-pencil-fill align-bottom me-2 text-muted"></i> Edit
                                                    </a>
                                                </li>
                                                
                                                <li>
                                                    <a href="javascript::void()" class="dropdown-item remove-item-btn" onclick="delete_modal('<?= base_url('centre/applications/delete/' . $student['id']) ?>')">
                                                        <i class="ri-delete-bin-fill align-bottom me-2 text-muted"></i> Delete
                                                    </a>
                                                </li>

                                            </ul>
                                        </div>

                                </td>
                            </tr>
                    <?php }
                    }else{ echo '<tr><td colspan="9" class="text-center">No Applications found</td></tr>'; } ?>
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

<script>
function confirmConversion(url) {
    if (confirm('Are you sure you want to convert this application to a student?')) {
        window.location.href = url;
    }
}
</script>
