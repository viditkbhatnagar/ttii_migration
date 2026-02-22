<!-- start page title -->
<div class="row">
    <div class="card-header">
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

    <div class="card shadow-lg border-0">
        <div class="card-body">
            <div class="row">
                <form method="get" action="">
                    <div class="row g-3">
                        

                        <div class="col-xxl-2 col-sm-4">
                                <label for="from_date" class="form-label">From Date</label>
                                <input type="date" name="from_date" value="<?= isset($_GET['from_date']) ? esc($_GET['from_date']) : '' ?>" class="form-control" placeholder="Select From Date">
                        </div>

                        <div class="col-xxl-2 col-sm-4">
                                <label for="from_date" class="form-label">To Date</label>
                                <input type="date" name="to_date" value="<?= isset($_GET['to_date']) ? esc($_GET['to_date']) : '' ?>" class="form-control" placeholder="Select To Date">
                        </div>

                        <!-- <div class="col-xxl-2 col-sm-4">
                            <label for="centre_id" class="form-label">Centre ID</label>
                            <input type="text" class="form-control" name="centre_id" placeholder="Centre ID">
                        </div> -->
                        <!-- <div class="col-xxl-2 col-sm-4">
                            <label for="centre_name" class="form-label">Centre Name</label>
                            <input type="text" class="form-control" name="centre_name" placeholder="Centre Name">
                        </div>
                        <div class="col-xxl-2 col-sm-4">
                            <label for="contact_name" class="form-label">Contact Name</label>
                            <input type="text" class="form-control" name="contact_name" placeholder="Contact Name">
                        </div>
                        <div class="col-xxl-2 col-sm-4">
                            <label for="contact_phone" class="form-label">Contact Phone</label>
                            <input type="text" class="form-control" name="contact_phone" placeholder="Contact Phone">
                        </div> -->

                        <div class="col-xxl-2 col-sm-4">
                            <label for="stud_status" class="form-label">Status</label>
                            <select class="form-control select2" name="status" id="stud_status">
                                <option value="">Select Status</option>
                                <option value="approved" <?= (isset($_GET['status']) && $_GET['status'] === 'approved') ? 'selected' : '' ?>>Approved </option>
                                <option value="pending" <?= (isset($_GET['status']) && $_GET['status'] === 'pending') ? 'selected' : '' ?>>Pending</option>
                                <option value="rejected" <?= (isset($_GET['status']) && $_GET['status'] === 'rejected') ? 'selected' : '' ?>>Rejected</option>
                            </select>
                        </div>
                        
                        <div class="col-12 col-md-2 col-xxl-1 pt-md-1">
                            <button type="submit" class="btn btn-primary w-100 mt-md-4 py-md-2">
                                <i class="ri-equalizer-fill align-bottom"></i> Filters
                            </button>
                        </div>
                        <div class="col-12 col-md-2 col-xxl-1 pt-md-1">
                            <a href="<?= base_url('admin/centres/centre_payments') ?>" class="btn btn-danger w-100 mt-md-4 py-md-2">
                                <i class="ri-brush-fill align-bottom"></i> Clear
                            </a>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    </div>
