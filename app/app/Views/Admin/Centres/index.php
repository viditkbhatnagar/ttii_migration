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
                    <?php if (has_permission('centres/add')) { ?>
                        <div class="col-4">
                            <a href="<?= base_url('admin/centres/add/') ?>" class="btn btn-md btn-primary float-end">
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
                                <label for="centre_id" class="form-label">Centre ID</label>
                               <input type="text" class="form-control" name="centre_id" placeholder="Centre ID">
                            </div>
                            <div class="col-xxl-2 col-sm-4">
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
                                <a href="<?= base_url('admin/centres/index') ?>" class="btn btn-danger w-100 mt-md-4 py-md-2">
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
                        <!-- <th>Centre ID</th> -->
                        <th>Centre Name</th>
                        <th>Contact Person</th>
                        <th>Contact No</th>
                        <th>Wallet Balance</th>
                        <th>Total Students</th>
                        <th>Fund Requests</th>

                        <th style="width: 120px;">Action</th>
                    </tr>
                </thead>
                <tbody>
                    <?php 
                    if (isset($list_items)) 
                    {
                        foreach ($list_items as $key => $list_item) { ?>
                            
                            <tr>
                            <td><b><?= ++$key ?></b></td>  
                            <!-- <td class="id"><a href="#" class="fw-medium link-primary">#<?=$list_item['centre_id']?></a></td> -->
                            <td class="centre"><?=$list_item['centre_name']?></td>
                            <td class="person"><?=$list_item['contact_person']?></td>
                            <td class="contact"><?=$list_item['country_code']?> <?=$list_item['phone']?></td>
                            <td class="">₹ <?=$list_item['wallet_balance']?></td>
                            <td class="person"><?=$list_item['students_count']?></td>
                            <td class=""><a href="<?= base_url('admin/centres/fund_requests/'.$list_item['id']) ?>" class="fw-medium link-primary">List Fund Requests</a></td>
                            <td class="action">
                                <ul class="list-inline hstack gap-2 mb-0">
                                    <li class="list-inline-item" data-bs-toggle="tooltip" data-bs-trigger="hover" data-bs-placement="top" title="Wallet Transactions">
                                        <a href="<?= base_url('admin/centres/wallet_transactions/'.$list_item['id']) ?>" class="link-primary fs-15"><i class="ri-wallet-3-fill"></i></a>
                                    </li>
                                    <li class="list-inline-item" data-bs-toggle="tooltip" data-bs-trigger="hover" data-bs-placement="top" title="View">
                                        <a href="<?=base_url('admin/centres/view/'.$list_item['id'])?>" class="link-primary fs-15"><i class="ri-eye-fill"></i></a>
                                    </li>
                                    <li class="list-inline-item edit" data-bs-toggle="tooltip" data-bs-trigger="hover" data-bs-placement="top" title="Edit">
                                        <a href="<?=base_url('admin/centres/edit/'.$list_item['id'])?>" class="link-success fs-15"><i class="ri-edit-2-line"></i></a>
                                    </li>
                                    <li class="list-inline-item" data-bs-toggle="tooltip" data-bs-trigger="hover" data-bs-placement="top" title="Remove">
                                        <a href="javascript::void()"  onclick="delete_modal('<?= base_url('admin/centres/delete/' . $list_item['id']) ?>')" class="link-danger fs-15"><i class="ri-delete-bin-line"></i></a>
                                    </li>
                                </ul>
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
    
    .data_table_basic tbody tr:hover{
	    box-shadow: 0px 0px 10px rgba(0,0,0,0.1);
    }
</style>

<script>
    $(document).ready(function() {
        $('.select2').select2();
    });
</script>
           
           
           
           
           
           
           
           
           
           
           
           
           
           
           
           
           
           
           
           
           
           
           
           
           
           
           
           
           
           
           
           
           
           
           
           
           
           
           
           
           
           
           
           
           
           
           
           
           
           