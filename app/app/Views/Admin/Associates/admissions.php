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
                                        <option value="2" <?= (isset($_GET['student_status']) && $_GET['student_status'] === '2') ? 'selected' : '' ?>>Enrolled</option>
                                        <option value="3" <?= (isset($_GET['student_status']) && $_GET['student_status'] === '3') ? 'selected' : '' ?>>Graduated</option>
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
                                    <a href="<?= base_url('app/consultant/admissions') ?>" class="btn btn-danger w-100 mt-md-4 py-md-2">
                                        <i class="ri-brush-fill align-bottom"></i> Clear
                                    </a>
                                </div>
                        </div>
                    </form>
                </div>
            </div>
        </div>
        
    <div class="col-3">
        <div class="card card-animate">
            <div class="card-body">
                <div class="d-flex justify-content-between">
                    <div>
                        <p class="fw-medium text-muted mb-0" style="font-size: 16px">TOTAL ADMISSIONS</p>
                        <h2 class="mt-4 ff-secondary fw-semibold"><span class="counter-value" data-target="<?= count($list_items) ?>">0</span></h2>
                    </div>
                    <div>
                        <div class="avatar-sm flex-shrink-0">
                            <span class="avatar-title bg-warning-subtle rounded-circle fs-2">
                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feather feather-users text-warning"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
    <div class="col-3">
        <div class="card card-animate">
            <div class="card-body">
                <div class="d-flex justify-content-between">
                    <div>
                        <p class="fw-medium text-muted mb-0" style="font-size: 16px">TOTAL REVENUE</p>
                        <h2 class="mt-4 ff-secondary fw-semibold">Rs <span class="counter-value" data-target="<?= $total_fee ?>">0</span></h2>
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
</div>

<div class="row">
    <div class="col-lg-12">
        <div class="card">
             
            <div class="card-body">
                <div class="table-responsive">
                <table id="" class="data_table_basic table table-bordered nowrap table-striped align-middle" style="width:100%">
                    <thead>
                    <tr>
                        <th style="width: 50px;">#</th>
                        <th>Student Name</th>
                        <th>Consultants</th>
                       <th>University</th>
                       <th>Status</th>
                       <th style="width: 120px;">Action</th>
                    </tr>
                    </thead>
                    <tbody>
                    <?php
                        if (isset($list_items)){
                            
                            foreach ($list_items as $key => $list_item){
                                
                                 if ($list_item['student_status'] == 0) {
                                    $status = '<span class="badge badge1-danger   mb-2">Dropped</span>';
                                } else if($list_item['student_status'] == 2) {
                                    $status = '<span class="badge badge1-success   mb-2">Graduated</span>';
                                } else if($list_item['student_status'] == 3) {
                                    $status = '<span class="badge badge1-warning   mb-2">Enrolled</span>';
                                } else {
                                    $status = '<span class="badge badge1-info   mb-2">Applied</span>';
                                }
                                
                                ?>
                                <tr>
                                    <td><?=$key + 1?></td>
                                    <td><?=$list_item['name'] ?? ''?></td>
                                    <td>
                                       <?php foreach($consultants as $key=>$consultant){
                                           if($key == $list_item['consultant_id']){
                                               echo $consultant;
                                           }
                                       }
                                       ?>
                                   </td>
                                   <td>
                                       <?php foreach($universities as $key=>$university){
                                           if($key == $list_item['university_id']){
                                               echo $university;
                                           }
                                       }
                                       ?>
                                   </td>
                                   <td><?= $status ?></td>
                                    <td>
                                        <a href="javascript:void(0)" 
                                           class="btn btn-sm btn-success" 
                                           onclick="show_ajax_modal('<?= base_url('app/consultant/view_admission/' . $list_item['id']) ?>', 'View Student')">
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
.badge{
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
.badge1-success {
    background-color: #28a745;
}

.badge1-danger {
    background-color: #dc3545; /* Red background */
}

.badge1-warning {
    background-color: #ffff00; /* Yellow background */
}

.badge1-info {
    background-color: #0080ff; /* Blue background */
}
</style>
