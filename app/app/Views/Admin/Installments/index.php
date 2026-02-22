<!-- start page title -->
<div class="row">
    <div class="col-12">
        <div class="page-title-box d-sm-flex align-items-center justify-content-between">
            <h4 class="mb-sm-0"><?= $page_title ?></h4>

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
    <div class="col-12">
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
                                <a href="<?= base_url('/admin/fee_management/manage_installmets/'.$student_id) ?>"
                                    class="btn btn-danger w-100 mt-md-4 py-md-2">
                                    <i class="ri-brush-fill align-bottom"></i> Clear
                                </a>
                            </div>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    </div>
</div>
<div class="row">
    <div class="col-12 col-md-4 col-xl-3">
        <div class="card card-animate">
            <div class="card-body">
                <div class="d-flex justify-content-between">
                    <div>
                        <p class="fw-medium text-muted mb-0" style="font-size: 16px">TOTAL INSTALLMENTS</p>
                        <h2 class="mt-4 ff-secondary fw-semibold"><span class="counter-value"
                                data-target="<?= count($list_items) ?>">0</span></h2>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <div class="col-12 col-md-4 col-xl-3">
        <div class="card card-animate">
            <div class="card-body">
                <div class="d-flex justify-content-between">
                    <div>
                        <p class="fw-medium text-muted mb-0" style="font-size: 16px">TOTAL COURSE AMOUNT</p>
                        <h2 class="mt-4 ff-secondary fw-semibold">₹<span class="counter-value"
                                data-target="<?= $total_course_amount ?>">0</span></h2>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <div class="col-12 col-md-4 col-xl-3">
        <div class="card card-animate">
            <div class="card-body">
                <div class="d-flex justify-content-between">
                    <div>
                        <p class="fw-medium text-muted mb-0" style="font-size: 16px">ADDED AMOUNT</p>
                        <h2 class="mt-4 ff-secondary fw-semibold">₹<span class="counter-value"
                                data-target="<?= $added_amount ?>">0</span></h2>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <div class="col-12 col-md-4 col-xl-3">
        <div class="card card-animate">
            <div class="card-body">
                <div class="d-flex justify-content-between">
                    <div>
                        <p class="fw-medium text-muted mb-0" style="font-size: 16px">NOT ADDED AMOUNT</p>
                        <h2 class="mt-4 ff-secondary fw-semibold">₹<span class="counter-value"
                                data-target="<?= $not_added_amount ?>">0</span></h2>
                    </div>
                </div>
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
                        <h5 class="card-title mb-0"><?= $page_title ?></h5>
                    </div>
                    <div class="col-4">


                        <button class="btn btn-md btn-primary float-end"
                            onclick="show_ajax_modal('<?= base_url('admin/fee_management/add_installment/') . $student_id ?>', 'Add New Payment')">
                            <i class="mdi mdi-plus"></i>
                            Create <?= $page_title ?? '' ?>
                        </button>

                        <a class="btn btn-md btn-secondary float-end me-2"
                            href="<?= base_url('admin/fee_management/installments') ?>">
                            <i class="mdi mdi-arrow-left"></i>
                            Back
                        </a>
                    </div>
                </div>
            </div>
            <div class="card-body">
                <div class="table-responsive">
                    <table class="data_table_basic table table-bordered">
                        <thead class="table-light">
                            <tr>
                                <th>Sl No</th>
                                <th>Course Name</th>
                                <th>Installment Details</th>
                                <th>Amount</th>
                                <th>Due Date</th>
                                <th>Mode of Payment</th>
                                <th>Payment To</th>
                                <th>Paid Date</th>
                                <th>Status</th>
                                <th hidden>Action</th>
                            </tr>
                        </thead>
                        <tbody id="payment-rows">
                            <?php foreach ($list_items as $key => $payment): ?>
                                <tr>
                                    <td><?= $key + 1; ?></td>
                                    <td><?= htmlspecialchars($payment['course_name'] ?? ''); ?></td>
                                    <td><?= htmlspecialchars($payment['installment_details']); ?></td>
                                    <td>INR <?= number_format($payment['amount'], 2) ?></td>
                                    <td><?= $payment['due_date'] ? date('d/m/Y', strtotime($payment['due_date'])) : '' ?>
                                    </td>
                                    <td><?= htmlspecialchars($payment['payment_mode']); ?></td>
                                    <td><?= htmlspecialchars($payment['payment_to']); ?></td>
                                    <td><?= $payment['paid_date']!== '0000-00-00' ? date('d/m/Y', strtotime($payment['paid_date'])) : '' ?>
                                    </td>
                                    <td>
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
                                    <td hidden>
                                        <a onclick="show_ajax_modal('<?= base_url('admin/student_fee/edit/' . $payment['id']) ?>', 'Edit payment')"
                                            class="btn btn-sm btn-primary">
                                            <i class="ri-pencil-line"></i>
                                        </a>
                                        <a onclick="delete_modal('<?= base_url('admin/student_fee/delete/?id=' . $payment['id'] . '&student_id=' . $payment['user_id']) ?>')"
                                            class="btn btn-sm btn-danger">
                                            <i class="ri-delete-bin-line"></i>
                                        </a>
                                    </td>
                                </tr>
                            <?php endforeach; ?>
                        </tbody>

                    </table>
                </div>
            </div>
        </div>
    </div>
</div>

<script>
    function toggleFeeStructure(key) {
        const listGroup = document.querySelector(`#fee-structure-${key}`);
        const hiddenItems = listGroup.querySelectorAll('.list-group-item.d-none');
        const toggleButton = document.querySelector(`#toggle-fee-${key}`);

        // Check if currently showing more or less
        const isExpanded = toggleButton.innerText === 'View Less';

        listGroup.querySelectorAll('.list-group-item').forEach((item, index) => {
            if (index > 1) { // Keep the first two visible, toggle the rest
                item.classList.toggle('d-none', isExpanded);
            }
        });

        toggleButton.innerText = isExpanded ? 'View More' : 'View Less';
    }

</script>