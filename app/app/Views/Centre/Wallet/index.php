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
                    <li class="breadcrumb-item"><a href="<?= base_url('centres/wallet/index') ?>">Wallet</a></li>
                    <li class="breadcrumb-item active"><?= $page_title ?? '' ?></li>
                </ol>
            </div>
        </div>
    </div>
</div>


<div class="row">
    <div class="col-md-12">
        <div class="card text-white border-0 shadow-lg"
             style="background: linear-gradient(135deg, #0f1a2c, #18283f); border-radius:16px;">
            
            <div class="card-body p-4">

                <!-- Header -->
                <div class="d-flex justify-content-between align-items-start flex-wrap gap-3">

                    <div>
                        <p class="text-muted mb-1 small">Current Balance</p>
                        <h2 class="fw-bold text-white">₹ <?= $list_items['wallet_balance'] ?></h2>
                        <p class="text-muted small mb-0">Center ID: <?= $list_items['centre_id'] ?></p>
                    </div>

                    <div class="d-flex gap-2 flex-wrap">
                        <button class="btn btn-light px-3 fw-medium" onclick="show_ajax_modal('<?=base_url('centre/Wallet/ajax_add_fund/')?>', 'Request Fund')">
                            + Add Funds
                        </button>
                        <!-- Download links -->
                        <a href="<?= base_url('centre/wallet/download_statement/'. $list_items['id'] . '?format=csv') ?>" class="btn btn-outline-light px-3" target="_blank">
                            <i class="bi bi-file-earmark-spreadsheet"></i> Download CSV Statement
                        </a>

                        <!-- <a href="<?= base_url('centre/wallet/download_statement/'. $list_items['id'] . '?format=pdf') ?>"
                            class="btn btn-outline-light px-3" target="_blank">
                            <i class="bi bi-file-earmark-pdf"></i> Download PDF
                        </a> -->

                    </div>

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


<ul class="nav nav-tabs mb-4" id="walletTabs" role="tablist">
    <li class="nav-item" role="presentation">
        <button class="nav-link active fw-semibold"
                id="transactions-tab"
                data-bs-toggle="tab"
                data-bs-target="#transactions"
                type="button"
                role="tab">
            <i class="bi bi-list"></i> Transaction History
        </button>
    </li>

    <li class="nav-item" role="presentation">
        <button class="nav-link fw-semibold"
                id="funds-tab"
                data-bs-toggle="tab"
                data-bs-target="#funds"
                type="button"
                role="tab">
            <i class="bi bi-cash"></i> Fund Requisitions
        </button>
    </li>
</ul>

