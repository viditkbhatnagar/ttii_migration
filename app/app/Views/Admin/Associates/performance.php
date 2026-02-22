<!-- start page title -->
<div class="row">
    <div class="col-12">
        <div class="page-title-box d-sm-flex align-items-center justify-content-between">
            <h4 class="mb-sm-0"><?=$page_title ?? ''?></h4>

            <div class="page-title-right">
                <ol class="breadcrumb m-0">
                    <li class="breadcrumb-item"><a href="<?=base_url('app/dashboard/index')?>">Dashboard</a></li>
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
                        <p class="fw-medium text-muted mb-0" style="font-size: 16px">ACTIVE CONSULTANTS</p>
                        <h2 class="mt-4 ff-secondary fw-semibold"><span class="counter-value" data-target="<?= count($list_items) ?>">0</span></h2>
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
                </div>
            </div>
            <div class="card-header">
                <form method="get" action="">
                    <div class="row g-3">
                        <div class="col-xxl-6 col-sm-4">
                            <div class="input-light">
                                <input class="form-control" name="search_key" value="<?= (isset($_GET['search_key'])) ? $_GET['search_key'] : '' ?>" placeholder="Search by consultant name, phone number, email.">
                            </div>
                        </div>
                        <div class="col-xxl-2 col-sm-4">
                            <!--<label for="status" class="form-label">Status</label>-->
                            <select class="form-control select2" name="university" id="university">
                                <option value="">Select University</option>
                                <?php
                                    foreach($universities as $key => $university){
                                ?>
                                     <option value="<?= $key ?>"><?= $university ?></option>   
                                <?php } ?>
                            </select>
                        </div>
                        <div class="col-xxl-3 col-sm-4">
                            <div class="d-flex">
                                <button type="submit" class="btn btn-primary w-100 py-2 me-2">
                                    <i class="ri-plus-fill align-bottom"></i> Filter
                                </button>
                                <a href="<?= base_url('app/consultant/index') ?>" class="btn btn-danger w-100 py-2">
                                    <i class="ri-brush-fill align-bottom"></i> Clear
                                </a>
                            </div>
                        </div>
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
                        <th>Admissions Count</th>
                        <th>Total Revenue</th>
                        <th style="width: 120px;">Action</th>
                    </tr>
                    </thead>
                    <tbody>
                    <?php
                        if (isset($list_items)){
                            foreach ($list_items as $key => $list_item){
                                $consultant_id = $list_item['id'];
                                ?>
                                <tr>
                                    <td><?=$key + 1?></td>
                                    <td><?=$list_item['name'] ?? ''?></td>
                                    <td><?=$list_item['total_students'] ?? ''?></td>
                                    <td>
                                        <svg xmlns="http://www.w3.org/2000/svg" fill="#000000" width="15px" height="15px" viewBox="-96 0 512 512"><path d="M308 96c6.627 0 12-5.373 12-12V44c0-6.627-5.373-12-12-12H12C5.373 32 0 37.373 0 44v44.748c0 6.627 5.373 12 12 12h85.28c27.308 0 48.261 9.958 60.97 27.252H12c-6.627 0-12 5.373-12 12v40c0 6.627 5.373 12 12 12h158.757c-6.217 36.086-32.961 58.632-74.757 58.632H12c-6.627 0-12 5.373-12 12v53.012c0 3.349 1.4 6.546 3.861 8.818l165.052 152.356a12.001 12.001 0 0 0 8.139 3.182h82.562c10.924 0 16.166-13.408 8.139-20.818L116.871 319.906c76.499-2.34 131.144-53.395 138.318-127.906H308c6.627 0 12-5.373 12-12v-40c0-6.627-5.373-12-12-12h-58.69c-3.486-11.541-8.28-22.246-14.252-32H308z"/></svg>
                                        <?=$list_item['total_fee_students'] ?? ''?>
                                    </td>
                                    <td>
                                         <a href="javascript:void(0)" class="btn btn-sm btn-success" onclick="show_ajax_modal('<?=base_url('app/consultant/view_performance/'.$list_item['id'])?>','View Consultant')">
                                                <i class="ri-eye-fill"></i> View
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


