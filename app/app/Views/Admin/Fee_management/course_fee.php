<!-- start page title -->
<div class="row">
    <div class="col-12">
        <div class="page-title-box d-sm-flex align-items-center justify-content-between">
            <h4 class="mb-sm-0"><?= $page_title ?? '' ?></h4>

            <div class="page-title-right">
                <ol class="breadcrumb m-0">
                    <li class="breadcrumb-item"><a href="<?= base_url('app/dashboard/index') ?>">Dashboard</a></li>
                    <li class="breadcrumb-item active"><?= $page_title ?? '' ?></li>
                </ol>
            </div>
        </div>
    </div>
</div>
<div class="row">

    <div class="col-lg-12">
        <div class="card">
            <div class="card-body">
                <div class="row ">
                    <form method="get" action="">
                        <div class="row g-3">

                            <div class="col-xxl-2 col-sm-4  d-none">
                                <label for="university_id" class="form-label">University</label>
                                <select class="form-control select2" name="university_id" id="client_id">
                                    <option value="">Select any university</option>
                                    <?php foreach ($universities as $university) {
                                        if (isset($_GET['university_id']) && $_GET['university_id'] == $university['id']) {
                                            echo "<option value='" . $university['id'] . "' selected>" . $university['title'] . "</option>";
                                        } else {
                                            echo "<option value='" . $university['id'] . "'>" . $university['title'] . "</option>";
                                        }
                                    }
                                    ?>
                                </select>
                            </div>

                            <div class="col-xxl-2 col-sm-4  d-none">
                                <label for="course_id" class="form-label">Course</label>
                                <select class="form-control select2" name="course_id" id="course_id">
                                    <option value="">Select any course</option>
                                    <?php foreach ($courses as $course) {
                                        if (isset($_GET['course_id']) && $_GET['course_id'] == $course['id']) {
                                            echo "<option value='" . $course['id'] . "' selected>" . $course['title'] . "</option>";
                                        } else {
                                            echo "<option value='" . $course['id'] . "'>" . $course['title'] . "</option>";
                                        }
                                    }
                                    ?>
                                </select>
                            </div>

                            <?php if (is_admin()) { ?>
                                <div class="col-xxl-2 col-sm-4  d-none">
                                    <label for="consultant_id" class="form-label">Consultant</label>
                                    <select class="form-control select2" name="consultant_id" id="consultant_id">
                                        <option value="">Select any consultant</option>
                                        <?php foreach ($consultants as $consultant) {
                                            if (isset($_GET['consultant_id']) && $_GET['consultant_id'] == $consultant['id']) {
                                                echo "<option value='" . $consultant['id'] . "' selected>" . $consultant['name'] . "</option>";
                                            } else {
                                                echo "<option value='" . $consultant['id'] . "'>" . $consultant['name'] . "</option>";
                                            }
                                        }
                                        ?>
                                    </select>
                                </div>
                            <?php } ?>
                            <div class="col-xxl-2 col-sm-4  d-none">
                                <label for="source" class="form-label">Sourse</label>

                                <select class="form-control select2" name="source" id="source">
                                    <option value="">Select Source</option>
                                    <option value="referral" <?= (isset($_GET['source']) && $_GET['source'] == 'referral') ? 'selected' : '' ?>>Referral</option>
                                    <option value="website" <?= (isset($_GET['source']) && $_GET['source'] == 'website') ? 'selected' : '' ?>>Website</option>
                                    <option value="social media" <?= (isset($_GET['source']) && $_GET['source'] == 'social media') ? 'selected' : '' ?>>Social Media</option>
                                    <option value="client" <?= (isset($_GET['source']) && $_GET['source'] == 'client') ? 'selected' : '' ?>>Client</option>
                                    <option value="other" <?= (isset($_GET['source']) && $_GET['source'] == 'other') ? 'selected' : '' ?>>Other</option>
                                </select>
                            </div>

                            <div class="col-xxl-2 col-sm-4">
                                <label for="admission_status" class="form-label">Status</label>
                                <select class="form-control select2" name="admission_status" id="admission_status">
                                    <option value="">Select Status</option>
                                    <option value="0" <?= (isset($_GET['admission_status']) && $_GET['admission_status'] == '0') ? 'selected' : '' ?>>Pending</option>
                                    <option value="1" <?= (isset($_GET['admission_status']) && $_GET['admission_status'] == '1') ? 'selected' : '' ?>>In progress</option>
                                    <option value="2" <?= (isset($_GET['admission_status']) && $_GET['admission_status'] == '2') ? 'selected' : '' ?>>Enrolled</option>
                                    <option value="3" <?= (isset($_GET['admission_status']) && $_GET['admission_status'] == '3') ? 'selected' : '' ?>>Passed Out</option>
                                    <option value="4" <?= (isset($_GET['admission_status']) && $_GET['admission_status'] == '4') ? 'selected' : '' ?>>Dropout</option>
                                    <option value="5" <?= (isset($_GET['admission_status']) && $_GET['admission_status'] == '5') ? 'selected' : '' ?>>Cancelled</option>
                                </select>
                            </div>

                            <div class="col-12 col-md-2 col-xxl-1 pt-md-1">
                                <button type="submit" class="btn btn-primary w-100 mt-md-4 py-md-2">
                                    <i class="ri-equalizer-fill align-bottom"></i> Filters
                                </button>
                            </div>
                            <div class="col-12 col-md-2 col-xxl-1 pt-md-1">
                                <a href="<?= base_url('/app/fee_management/installmets') ?>" class="btn btn-danger w-100 mt-md-4 py-md-2">
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
                    <a class="nav-link py-3 All <?= !isset($_GET['list_by']) ? 'active' : '' ?>"
                        id="All" href="<?= base_url('app/fee_management/installmets') ?>" role="tab" aria-selected="true">
                        All
                    </a>
                </li>

                <li class="nav-item">
                    <a class="nav-link py-3 New <?= (isset($_GET['list_by']) && $_GET['list_by'] == 'added') ? 'active' : '' ?>"
                        id="New" href="<?= base_url('app/fee_management/installmets?list_by=added') ?>">
                        Added
                        <span class="badge bg-danger align-middle ms-1">
                            <?= $added_count ?>
                        </span>
                    </a>
                </li>

                <li class="nav-item">
                    <a class="nav-link py-3 Pending <?= (isset($_GET['list_by']) && $_GET['list_by'] == 'partially_added') ? 'active' : '' ?>"
                        id="Pending" href="<?= base_url('app/fee_management/installmets?list_by=partially_added') ?>">
                        Partially Added
                        <span class="badge bg-danger align-middle ms-1">
                            <?= $partial_count ?>
                        </span>
                    </a>
                </li>

                <li class="nav-item">
                    <a class="nav-link py-3 Approved <?= (isset($_GET['list_by']) && $_GET['list_by'] == 'not_added') ? 'active' : '' ?>"
                        id="Approved" href="<?= base_url('app/fee_management/installmets?list_by=not_added') ?>">
                        Not Added
                        <span class="badge bg-danger align-middle ms-1">
                            <?= $not_added_count ?>
                        </span>
                    </a>
                </li>
            </ul>



            <table class="data_table_basic table table-borderless table-nowrap bg-white rounded">
                <thead>
                    <tr>
                        <th style="width: 50px;">#</th>
                        <th>Student ID</th>
                        <th>Name</th>
                        <th>University</th>
                        <th>Course</th>
                        <th>Total Course Fee</th>
                        <th>Session</th>
                        <th>Consultant</th>
                        <th>Enrollment Status</th>
                        <th>Installmets</th>
                    </tr>
                </thead>
                <tbody>
                    <?php if (isset($students)) {
                        foreach ($students as $key => $student) {
                            $student_id = $student['id'];
                            if ($student['admission_status'] == 0) {
                                $status = '<span class="badge badge1-danger mb-2">Pending</span>';
                            } else if ($student['admission_status'] == 1) {
                                $status = '<span class="badge badge1-warning text-black mb-2">In progress</span>';
                            } else {
                                $status = '<span class="badge badge1-success mb-2">Enrolled</span>';
                            }
                    ?>
                            <tr>
                                <td><b><?= ++$key ?></b></td>
                                <td><?= 'UPC00' . $student['student_id'] ?? '' ?></td>
                                <td><?= $student['name'] ?></td>
                                <td><?= $student['university_name'] ?></td>
                                <td><?= $student['course_name'] ?></td>
                                <td><?= $student['total_course_amount'] ?></td>
                                <td><?= $student['session'] ?></td>
                                <td><?= $student['consultant_name'] ?></td>
                                <td><?= $status ?></td>
                                <th><a class="btn btn-sm btn-primary" href="<?= base_url('app/fee_management/manage_installmets') ?>/<?= $student_id ?>">View Installmets</a></th>
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

    .data_table_basic tbody tr:hover {
        box-shadow: 0px 0px 10px rgba(0, 0, 0, 0.1);
    }
</style>

<script>
    $(document).ready(function() {
        $('.select2').select2();
    });
</script>