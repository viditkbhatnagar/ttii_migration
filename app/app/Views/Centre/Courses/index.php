<!-- start page title -->
<!-- <div class="row">
    <div class="col-12">
        <div class="page-title-box d-sm-flex align-items-center justify-content-between">
            <h4 class="mb-sm-0"><?= $page_title ?? '' ?></h4>

            <div class="page-title-right">
                <ol class="breadcrumb m-0">
                    <li class="breadcrumb-item"><a href="<?= base_url('admin/dashboard/index') ?>">Dashboard</a></li>
                    <li class="breadcrumb-item"><a href="<?= base_url('admin/wallet/index') ?>">Wallet</a></li>
                    <li class="breadcrumb-item active"><?= $page_title ?? '' ?></li>
                </ol>
            </div>
        </div>
    </div>
</div> -->

<!-- <div class="card">
    <div class="card-body">
        <h5 class="card-title mb-3">Wallet Transactions</h5> -->

        <!-- Filter buttons -->
        <!-- <div class="mb-3">
            <button type="button" class="btn btn-primary btn-sm me-2" onclick="filterTransactions('all')">All</button>
            <button type="button" class="btn btn-success btn-sm me-2" onclick="filterTransactions('credit')">Credits</button>
            <button type="button" class="btn btn-danger btn-sm" onclick="filterTransactions('debit')">Debits</button>
        </div> -->

        <!-- Transactions list -->
        <!-- <div id="transactions-list">
            <?php if (!empty($transactions)) : ?>
                <?php foreach ($transactions as $txn) : ?>
                    <div class="transaction-item mb-2" data-type="<?= $txn['transaction_type'] ?>">
                        <strong style="color: <?= $txn['transaction_type'] == 'credit' ? 'green' : 'red' ?>">
                            <?= ucfirst($txn['transaction_type']) ?>: ₹<?= number_format($txn['amount'],2) ?>
                        </strong>
                        <div class="small text-muted">
                            <?= $txn['remarks'] ?> | <?= date('d-m-Y h:i A', strtotime($txn['created_at'])) ?>
                        </div>
                        <hr class="my-1">
                 </div>
                <?php endforeach; ?>
            <?php else : ?>
                <p class="text-muted">No transactions found</p>
            <?php endif; ?>
        </div> -->
    <!-- </div>   
</div> -->


<!-- <script>
function filterTransactions(type) {
    $('.transaction-item').each(function() {
        if(type === 'all') {
            $(this).show();
        } else {
            if($(this).data('type') === type) {
                $(this).show();
            } else {
                $(this).hide();
            }
        }
    });
}
</script> -->


<!-- start page title -->
<div class="row">
    <div class="col-12">
        <div class="page-title-box d-sm-flex align-items-center justify-content-between">
            <h4 class="mb-sm-0"><?= $page_title ?? '' ?></h4>

            <div class="page-title-right">
                <ol class="breadcrumb m-0">
                    <li class="breadcrumb-item"><a href="<?= base_url('centres/dashboard/index') ?>">Dashboard</a></li>
                    <li class="breadcrumb-item"><a href="<?= base_url('centres/courses/index') ?>">Courses</a></li>
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
                        <h5 class="card-title mb-0"><?=$page_title ?? 'Assined Courses'?></h5>
                    </div>
                </div>
            </div>
        </div>
    </div>
</div>


        <div class="row">
            <div class="col-12">

                <div class="card shadow-sm border-0">
                    <div class="card-body p-4">
                        <table id="assigned_courses_table" 
                            class="data_table_basic table table-bordered table-striped align-middle" 
                            style="width:100%">

                            <thead>
                                <tr>
                                    <th style="width: 50px;">#</th>
                                    <th style="width: 200px;">Course Code</th>
                                    <th style="width: 200px;">Course</th>
                                    <th style="width: 180px;">Approved Fee</th>
                                    <th style="width: 220px;">Duration</th>
                                    <th style="width: 120px;">Status</th>
                                </tr>
                            </thead>

                            <tbody>
                            <?php if (!empty($assigned_courses)) { 
                                foreach ($assigned_courses as $key => $row) { ?>
                                    <tr data-type="<?= (empty($row['end_date']) || strtotime($row['end_date']) >= date('Y-m-d')) ? 'active' : 'inactive' ?>">

                                        <td><?= $key + 1 ?></td>

                                        <td>
                                            <span class="fw-bold">
                                                <?= $row['short_name'] ?>
                                            </span>
                                        </td>
                                        <td>
                                            <strong><?= $row['course_title'] ?></strong>
                                        </td>

                                        <td>
                                            ₹ <?= number_format($row['assigned_amount'], 2) ?>
                                        </td>

                                        <td>
                                            <?php if (!empty($row['start_date'])): ?>
                                                <?= date('d M Y', strtotime($row['start_date'])) ?>
                                                to
                                                <?= date('d M Y', strtotime($row['end_date'])) ?>
                                            <?php else: ?>
                                                <span class="text-muted">Not set</span>
                                            <?php endif; ?>
                                        </td>

                                        <td>
                                            <?php
                                                $today = date('Y-m-d');
                                                if (!empty($row['start_date']) && !empty($row['end_date'])) {
                                                    $start_date = date('Y-m-d', strtotime($row['start_date']));
                                                    $end_date = date('Y-m-d', strtotime($row['end_date']));
                                                    if ($start_date <= $today && $end_date >= $today) {
                                                        if (date('Y-m-d', strtotime($row['end_date'])) == $today) {
                                                            echo '<span class="badge bg-warning">Ending Today</span>';
                                                        } else {
                                                            echo '<span class="badge bg-success">Active</span>';
                                                        }
                                                    } elseif ($start_date > $today) {
                                                        echo '<span class="badge bg-secondary">Not started</span>';
                                                    } elseif ($end_date < $today) {
                                                        echo '<span class="badge bg-danger">Inactive</span>';
                                                    }
                                                } else {
                                                    echo '<span class="badge bg-secondary">Not set</span>';
                                                }
                                            ?>
                                        </td>

                                    </tr>
                                <?php } 
                            } else { ?>
                                <tr>
                                    <td colspan="6" class="text-center text-muted">
                                        No courses assigned to this centre yet
                                    </td>
                                </tr>
                            <?php } ?>
                            </tbody>

                        </table>

                    </div>
                </div>

            </div>
            </div>

    </div>






<script>
function filterTxn(type) {
    const rows = document.querySelectorAll('#assigned_courses_table tbody tr');

    rows.forEach(row => {
        if (type === 'all') {
            row.style.display = '';
        } else {
            row.style.display = row.dataset.type === type ? '' : 'none';
        }
    });

    document.querySelectorAll('.btn-group .btn').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');
}

</script>

