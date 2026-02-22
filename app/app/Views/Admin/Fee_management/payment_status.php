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
        
        <div class="row">
            <?php foreach ($totals as $key => $data): ?>
                <div class="col-md-3 mb-3">
                    <div class="card border-<?= $statusLabels[$key]['class'] ?>">
                        <div class="card-body text-center">
                            <h5 class="card-title text-<?= $statusLabels[$key]['class'] ?>">
                                <?= $statusLabels[$key]['label'] ?>
                            </h5>
                            <p class="card-text display-6 fw-bold fs-2">₹<?= number_format($data['amount'], 2) ?></p>
                            <small class="text-muted"><?= $data['count'] ?> payments</small>
                        </div>
                    </div>   
                </div> 
            <?php endforeach; ?>
        </div>
        <div class="card">
            <div class="card-body">
                <div class="row">
                    <form method="get" action="">
                        <div class="row g-3">

                            <div class="col-xxl-2 col-sm-4">
                                <div class="input-light">
                                    <label for="from_date" class="form-label">Name</label>
                                    <input type="text" class="form-control" name="name" id="name" value="<?= !empty($name) ? $name : ''?>">
                                </div>
                            </div>
                            
                             <div class="col-xxl-2 col-sm-4">
                                <div class="input-light">
                                    <label for="from_date" class="form-label">Due date from</label>
                                    <input type="date" class="form-control" name="from_date" id="from_date" value="<?= !empty($from_date) ? $from_date : ''?>">
                                </div>
                            </div>
                            <!--end col-->
                            <div class="col-xxl-2 col-sm-4">
                                <div class="input-light">
                                    <label for="to_date" class="form-label">Due date to</label>
                                    <input type="date" class="form-control" name="to_date" id="to_date" value="<?= !empty($to_date) ? $to_date : ''?>" >
                                </div>
                            </div>
        
                            <div class="col-xxl-2 col-sm-3">
                                <label for="course_id" class="form-label">Course</label>
                                <select class="form-control select2" name="course_id" id="course_id">
                                    <option value="">Select any course</option>
                                    <?php foreach ($courses as $course) {
                                        if (isset($course_id) && $course_id == $course['id']) {
                                            echo "<option value='" . $course['id'] . "' selected>" . $course['title'] . "</option>";
                                        } else {
                                            echo "<option value='" . $course['id'] . "'>" . $course['title'] . "</option>";
                                        }
                                    }
                                    ?>
                                </select>
                            </div>

                            <div class="col-xxl-2 col-sm-3">
                                <label for="course_id" class="form-label">Payment Status</label>
                               <select class="form-control select2" name="payment_status" id="payment_status">
                                <option value="" >All</option>
                                <option value="1" <?= (isset($payment['payment_status']) && $payment['payment_status'] == 1) ? 'selected' : '' ?>>OVERDUE</option>
                                <option value="2" <?= (isset($payment['payment_status']) && $payment['payment_status'] == 2) ? 'selected' : '' ?>>DUE</option>
                                <option value="3" <?= (isset($payment['payment_status']) && $payment['payment_status'] == 3) ? 'selected' : '' ?>>UPCOMING</option>
                                <option value="4" <?= (isset($payment['payment_status']) && $payment['payment_status'] == 4) ? 'selected' : '' ?>>PAID</option>
                            </select>

                            </div>

                            <div class="col-12 col-md-2 col-xxl-1 pt-md-1">
                                <button type="submit" class="btn btn-primary w-100 mt-md-4 py-md-2">
                                    <i class="ri-equalizer-fill align-bottom"></i> Filters
                                </button>
                            </div>
                            <div class="col-12 col-md-2 col-xxl-1 pt-md-1">
                                <a href="<?= base_url('admin/fee_management/payment_status') ?>" class="btn btn-danger w-100 mt-md-4 py-md-2">
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
                    id="All" href="<?= base_url('admin/fee_management/payment_status?from_date='.$from_date.'&to_date='.$to_date.'&course_id='.$course_id) ?>" role="tab">
                        All
                        <span class="badge bg-dark align-middle ms-1">
                            <?= $count_all ?>
                        </span>
                    </a>
                </li>

                <li class="nav-item">
                    <a class="nav-link py-3 Pending <?= (isset($_GET['list_by']) && $_GET['list_by'] == 1) ? 'active' : '' ?>"
                    id="Pending" href="<?= base_url('admin/fee_management/payment_status?list_by=1&from_date='.$from_date.'&to_date='.$to_date.'&course_id='.$course_id) ?>">
                        Over Due
                        <span class="badge bg-danger align-middle ms-1">
                            <?= $count_overdue ?>
                        </span>
                    </a>
                </li>

                <li class="nav-item">
                    <a class="nav-link py-3 New <?= (isset($_GET['list_by']) && $_GET['list_by'] == 2) ? 'active' : '' ?>"
                    id="New" href="<?= base_url('admin/fee_management/payment_status?list_by=2&from_date='.$from_date.'&to_date='.$to_date.'&course_id='.$course_id) ?>">
                        Due
                        <span class="badge bg-warning align-middle ms-1">
                            <?= $count_due ?>
                        </span>
                    </a>
                </li>

                <li class="nav-item">
                    <a class="nav-link py-3 Approved <?= (isset($_GET['list_by']) && $_GET['list_by'] == 3) ? 'active' : '' ?>"
                    id="Approved" href="<?= base_url('admin/fee_management/payment_status?list_by=3&from_date='.$from_date.'&to_date='.$to_date.'&course_id='.$course_id) ?>">
                        Upcoming
                        <span class="badge bg-info align-middle ms-1">
                            <?= $count_upcoming ?>
                        </span>
                    </a>
                </li>

                <li class="nav-item">
                    <a class="nav-link py-3 Pending <?= (isset($_GET['list_by']) && $_GET['list_by'] == 4) ? 'active' : '' ?>"
                    id="Paid" href="<?= base_url('admin/fee_management/payment_status?list_by=4&from_date='.$from_date.'&to_date='.$to_date.'&course_id='.$course_id) ?>">
                        Paid
                        <span class="badge bg-success align-middle ms-1">
                            <?= $count_paid ?>
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
            <th>course</th>
            <th>Installment Details</th>
            <th>Amount</th>
            <th>Due Date</th>
            <?php if(!isset($_GET['list_by']) || $_GET['list_by'] == 4) {?>
                <th>Paid Date</th>
            <?php } ?>
            <!-- <th>Status</th> -->
            <th>Payment Status</th>
            <th>Mode</th>
            <th>To</th>
        </tr>
    </thead>
    <tbody>
        <?php if (isset($payments)) {
            foreach ($payments as $key => $payment) {
                // Label for payment_status
                switch ($payment['payment_status']) {
                    case 1:
                        $paymentLabel = '<span class="badge bg-danger">OVERDUE</span>';
                        break;
                    case 2:
                        $paymentLabel = '<span class="badge bg-warning text-dark">DUE</span>';
                        break;
                    case 3:
                        $paymentLabel = '<span class="badge bg-info text-dark">UPCOMING</span>';
                        break;
                    case 4:
                        $paymentLabel = '<span class="badge bg-success">PAID</span>';
                        break;
                    default:
                        $paymentLabel = '';
                }
        ?>
                <tr>
                    <td><b><?= ++$key ?></b></td>
                    <td><?= $payment['student_id'] ?></td>
                    <td><?= $payment['student_name'] ?></td>
                    <td><?=$payment['course_title']?></td>
                    <td><?= $payment['installment_details'] ?></td>
                    <td>₹<?= number_format($payment['amount'], 2) ?></td>
                    <td><?= $payment['due_date']!=NULL ? date('d-m-Y', strtotime($payment['due_date'])) : '-'  ?></td>
                    <?php if(!isset($_GET['list_by']) || $_GET['list_by'] == 4) {?>
                        <td><?= $payment['paid_date']!=NULL && $payment['paid_date'] != '0000-00-00' ? date('d-m-Y', strtotime($payment['paid_date'])) : '-' ?></td>
                    <?php } ?>
                    <!-- <td><?//= $payment['status'] ?></td> -->
                    <td><?= $paymentLabel ?></td>
                    <td><?= $payment['payment_mode'] ?></td>
                    <td><?= $payment['payment_to'] ?></td>
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