<div class="tab-content">

    <!-- ================== TRANSACTIONS TAB ================== -->
    <div class="tab-pane fade show active" id="transactions" role="tabpanel">

        <div class="row">
        <div class="col-12">

            <div class="card shadow-sm border-0">
                <div class="card-body p-4">

                    <div class="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-2">
                        <h5 class="fw-bold mb-0">
                            <i class="bi bi-list"></i> Transaction History
                        </h5>

                        <div class="btn-group">
                            <button class="btn btn-sm btn-outline-primary active" onclick="filterTxn('all')">All</button>
                            <button class="btn btn-sm btn-outline-success" onclick="filterTxn('credit')">Credits</button>
                            <button class="btn btn-sm btn-outline-danger" onclick="filterTxn('debit')">Debits</button>
                        </div>
                    </div>

                    <div class="row fw-semibold text-muted px-2 border-bottom pb-2 mb-3">
                        <div class="col-md-2">Date</div>
                        <div class="col-md-3">Transaction ID</div>
                        <div class="col-md-5">Description</div>
                        <div class="col-md-2 text-end">Amount</div>
                    </div>

                    <?php
                        $all_txns = [];

                        foreach ($credits as $c) {
                            $c['type'] = 'credit';
                            $all_txns[] = $c;
                        }

                        foreach ($debits as $d) {
                            $d['type'] = 'debit';
                            $all_txns[] = $d;
                        }

                        usort($all_txns, function($a, $b) {
                            return strtotime($b['created_at']) - strtotime($a['created_at']);
                        });
                    ?>

                    <?php if (!empty($all_txns)) : ?>
                        <?php foreach($all_txns as $txn): ?>

                        <?php
                            $isCredit = $txn['type'] === 'credit';
                            $amtColor = $isCredit ? 'text-success' : 'text-danger';
                            $sign     = $isCredit ? '+' : '-';
                        ?>

                        <div class="row align-items-center py-3 border-bottom transaction-row
                            " data-type="<?= $txn['type']; ?>">

                            <div class="col-md-2 small text-muted">
                                <?= date('d M Y', strtotime($txn['created_at'])) ?>
                            </div>

                            <div class="col-md-3 fw-medium small text-primary">
                                TXN-<?= $txn['id']; ?>
                            </div>

                            <div class="col-md-5 fw-medium">
                                <?= $txn['remarks']; ?>
                            </div>

                            <div class="col-md-2 text-end fw-bold <?= $amtColor ?>">
                                <?= $sign ?> ₹<?= number_format($txn['amount'],2) ?>
                            </div>
                        </div>

                        <?php endforeach; ?>

                    <?php else: ?>
                        <div class="text-muted text-center py-5">
                            <i class="bi bi-wallet2 fs-3"></i>
                            <p class="mt-2 mb-0">No transactions found</p>
                        </div>
                    <?php endif; ?>

                </div>
            </div>

        </div>
        </div>

    </div>


    <!-- ================== FUND REQUESTS TAB ================== -->
    <div class="tab-pane fade" id="funds" role="tabpanel">

        <div class="row">
        <div class="col-12">

            <div class="card shadow-sm border-0">
                <div class="card-body p-4">

                    <h5 class="fw-bold mb-4">
                        <i class="bi bi-cash-stack"></i> Fund Requisitions
                    </h5>

                    <div class="row fw-semibold text-muted px-2 border-bottom pb-2 mb-3">
                        <div class="col-md-2">Transaction Date</div>
                        <div class="col-md-4">Additional Details</div>
                        <div class="col-md-2">Status</div>
                        <div class="col-md-2">Attachment</div>
                        <div class="col-md-2 text-end">Amount</div>
                    </div>

                    <?php if (!empty($fund_requests)) : ?>

                        <?php foreach($fund_requests as $row): ?>

                        <?php
                            if ($row['status'] == 'approved') {
                                $statusBadge = '<span class="badge bg-success">Approved</span>';
                            } elseif ($row['status'] == 'pending') {
                                $statusBadge = '<span class="badge bg-warning text-dark">Pending</span>';
                            } else {
                                $statusBadge = '<span class="badge bg-danger">Rejected</span>';
                            }
                        ?>

                        <div class="row align-items-center py-3 border-bottom">

                            <div class="col-md-2 small text-muted">
                                <?= !empty($row['date']) 
                                    ? date('d M Y', strtotime($row['date'])) 
                                    :'' ?>
                            </div>

                            <div class="col-md-4 fw-medium">
                                <?= $row['description']; ?>
                            </div>

                            <div class="col-md-2">
                                <?= $statusBadge ?>
                            </div>

                            <div class="col-md-2">
                                <?php if (!empty($row['attachment_file'])): ?>
                                    <a class="text-primary" href="<?= base_url(get_file($row['attachment_file'])) ?>" target="_blank">
                                        <i class="bi bi-paperclip"></i> View
                                    </a>
                                <?php else: ?>
                                    -
                                <?php endif; ?>
                            </div>

                            <div class="col-md-2 text-end fw-bold text-primary">
                                ₹<?= number_format($row['amount'],2) ?>
                            </div>

                        </div>

                        <?php endforeach; ?>

                    <?php else: ?>

                        <div class="text-center text-muted py-5">
                            <i class="bi bi-inbox fs-3"></i>
                            <p class="mt-2 mb-0">No fund requests found</p>
                        </div>

                    <?php endif; ?>

                </div>
            </div>

        </div>
        </div>

    </div>

</div>





<script>
function filterTxn(type) {
    let rows = document.querySelectorAll('.transaction-row');

    rows.forEach(row => {
        if (type === 'all') {
            row.style.display = 'flex';
        } else {
            row.style.display = row.dataset.type === type ? 'flex' : 'none';
        }
    });

    // active button
    document.querySelectorAll('.btn-group .btn').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');
}
</script>

