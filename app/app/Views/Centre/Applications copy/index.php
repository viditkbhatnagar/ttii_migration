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
                    <?php if (has_permission('applications/add')) { ?>
                        <div class="col-4">
                            <a href="<?= base_url('admin/applications/add/') ?>" class="btn btn-md btn-primary float-end">
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
<!-- </?= print_r($_GET); ?> -->
                            <!-- From Date -->
                            <div class="col-xxl-2 col-sm-4">
                                <div class="input-light custom-rounded-2-em">
                                    <label for="from_date" class="form-label">From date</label>
                                    <input type="date" class="form-control px-4 py-3-srs" name="from_date" id="from_date" value="<?= !empty($_GET['from_date']) ? $_GET['from_date'] : '' ?>">
                                </div>
                            </div>
                            <!--end col-->

                            <!-- To Date -->
                            <div class="col-xxl-2 col-sm-4">
                                <div class="input-light custom-rounded-2-em">
                                    <label for="to_date" class="form-label">To date</label>
                                    <input type="date" class="form-control px-4 py-3-srs" name="to_date" id="to_date" value="<?= !empty($_GET['to_date']) ? $_GET['to_date'] : '' ?>">
                                </div>
                            </div>
                            <!--end col-->

                            <!-- Course -->
                            <div class="col-xxl-2 col-sm-4">
                                <div class="input-light custom-rounded-2-em">
                                    <label for="course" class="form-label">Course</label>
                                    <select class="p-0 form-control select2 " name="course" id="course">
                                        <option value="0" <?= !isset($_GET['course']) || $_GET['course'] == 0 ? 'selected' : '' ?>>None</option>
                                        <?php foreach ($course as $val) { ?>
                                        <option value="<?= $val['id'] ?>" <?= isset($_GET['course']) && $_GET['course'] == $val['id'] ? 'selected' : '' ?>><?= $val['title'] ?></option>
                                        <?php } ?>
                                    </select>
                                </div>
                            </div>
                            <!--end col-->

                            <div class="col-xxl-2 col-sm-4">
                                <label for="filter_pipeline" class="form-label">Pipeline</label>
                                <select class="form-control select2" name="filter_pipeline" id="filter_pipeline">
                                    <option value="" hidden>Select Pipeline</option>
                                    <option value="sender" <?= (isset($_GET['filter_pipeline']) && $_GET['filter_pipeline'] === 'sender') ? 'selected' : '' ?>>Senders</option>
                                    <option value="counsellor" <?= (isset($_GET['filter_pipeline']) && $_GET['filter_pipeline'] === 'counsellor') ? 'selected' : '' ?>>Counsellors</option>
                                    <option value="student" <?= (isset($_GET['filter_pipeline']) && $_GET['filter_pipeline'] === 'student') ? 'selected' : '' ?>>Student Referral</option>
                                    <option value="associates" <?= (isset($_GET['filter_pipeline']) && $_GET['filter_pipeline'] === 'associates') ? 'selected' : '' ?>>Associates</option>
                                </select>
                            </div>
                            
                            <div class="col-12 col-md-2 col-xxl-1 pt-md-1">
                                <button type="submit" class="btn btn-primary w-100 mt-md-4 py-md-2">
                                    <i class="ri-equalizer-fill align-bottom"></i> Filters
                                </button>
                            </div>
                            <div class="col-12 col-md-2 col-xxl-1 pt-md-1">
                                <a href="<?= base_url('admin/applications/index') ?>" class="btn btn-danger w-100 mt-md-4 py-md-2">
                                    <i class="ri-brush-fill align-bottom"></i> Clear
                                </a>
                            </div>
                        </div>
                    </form>
                </div>
            </div>
        </div>


        <div class="card p-3 overflow-auto">

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
                        <th>Pipeline</th>
                        <th>Pipeline User</th>
                        <th style="width: 120px;">Action</th>
                    </tr>
                </thead>
                <tbody>
                    <?php if (isset($students)) {
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
                                <td><?= $student['pipeline'] ?></td>
                                <td><?= $student['pipeline_user'] ?></td>
                                <td>
                                    <div class="dropdown d-inline-block">
                                        <button class="btn btn-transprent btn-sm dropdown" type="button" data-bs-toggle="dropdown" aria-expanded="false">
                                            <i class="ri-more-fill align-middle fs-4"></i>
                                        </button>
                                        <ul class="dropdown-menu dropdown-menu-end">

                                            <!-- <li>
                                                <a href="javascript:void(0);" 
                                                    onclick="confirmConversion('<?= base_url('admin/applications/convert/' . $student['id']) ?>')" 
                                                    class="dropdown-item">
                                                    <i class="ri-arrow-left-right-line align-bottom me-2 text-muted"></i> Convert to Student
                                                </a>
                                            </li> -->
                                            <li>
                                                <a href="<?= base_url('admin/applications/view/' . $student['id']) ?>" class="dropdown-item" >
                                                    <i class="ri-eye-fill align-bottom me-2 text-muted"></i> View
                                                </a>
                                            </li>
                                            <li>
                                                <a href="<?= base_url('admin/applications/edit/' . $student['id']) ?>" class="dropdown-item edit-item-btn">
                                                    <i class="ri-pencil-fill align-bottom me-2 text-muted"></i> Edit
                                                </a>
                                            </li>
                                            
                                            <li>
                                                <a href="javascript::void()" class="dropdown-item remove-item-btn" onclick="delete_modal('<?= base_url('admin/applications/delete/' . $student['id']) ?>')">
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

<script>
function confirmConversion(url) {
    if (confirm('Are you sure you want to convert this application to a student?')) {
        window.location.href = url;
    }
}
</script>
