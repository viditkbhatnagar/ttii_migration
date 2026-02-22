<!-- start page title -->
<div class="row">
    <div class="col-12">
        <div class="page-title-box d-sm-flex align-items-center justify-content-between">
            <h4 class="mb-sm-0"><?=$page_title ?? ''?></h4>

            <div class="page-title-right">
                <ol class="breadcrumb m-0">
                    <li class="breadcrumb-item"><a href="<?=base_url('admin/dashboard/index')?>">Dashboard</a></li>
                    <li class="breadcrumb-item active"><?=$page_title ?? ''?></li>
                </ol>
            </div>

        </div>
    </div>
</div>
<div class="row">
    <div class="col-3">
        <div class="card card-animate">
            <div class="card-body">
                <div class="d-flex justify-content-between">
                    <div>
                        <p class="fw-medium text-muted mb-0" style="font-size: 16px">ACTIVE ASSOCIATES</p>
                        <h2 class="mt-4 ff-secondary fw-semibold"><span class="counter-value" data-target="<?=$active_associates ?? 0 ?>"></span></h2>
                    </div>
                    <div>
                        <div class="avatar-sm flex-shrink-0">
                            <span class="avatar-title bg-info-subtle rounded-circle fs-2">
                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feather feather-users text-info"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
                            </span>
                        </div>
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
                        <h5 class="card-title mb-0"><?=$page_title ?? ''?></h5>
                    </div>
                    <div class="col-4">
                        <button class="btn btn-md btn-primary float-end"
                                onclick="show_ajax_modal('<?=base_url('admin/associates/ajax_add/')?>', 'Add associate')">
                            <i class="mdi mdi-plus"></i>
                            Create <?=$page_title ?? ''?>
                        </button>
                    </div>
                </div>
            </div>
            <div class="card-header">
                <form method="get" action="">
                    <div class="row g-3">
                        <div class="col-xxl-6 col-sm-4">
                            <div class="input-light">
                                <input class="form-control" name="search_key" value="<?=$_GET ? $_GET['search_key'] : ''?>" placeholder="Search by associate name, phone number, email.">
                            </div>
                        </div>
                        <div class="col-xxl-2 col-sm-4">
                            <!--<label for="status" class="form-label">Status</label>-->
                            <select class="form-control select2" name="status" id="status">
                                <option value="">Select Status</option>
                                <option value="1" <?= (isset($_GET['status']) && $_GET['status'] === '1') ? 'selected' : '' ?>>Active</option>
                                <option value="0" <?= (isset($_GET['status']) && $_GET['status'] === '0') ? 'selected' : '' ?>>Inactive</option>
                            </select>
                        </div>
                        <div class="col-xxl-3 col-sm-4">
                            <div class="d-flex">
                                <button type="submit" class="btn btn-primary w-100 py-2 me-2">
                                    <i class="ri-plus-fill align-bottom"></i> Filter
                                </button>
                                <a href="<?= base_url('admin/associates/index') ?>" class="btn btn-danger w-100 py-2">
                                    <i class="ri-brush-fill align-bottom"></i> Clear
                                </a>
                            </div>
                        </div>
                        <!--end col-->
                        <!--end col-->
                    </div>
                </form>
            </div>
            <div class="card-body">
                <div class="table-responsive">
                <table id="" class="data_table_basic table table-bordered nowrap table-striped align-middle" style="width:100%">
                    <thead>
                    <tr>
                        <th style="width: 50px;">#</th>
                        <th>Name</th>
                        <th>Phone</th>
                        <th>Email</th>
                        <!--<th>Assigned Universities</th>-->
                        <th>Active Status</th>
                        <th style="width: 120px;">Action</th>
                    </tr>
                    </thead>
                    <tbody>
                    <?php
                        if (isset($list_items)){
                            foreach ($list_items as $key => $list_item){
                                $associate_id = $list_item['id'];
                                    if ($list_item['drop_out_status'] == 0) {
                                        $status = '<span class="badge badge1-danger mb-2">Dropped Out on '. date('d-M-Y h:i A', strtotime($list_item['drop_out_at'])) .'</span>';
                                    } else {
                                        $status = '<span class="badge badge1-success mb-2">Active</span>';
                                    }
                                ?>
                                <tr>
                                    <td><?=$key + 1?></td>
                                    <td><?=$list_item['name'] ?? ''?></td>
                                    <td><?='+'.$list_item['country_code'].' '.$list_item['phone']?></td>
                                    <td><?=$list_item['user_email'] ?? ''?></td>
                                    <td><?= $status ?></td>
                                    <td>
                                        <div class="dropdown d-inline-block">
                                            <button class="btn btn-soft-secondary btn-sm dropdown" type="button" data-bs-toggle="dropdown" aria-expanded="false">
                                                <i class="ri-more-fill align-middle"></i>
                                            </button>
                                            <ul class="dropdown-menu dropdown-menu-end">
                                                <li>
                                                    <a href="javascript:void(0)" class="dropdown-item" onclick="show_ajax_modal('<?=base_url('admin/associates/view/'.$list_item['id'])?>','View associate')">
                                                        <i class="ri-eye-fill align-bottom me-2 text-muted"></i> View
                                                    </a>
                                                </li>
                                                <li>
                                                    <a href="javascript:void(0)" class="dropdown-item edit-item-btn" onclick="show_ajax_modal('<?=base_url('admin/associates/ajax_edit/'.$list_item['id'])?>', 'Update associate Details')">
                                                        <i class="ri-pencil-fill align-bottom me-2 text-muted"></i> Edit
                                                    </a>
                                                </li>
                                                <li>
                                                    <a href="javascript:void(0)" class="dropdown-item remove-item-btn" onclick="delete_modal('<?=base_url('admin/associates/delete/'.$list_item['id'])?>')">
                                                        <i class="ri-delete-bin-fill align-bottom me-2 text-muted"></i> Delete
                                                    </a>
                                                </li>
                                                <li>
                                                    <a href="javascript:void(0)" class="dropdown-item" onclick="show_small_modal('<?=base_url('admin/associates/edit_password/'.$list_item['id'])?>','Edit Email and Password')">
                                                        <i class="ri-pencil-fill align-bottom me-2 text-muted"></i> Change Username/Password
                                                    </a>
                                                </li>
                                                <li>
                                                    <a href="<?= $list_item['drop_out_status'] == 0 ? base_url('admin/associates/active_status/'.$list_item['id']) : base_url('admin/associates/inactive_status/'.$list_item['id']) ?>" class="dropdown-item <?= $list_item['drop_out_status'] == 0 ? 'text-success' : 'text-danger'; ?>">
                                                        <i class="ri-toggle-fill align-bottom me-2 text-muted"></i> 
                                                        <?= $list_item['drop_out_status'] == 0 ? 'Make active' : 'Make inactive' ?>
                                                    </a>
                                                </li>
                                            </ul>
                                        </div>

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
        </div>
    </div>
</div><!--end row-->

<style>
    .badge1-success {
        background-color: #28a745; /* Green background */
        color: white; /* White text */
        padding: 0.25em 0.4em; /* Padding around the badge */
        font-size: 75%; /* Slightly smaller font size */
        font-weight: 700; /* Bold text */
        border-radius: 0.2rem; /* Rounded corners */
        text-align: center; /* Center the text */
        display: inline-block; /* Ensure the badge is inline */
        white-space: nowrap; /* Prevent text from wrapping */
        vertical-align: baseline; /* Align with baseline of text */
    }
    
    .badge1-danger {
        background-color: #dc3545; /* Red background */
        color: white; /* White text */
        padding: 0.25em 0.4em; /* Padding around the badge */
        font-size: 75%; /* Slightly smaller font size */
        font-weight: 700; /* Bold text */
        border-radius: 0.2rem; /* Rounded corners */
        text-align: center; /* Center the text */
        display: inline-block; /* Ensure the badge is inline */
        white-space: nowrap; /* Prevent text from wrapping */
        vertical-align: baseline; /* Align with baseline of text */
    }
</style>

<script>
     $(document).ready(function() {
        $('.select2').select2(); 
    });
</script>