</div>
<div class="row">
    <div class="card shadow-lg border-0">
        <div class="card-body">

            <ul class="nav nav-tabs mb-3" role="tablist">
                <li class="nav-item">
                    <button class="nav-link active" data-bs-toggle="tab" data-bs-target="#fundRequests">
                        Fund Requests
                    </button>
                </li>
                <li class="nav-item">
                    <button class="nav-link" data-bs-toggle="tab" data-bs-target="#walletTxns">
                        Wallet Transactions
                    </button>
                </li>
            </ul>

            <div class="tab-content">

                <!-- ================= FUND REQUESTS TAB ================= -->
                <div class="tab-pane fade show active" id="fundRequests">

                    <table class="table table-striped table-bordered data_table_basic">
                        <thead class="table-dark">
                            <tr>
                                <th>#</th>
                                <th>Centre</th>
                                <th>Amount</th>
                                <th>Date</th>
                                <th>Transaction No</th>
                                <th>Status</th>
                                <th>Attachment</th>
                            </tr>
                        </thead>

                        <tbody>
                            <?php foreach($fund_requests as $i => $row): ?>
                            <tr>
                                <td><?= $i+1 ?></td>
                                <td>
                                    <strong><?= $row['centre_name'] ?></strong><br>
                                    <small>ID: <?= $row['centre_id'] ?></small><br>
                                    <a class="btn btn-sm btn-info text-white" href="<?= base_url('admin/centres/fund_requests/'.$row['centre_db_id']) ?>">View Individual Centre</a>
                                </td>

                                <td class="text-primary fw-bold">₹<?= number_format($row['amount'],2) ?></td>

                                <td><?= date('d-m-Y', strtotime($row['date'])) ?></td>

                                <td><?= $row['transaction_receipt'] ?></td>

                                <td>
                                    <?php if($row['status']=="approved"): ?>
                                        <span class="badge bg-success">Approved</span>
                                    <?php elseif($row['status']=="rejected"): ?>
                                        <span class="badge bg-danger">Rejected</span>
                                    <?php else: ?>
                                        <span class="badge bg-warning text-dark">Pending</span>
                                    <?php endif; ?>
                                </td>

                                <td>
                                    <?php if($row['attachment_file']): ?>
                                    <a href="<?= base_url(get_file($row['attachment_file'])) ?>" target="_blank">
                                        <i class="ri-download-2-line"></i> Download
                                    </a>
                                    <?php endif; ?>
                                </td>
                            </tr>
                            <?php endforeach; ?>
                        </tbody>

                    </table>

                </div>

                <!-- ================= WALLET TRANSACTIONS TAB ================= -->
                <div class="tab-pane fade" id="walletTxns">

                    <table class="table table-bordered table-striped data_table_basic">
                        <thead class="table-dark">
                            <tr>
                                <th style="width: 5px">#</th>
                                <th>Centre</th>
                                <th>Type</th>
                                <th>Amount</th>
                                <th>Remarks</th>
                                <th>Date</th>
                            </tr>
                        </thead>

                        <tbody>
                            <?php foreach($wallet_transactions as $k => $txn): ?>
                            <tr>
                                <td><?= $k+1 ?></td>

                                <td>
                                    <strong><?= $txn['centre_name'] ?></strong>
                                    <br>
                                    <small>ID: <?= $txn['centre_id'] ?></small><br>
                                    <a class="btn btn-sm btn-info text-white" href="<?= base_url('admin/centres/wallet_transactions/'.$txn['centre_db_id']) ?>">View Individual Centre</a>
                                </td>

                                <td>
                                    <?php if($txn['transaction_type']=="credit"): ?>
                                        <span class="badge bg-success">Credit</span>
                                    <?php else: ?>
                                        <span class="badge bg-danger">Debit</span>
                                    <?php endif; ?>
                                </td>

                                <td class="<?= $txn['transaction_type']=='credit' ? 'text-success':'text-danger' ?> fw-bold">
                                    ₹<?= number_format($txn['amount'],2) ?>
                                </td>

                                <td><?= $txn['remarks'] ?></td>

                                <td><?= date('d-m-Y h:i A', strtotime($txn['created_at'])) ?></td>
                            </tr>
                            <?php endforeach; ?>
                        </tbody>

                    </table>

                </div>
            </div>

        </div>
    </div>
</div>


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
$(document).on('change', '.fund-status', function () {
    let status = $(this).val();
    let id = $(this).data('id');

    if(!status || !id) return;

    $.ajax({
        url: "<?= base_url('admin/centres/change_fund_status/') ?>" + id,
        type: "POST",
        data: { status: status },
        dataType: "json",
        success: function(res){
            if(res.status === true){
                location.reload();
                
            } else {
                alert(res.message || 'Update failed');
            }
        },
        error: function(xhr){
            alert("Status update failed!");
            console.log(xhr.responseText);
        }
    });
});

</script>

           
           
           
           
           
           
           
           
           
           
           
           
           
           
           
           
           
           
           
           
           
           
           
           
           
           
           
           
           
           
           
           
           
           
           
           
           
           
           
           
           
           
           
           
           
           
           
           
           
           