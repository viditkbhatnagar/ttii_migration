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
            <div class="card-body">
                <div class="row">
                    <form method="get" action="">
                        <div class="row g-3">

                            <!-- <div class="col-xxl-2 col-sm-4">
                                <label for="university_id" class="form-label">University</label>
                                <select class="form-control select2" name="university_id" id="client_id">
                                    <option value="">Select any university</option>
                                    </?php foreach ($universities as $university) {
                                        if (isset($_GET['university_id']) && $_GET['university_id'] == $university['id']) {
                                            echo "<option value='" . $university['id'] . "' selected>" . $university['title'] . "</option>";
                                        } else {
                                            echo "<option value='" . $university['id'] . "'>" . $university['title'] . "</option>";
                                        }
                                    }
                                    ?>
                                </select>
                            </div> -->

                            <div class="col-xxl-2 col-sm-4">
                                <label for="student_id" class="form-label">Student</label>
                                <select class="form-control select2" name="student_id" id="student_id">
                                    <option value="">Select any student</option>
                                    <?php foreach ($students_list as $std) {
                                        if (isset($_GET['student_id']) && $_GET['student_id'] == $std['id']) {
                                            echo "<option value='" . $std['id'] . "' selected>" . $std['name'] . "</option>";
                                        } else {
                                            echo "<option value='" . $std['id'] . "'>" . $std['name'] . "</option>";
                                        }
                                    }
                                    ?>
                                </select>
                            </div>


                            <div class="col-xxl-2 col-sm-4">
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

                            <!-- </?php if (is_admin()) { ?>
                                <div class="col-xxl-2 col-sm-4">
                                    <label for="consultant_id" class="form-label">Consultant</label>
                                    <select class="form-control select2" name="consultant_id" id="consultant_id">
                                        <option value="">Select any consultant</option>
                                        </?php foreach ($consultants as $consultant) {
                                            if (isset($_GET['consultant_id']) && $_GET['consultant_id'] == $consultant['id']) {
                                                echo "<option value='" . $consultant['id'] . "' selected>" . $consultant['name'] . "</option>";
                                            } else {
                                                echo "<option value='" . $consultant['id'] . "'>" . $consultant['name'] . "</option>";
                                            }
                                        }
                                        ?>
                                    </select>
                                </div>
                            </?php } ?> -->
                            <!-- <div class="col-xxl-2 col-sm-4">
                                <label for="source" class="form-label">Sourse</label>

                                <select class="form-control select2" name="source" id="source">
                                    <option value="">Select Source</option>
                                    <option value="referral" <?= (isset($_GET['source']) && $_GET['source'] == 'referral') ? 'selected' : '' ?>>Referral</option>
                                    <option value="website" <?= (isset($_GET['source']) && $_GET['source'] == 'website') ? 'selected' : '' ?>>Website</option>
                                    <option value="social media" <?= (isset($_GET['source']) && $_GET['source'] == 'social media') ? 'selected' : '' ?>>Social Media</option>
                                    <option value="client" <?= (isset($_GET['source']) && $_GET['source'] == 'client') ? 'selected' : '' ?>>Client</option>
                                    <option value="other" <?= (isset($_GET['source']) && $_GET['source'] == 'other') ? 'selected' : '' ?>>Other</option>
                                </select>
                            </div> -->

                            <div class="col-xxl-2 col-sm-4">
                                <label for="admission_status" class="form-label">Payment Status</label>
                                <select class="form-control select2" name="payment_status" id="payment_status">
                                    <option value="">Select Status</option>
                                    <option value="Pending" <?= (isset($_GET['payment_status']) && $_GET['payment_status'] == 'Pending') ? 'selected' : '' ?>>Pending</option>
                                    <option value="Paid" <?= (isset($_GET['payment_status']) && $_GET['payment_status'] == 'Paid') ? 'selected' : '' ?>>Paid</option>
                                </select>
                            </div>

                            <div class="col-12 col-md-2 col-xxl-1 pt-md-1">
                                <button type="submit" class="btn btn-primary w-100 mt-md-4 py-md-2">
                                    <i class="ri-equalizer-fill align-bottom"></i> Filters
                                </button>
                            </div>
                            <div class="col-12 col-md-2 col-xxl-1 pt-md-1">
                                <a href="<?= base_url('/admin/fee_management/installments') ?>"
                                    class="btn btn-danger w-100 mt-md-4 py-md-2">
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
                        href="<?= base_url('admin/fee_management/installments?' . http_build_query(array_merge($params, ['list_by' => null]))) ?>" role="tab" aria-selected="true">
                        All
                    </a>
                </li>

                <li class="nav-item">
                    <a class="nav-link py-3 New <?= (isset($_GET['list_by']) && $_GET['list_by'] == 'added') ? 'active' : '' ?>"
                        id="New" href="<?= base_url('admin/fee_management/installments?' . http_build_query(array_merge($params, ['list_by' => 'added']))) ?>">
                        Fully Added
                        <span class="badge bg-danger align-middle ms-1">
                            <?= $added_count ?>
                        </span>
                    </a>
                </li>

                <li class="nav-item">
                    <a class="nav-link py-3 Pending <?= (isset($_GET['list_by']) && $_GET['list_by'] == 'partially_added') ? 'active' : '' ?>"
                        id="Pending" href="<?= base_url('admin/fee_management/installments?' . http_build_query(array_merge($params, ['list_by' => 'partially_added']))) ?>">
                        Partially Added
                        <span class="badge bg-danger align-middle ms-1">
                            <?= $partial_count ?>
                        </span>
                    </a>
                </li>

                <li class="nav-item">
                    <a class="nav-link py-3 Approved <?= (isset($_GET['list_by']) && $_GET['list_by'] == 'not_added') ? 'active' : '' ?>"
                        id="Approved" href="<?= base_url('admin/fee_management/installments?' . http_build_query(array_merge($params, ['list_by' => 'not_added']))) ?>">
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
                        <th>Installment  Details</th>
                        <th>Enrolled Course(s)</th>
                        <th>Total Courses Fee</th>
                        <!-- <th>Installment Amount</th>
                        <th>Due date</th>
                        <th>Payment Mode</th>
                        <th>Payment To</th>
                        <th>Payment Status</th> -->
                        <th>Action</th>
                    </tr>
                </thead>

                <tbody>
                <?php 

                $colors = [
                    'Paid'    => '#e8f5e9', // light green
                    'Pending' => '#ffeef0'  // light red/pink
                ];

                if (isset($students)) {
                    foreach ($students as $key => $student) {

                        $statusText = $student['payment_status'] ?? 'Pending';
                        $rowColor   = $colors[$statusText] ?? '#ffffff';

                        $status = ($statusText === 'Paid')
                            ? '<span class="badge badge1-success">Paid</span>'
                            : '<span class="badge badge1-danger">Pending</span>';
                ?>
                        <tr>
                        <!-- <tr style="background-color: </?= $rowColor ?>;"> -->
                            <td><b><?= ++$key ?></b></td>
                            <td><?= $student['student_id'] ?></td>
                            <td><?= $student['student'] ?></td>
                            <td><?= $student['installment_details'] ?></td>
                            <td>
                                <ul>
                                    <?php foreach ($student['course_names'] as $course) { ?>
                                        <li><?= $course ?></li>
                                    <?php } ?>
                                </ul>

                            </td>
                            <td>₹ <?= $student['total_course_amount'] ?></td>
                            <!-- <td><?= $student['amount']?></td>
                            <td><?= $student['due_date']?></td>
                            <td><?= $student['payment_mode']?></td>
                            <td><?= $student['payment_to']?></td>
                            <td><?= $status ?></td> -->
                            <td>
                                <a class="btn btn-sm btn-primary" href="<?= base_url('admin/fee_management/manage_installmets/'.$student['id']) ?>">
                                    View Installments
                                </a>
                            </td>
                        </tr>
                <?php
                    }
                }
                ?>
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
        box-shadow: 0px 0px 5px 5px rgba(0, 0, 0, 0.1);
        filter: brightness(95%);
        transition: 0.2s ease-in-out;


    }
    
</style>

<script>
    $(document).ready(function() {
        $('.select2').select2();
    });
</script>