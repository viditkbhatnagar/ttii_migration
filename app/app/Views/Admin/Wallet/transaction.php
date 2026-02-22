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
                    <li class="breadcrumb-item"><a href="<?= base_url('admin/dashboard/index') ?>">Dashboard</a></li>
                    <li class="breadcrumb-item"><a href="<?= base_url('admin/centres/index') ?>">Wallet</a></li>
                    <li class="breadcrumb-item active"><?= $page_title ?? '' ?></li>
                </ol>
            </div>
        </div>
    </div>
</div>

<div class="row mb-3">
    <div class="col-md-12">
        <div class="card p-3 d-flex flex-row justify-content-between align-items-center">
            
            <h5 class="card-title mb-0">Wallet Transactions</h5>

            <a href="<?= base_url('admin/centres/index/') ?>" class="btn btn-primary">
                <i class="ri-arrow-left-line"></i> Back
            </a>

        </div>
    </div>
</div>

<div class="row">
    <div class="col-md-12">
        <div class="card text-white border-0 shadow-lg"
             style="background: linear-gradient(135deg, #283c5fff, #0e3f87ff); border-radius:16px;">
            
            <div class="card-body p-4">

                <!-- Header -->
                <div class="d-flex justify-content-between align-items-start flex-wrap gap-3">

                    <div>
                        <p class="text-muted mb-1 small">Current Balance</p>
                        <h2 class="fw-bold text-white">₹ <?= $centre_data['wallet_balance'] ?></h2>
                        <p class="text-muted small mb-0">Center ID: <?= $centre_data['centre_id'] ?></p>
                    </div>

                    <!-- <div class="d-flex gap-2 flex-wrap">
                        <button class="btn btn-light px-3 fw-medium" onclick="show_ajax_modal('</?=base_url('centre/Wallet/ajax_add_fund/')?>', 'Request Fund')">
                            + Add Funds
                        </button>
                        <button class="btn btn-outline-light px-3">
                            Download Statement
                        </button>
                    </div> -->

                </div>

                <hr class="my-4" style="border-color: rgba(255,255,255,0.15);">

                <!-- Footer -->
                <div class="row">

                    <!-- Credits -->
                    <div class="col-md-6 d-flex align-items-center gap-3">
                        <div class="bg-success bg-opacity-25 text-success rounded p-3 fs-5">
                            ↘
                        </div>

                        <div>
                            <small class="text-uppercase text-muted">Total Credits</small>
                            <h5 class="mb-0 fw-semibold text-white">₹ 
                                <?php if(!empty($credits)) :
                                     $total_credits = 0;
                                     foreach ($credits as $txn) : 
                                        $total_credits += $txn['amount'];
                                        endforeach; ?>
                                    <?= number_format($total_credits,2) ?>
                                <?php endif; ?></h5>
                        </div>
                    </div>

                    <!-- Debits -->
                    <div class="col-md-6 d-flex align-items-center gap-3 mt-3 mt-md-0">
                        <div class="bg-danger bg-opacity-25 text-danger rounded p-3 fs-5">
                            ↗
                        </div>

                        <div>
                            <small class="text-uppercase text-muted">Total Debits</small>
                            <h5 class="mb-0 fw-semibold text-white">₹ 
                                <?php if(!empty($debits)) :
                                     $total_debits = 0;
                                     foreach ($debits as $txn) : 
                                        $total_debits += $txn['amount'];
                                        endforeach; ?>
                                    <?= number_format($total_debits,2) ?>
                                <?php endif; ?></h5>
                            </h5>
                        </div>
                    </div>

                </div>

            </div>
        </div>
    </div>
</div>

<div class="row">
    <!-- Credits Card -->
    <div class="col-md-6">
        <div class="card">
            <div class="card-body">
                <h5 class="card-title mb-3">Credits</h5>
                <?php if (!empty($credits)) : ?>
                    <table class="table table-bordered table-sm">
                        <thead>
                            <tr>
                                <th>Amount</th>
                                <th>Remarks</th>
                                <th>Date</th>
                            </tr>
                        </thead>
                        <tbody>
                            <?php foreach ($credits as $txn) : ?>
                                <tr>
                                    <td style="color: green;">₹<?= number_format($txn['amount'],2) ?></td>
                                    <td><?= $txn['remarks'] ?></td>
                                    <td><?= date('d-m-Y h:i A', strtotime($txn['created_at'])) ?></td>
                                </tr>
                            <?php endforeach; ?>
                        </tbody>
                    </table>
                <?php else : ?>
                    <p class="text-muted">No credits found</p>
                <?php endif; ?>
            </div>
        </div>
    </div>

    <!-- Debits Card -->
    <div class="col-md-6">
        <div class="card">
            <div class="card-body">
                <h5 class="card-title mb-3">Debits</h5>
                <?php if (!empty($debits)) : ?>
                    <table class="table table-bordered table-sm">
                        <thead>
                            <tr>
                                <th>Amount</th>
                                <th>Remarks</th>
                                <th>Date</th>
                            </tr>
                        </thead>
                        <tbody>
                            <?php foreach ($debits as $txn) : ?>
                                <tr>
                                    <td style="color: red;">₹<?= number_format($txn['amount'],2) ?></td>
                                    <td><?= $txn['remarks'] ?></td>
                                    <td><?= date('d-m-Y h:i A', strtotime($txn['created_at'])) ?></td>
                                </tr>
                            <?php endforeach; ?>
                        </tbody>
                    </table>
                <?php else : ?>
                    <p class="text-muted">No debits found</p>
                <?php endif; ?>
            </div>
        </div>
    </div>
</div>
