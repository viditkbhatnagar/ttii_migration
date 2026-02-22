<!-- start page title -->
<style>
    .badge-success{
        background-color:green;
    }
    .badge-danger{
        background-color:red;
    }
    .badge-primary{
        background-color:blue;
    }
    .badge-warning{
        background-color:yellow;
    }
</style>
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
        
    <div class="col-lg-12">
        <div class="card">
            <div class="card-header">
                <div class="row">
                    <div class="col-8">
                        <h5 class="card-title mb-0"><?=$page_title ?? ''?></h5>
                    </div>
                </div>
            </div>
            <div class="card-body">
                <div class="row">
                    <form method="get" action="">
                        <div class="row g-3">

                                <div class="col-xxl-2 col-sm-4">
                                    <label for="student_status" class="form-label">Status</label>
                                    <select class="form-control select2" name="student_status" id="student_status">
                                        <option value="">Select Status</option>
                                        <option value="1" <?= (isset($_GET['student_status']) && $_GET['student_status'] === '1') ? 'selected' : '' ?>>Applied</option>
                                        <option value="0" <?= (isset($_GET['student_status']) && $_GET['student_status'] === '0') ? 'selected' : '' ?>>Dropout</option>
                                        <option value="0" <?= (isset($_GET['student_status']) && $_GET['student_status'] === '2') ? 'selected' : '' ?>>Enrolled</option>
                                        <option value="0" <?= (isset($_GET['student_status']) && $_GET['student_status'] === '3') ? 'selected' : '' ?>>Graduated</option>
                                    </select>
                                </div>
                                <div class="col-xxl-2 col-sm-4">
                                    <label for="university_id" class="form-label">University</label>
                                    <select class="form-control select2" name="university_id" id="university_id">
                                        <option value="">Select University</option>
                                       <?php foreach($universities as $key=>$universty)
                                                {
                                                    if(isset($_GET['university_id']) && $_GET['university_id'] == $key) {
                                                        echo "<option value='".$key."'>".$universty."</option>";
                                                    } else {
                                                       echo "<option value='".$key."'>".$universty."</option>"; 
                                                    }
                                                }
                                            ?>
                                    </select>
                                </div>
                                <div class="col-12 col-md-2 col-xxl-1 pt-md-1">
                                    <button type="submit" class="btn btn-primary w-100 mt-md-4 py-md-2">
                                        <i class="ri-equalizer-fill align-bottom"></i> Filters
                                    </button>
                                </div>
                                <div class="col-12 col-md-2 col-xxl-1 pt-md-1">
                                    <a href="<?= base_url('app/students/finance') ?>" class="btn btn-danger w-100 mt-md-4 py-md-2">
                                        <i class="ri-brush-fill align-bottom"></i> Clear
                                    </a>
                                </div>
                        </div>
                    </form>
                </div>
            </div>
        </div>
        <div class="row">
            <div class="col-12 col-md-6 col-lg-4 col-xl-3">
                <div class="card card-animate">
                    <div class="card-body">
                        <div class="d-flex justify-content-between">
                            <div>
                                <p class="fw-medium text-muted mb-0" style="font-size: 16px">TOTAL</p>
                                <h2 class="mt-4 ff-secondary fw-semibold"><span class="counter-value" data-target="<?=count($students) ?? 0?>">0</span></h2>
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
            <div class="col-12 col-md-6 col-lg-4 col-xl-3">
                
                <div class="card card-animate">
                    <div class="card-body">
                        <div class="d-flex justify-content-between">
                            <div>
                                <p class="fw-medium text-muted mb-0" style="font-size: 16px">Active</p>
                                <h2 class="mt-4 ff-secondary fw-semibold"><span class="counter-value" data-target="<?= $active_count ?? 0?>">0</span></h2>
                            </div>
                            <div>
                                <div class="avatar-sm flex-shrink-0">
                                    <span class="avatar-title bg-success-subtle rounded-circle fs-2">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feather feather-users text-success"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <div class="col-12 col-md-6 col-lg-4 col-xl-3">
                <div class="card card-animate">
                    <div class="card-body">
                        <div class="d-flex justify-content-between">
                            <div>
                                <p class="fw-medium text-muted mb-0" style="font-size: 16px">Dropouts</p>
                                <h2 class="mt-4 ff-secondary fw-semibold"><span class="counter-value" data-target="0">0</span></h2>
                            </div>
                            <div>
                                <div class="avatar-sm flex-shrink-0">
                                    <span class="avatar-title bg-danger-subtle rounded-circle fs-2">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feather feather-users text-danger"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        <div class="card">
            <div class="card-body">
                <div class="table-responsive">
                    <table id="" class="data_table_basic table table-bordered nowrap table-striped align-middle" style="width:100%">
                        <thead>
                            <tr>
                                <th style="width: 50px;">#</th>
                                <th>Name</th>
                                <th>Tuition Fee</th>
                                <th>Exam Fee</th>
                                <th>Miscellaneous Fee</th>
                                <th>Payment Status</th>
                                <th style="width: 120px;">Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            <?php if (isset($students)) {
                                foreach ($students as $key => $student) {
                                    $student_id = $student['id'];
                                    if ($student['payment_status'] == 'paid') {
                                        $status = '<span class="badge badge-success mb-2">Paid</span>';
                                    } else if($student['payment_status'] == 'due') {
                                        $status = '<span class="badge badge-warning mb-2 text-black">Due</span>';
                                    } else if($student['payment_status'] == 'overdue') {
                                        $status = '<span class="badge badge-danger mb-2">Overdue</span>';
                                    } else {
                                        $status = '<span class="badge badge-primary mb-2">Not added</span>';
                                    }
                                    ?>
                                    <tr>
                                        <td><?= $student['id'] ?></td>
                                        <td><?=$student['name']?></td>
                                        <td>
                                            <?= $student['tuitionFees'] ? "RS {$student['tuitionFees']}" : "-" ?>
                                        </td>
                                        <td>
                                            <?= $student['examFees'] ? "RS {$student['examFees']}" : "-" ?>
                                        </td>
                                        <td>
                                            <?= $student['miscFees'] ? "RS {$student['miscFees']}" : "-" ?>
                                        </td>

                                        <td><?=$status?></td>
                                        <td>
                                           <div class="dropdown d-inline-block">
                                                <button class="btn btn-soft-secondary btn-sm dropdown" type="button" data-bs-toggle="dropdown" aria-expanded="false">
                                                    <i class="ri-more-fill align-middle"></i>
                                                </button>
                                                <ul class="dropdown-menu dropdown-menu-end">
                                                    <li>
                                                        <?php if(empty($student['finance_id'])) { ?>
                                                            <a href="javascript::void()" class="dropdown-item edit-item-btn" onclick="show_ajax_modal('<?=base_url('app/students/finance_add/'.$student['id'])?>','Add finance')">
                                                                <i class="ri-pencil-fill align-bottom me-2 text-muted"></i> Add finance
                                                            </a>
                                                        <? } else { ?>
                                                            <a href="javascript::void()" class="dropdown-item edit-item-btn" onclick="show_ajax_modal('<?=base_url('app/students/finance_edit/'.$student['finance_id'])?>','Edit Student')">
                                                                <i class="ri-pencil-fill align-bottom me-2 text-muted"></i> Edit finance
                                                            </a>
                                                        <?php } ?>
                                                    </li>
                                                    <li>
                                                        <a href="javascript::void()" class="dropdown-item"  onclick="show_ajax_modal('<?=base_url('app/students/view/'.$student['id'])?>','View Student')">
                                                            <i class="ri-eye-fill align-bottom me-2 text-muted"></i> View
                                                        </a>
                                                    </li>
                                                    <li>
                                                        <a href="javascript::void()" class="dropdown-item remove-item-btn" onclick="delete_modal('<?=base_url('app/students/delete/'.$student['id'])?>')">
                                                            <i class="ri-delete-bin-fill align-bottom me-2 text-muted"></i> Delete
                                                        </a>
                                                    </li>
                                                </ul>
                                            </div>
                                        </td>
                                    </tr>
                                <?php }
                            } ?>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    </div>
</div><!--end row-->

<script>
     $(document).ready(function() {
        $('.select2').select2(); 
    });
</script>