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
    <div class="col-lg-12">
        <div class="card">
            <div class="card-header">
                <div class="row">
                    <div class="col-8">
                        <h5 class="card-title mb-0"><?=$page_title ?? ''?></h5>
                    </div>
                    <div class="col-4 d-none">
                        <a class="btn btn-md btn-primary float-end" href="<?=base_url('admin/cohorts/cohort_add/')?>">
                            <i class="mdi mdi-plus"></i>
                            Add <?=$page_title ?? ''?>
                        </a>
                    </div>
                </div>
                <div class="card-body">
                <div class="row">
                    <form method="get" action="">
                        <div class="row g-3">

                            <div class="col-xxl-2 col-sm-4">
                                <label for="stud_course" class="form-label">Cohort Date</label>
                                <input type="month" name="cohort_date" value="<?= isset($_GET['cohort_date']) ? esc($_GET['cohort_date']) : '' ?>" class="form-control" placeholder="Select Cohort Month">
                            </div>

                             <div class="col-xxl-2 col-sm-4">
                                <label for="stud_course" class="form-label">Course</label>
                                <select class="form-control select2" name="course" id="cohort_course">
                                    <option value="">Select Course</option>
                                    <?php if (isset($course)) {
                                        foreach ($course as $course) { ?>
                                            <option value="<?= $course['id'] ?>" <?= (isset($_GET['course']) && $_GET['course'] === $course['id']) ? 'selected' : '' ?>><?= $course['title'] ?></option>
                                        <?php }
                                    }
                                    ?>
                                </select>
                            </div>

                            <div class="col-xxl-2 col-sm-4">
                                <label for="stud_course" class="form-label">Subject</label>
                                <select class="form-control select2" name="subject" id="cohort_subject">
                                    <option value="">Select subject</option>
                                    <?php if (isset($subject)) {
                                        foreach ($subject as $subject) { ?>
                                            <option value="<?= $subject['id'] ?>" <?= (isset($_GET['subject']) && $_GET['subject'] === $subject['id']) ? 'selected' : '' ?>><?= $subject['title'] ?></option>
                                        <?php }
                                    }
                                    ?>
                                </select>
                            </div>

                            <div class="col-xxl-2 col-sm-4">
                                <label for="cohort_language" class="form-label">Language</label>
                                <select class="form-control select2" name="language" id="cohort_language">
                                    <option value="">Select language</option>
                                    <?php if (isset($language)) {
                                        foreach ($language as $language) { ?>
                                            <option value="<?= $language['id'] ?>" <?= (isset($_GET['language']) && $_GET['language'] === $language['id']) ? 'selected' : '' ?>><?= $language['title'] ?></option>
                                        <?php }
                                    }
                                    ?>
                                </select>
                            </div>
                            
                            <?php if(!is_instructor()) { ?>
                            <div class="col-xxl-2 col-sm-4">
                                <label for="cohort_instructor" class="form-label">Instructor</label>
                                <select class="form-control select2" name="instructor" id="cohort_instructor">
                                    <option value="">Select Instructor</option>
                                    <?php if (isset($instructor)) {
                                        foreach ($instructor as $instructor) { ?>
                                            <option value="<?= $instructor['id'] ?>" <?= (isset($_GET['instructor']) && $_GET['instructor'] === $instructor['id']) ? 'selected' : '' ?>><?= $instructor['name'] ?></option>
                                        <?php }
                                    }
                                    ?>
                                </select>
                            </div>
                            <?php } ?>

                            <div class="col-xxl-2 col-sm-4">
                                <label for="stud_status" class="form-label">Status</label>
                                <select class="form-control select2" name="status" id="cohort_status">
                                    <option value="">Select Status</option>
                                    <option value="active" <?= (isset($_GET['status']) && $_GET['status'] === 'active') ? 'selected' : '' ?>>Active </option>
                                    <option value="completed" <?= (isset($_GET['status']) && $_GET['status'] === 'completed') ? 'selected' : '' ?>>Completed</option>
                                </select>
                            </div>

                            <div class="d-none">
                                    <input type="hidden" name="list_by" value="<?=(isset($_GET['list_by']) ? $_GET['list_by'] : '')?>" class="form-control">
                            </div>
                            
                            <div class="col-12 col-md-2 col-xxl-1 pt-md-1">
                                <button type="submit" class="btn btn-primary w-100 mt-md-4 py-md-2">
                                    <i class="ri-filter-2-line align-bottom"></i> Filter
                                </button>
                            </div>
                            <div class="col-12 col-md-2 col-xxl-1 pt-md-1">
                                <a href="<?= base_url('admin/cohorts/index') ?>" class="btn btn-danger w-100 mt-md-4 py-md-2">
                                    <i class="ri-brush-fill align-bottom"></i> Clear
                                </a>
                            </div>
                        </div>
                    </form>
                </div>
            </div>


            </div>
            <div class="card-body table-responsive">

                <ul class="nav nav-tabs nav-tabs-custom nav-success mb-3" role="tablist">
                    <li class="nav-item">
                        <a class="nav-link py-3 All <?= !isset($_GET['list_by']) ? 'active' : '' ?>" id="All"
                            href="<?= base_url('admin/centres/cohorts') ?>" role="tab" aria-selected="true">
                            All
                        </a>
                    </li>

                    <li class="nav-item">
                        <a class="nav-link py-3 Active <?= (isset($_GET['list_by']) && $_GET['list_by'] == 'active') ? 'active' : '' ?>"
                            id="Active" href="<?= base_url('admin/centres/cohorts?list_by=active') ?>">
                            Active
                        </a>
                    </li>

                    <li class="nav-item">
                        <a class="nav-link py-3 Inactive <?= (isset($_GET['list_by']) && $_GET['list_by'] == 'completed') ? 'active' : '' ?>"
                            id="Incative" href="<?= base_url('admin/centres/cohorts?list_by=completed') ?>">
                            Completed
                        </a>
                    </li>
                </ul>


                <table id="" class="data_table_basic table table-bordered  table-striped align-middle table-nowrap" style="width:100%">
                    <thead>
                    <tr>
                        <th style="width: 50px;">#</th>
                        <th style="width: 100px;">Action</th>
                        <th style="width: 50px;">Status</th>
                        <th style="width: 50px;">Centre</th>
                        <th style="width: 150px;">Cohort ID</th>
                        <th style="width: 50px;">Cohort Date</th>
                        <th style="width: 150px;">Cohort Name</th>
                        <th style="width: 150px;">Course</th>
                        <th style="width: 150px;">Subject</th>
                        <th style="width: 150px;">Language</th>
                        <th style="width: 150px;">Instructor</th>
                        <th style="width: 150px;">No.of Students</th>
                        <th style="width: 150px;">No.of Live Classes</th>
                        
                        
                    </tr>
                    </thead>
                    <tbody>
                    <?php
                   
                        if (isset($list_items)){
                            foreach ($list_items as $key => $list_item){?>
                                <tr>
                                    <td><?=$key + 1?></td>
                                    <td>
                                        <?php if(is_admin()) : ?>
                                        <button type="button" class="btn btn-soft-primary btn-sm">
                                            <a class=" dropdown-item edit-item-btn" href="<?=base_url('admin/cohorts/cohort_edit/'.$list_item['id'])?>">
                                                        <i class="<?php echo is_admin() ? 'ri-pencil-line' : 'ri-eye-line'; ?> align-bottom me-2"></i> <?php if(is_admin()){ echo 'Edit';}elseif(is_instructor()){ echo 'View';} ?>
                                            </a>
                                        </button>
                                        <?php endif; ?>

                                        <button type="button" class="btn btn-soft-secondary btn-sm">
                                            <a class="dropdown-item edit-item-btn" href="<?=base_url('admin/cohorts/view/'.$list_item['id'])?>">
                                                <i class="ri-eye-line align-bottom me-2 "></i> View
                                            </a>
                                        </button>
                                        
                                        <button type="button" class="btn btn-soft-danger btn-sm">
                                            <a href="javascript::void()" class="dropdown-item remove-item-btn" onclick="delete_modal('<?=base_url('admin/cohorts/delete/'.$list_item['id'])?>')">
                                                <i class="ri-delete-bin-fill align-bottom me-2 "></i> Delete
                                            </a>
                                        </button>
                                        <div class="dropdown d-none ">
                                            <button class="btn btn-soft-secondary btn-sm dropdown" type="button" data-bs-toggle="dropdown" aria-expanded="false">
                                                <i class="ri-more-fill align-middle"></i>
                                            </button>
                                            <ul class="dropdown-menu dropdown-menu-end">
                                                <!--<li>-->
                                                <!--    <a class="dropdown-item" href="</?=base_url('admin/cohorts/view/'.$list_item['id'])?>">-->
                                                <!--        <i class="ri-eye-fill align-bottom me-2 text-muted"></i>-->
                                                <!--        View-->
                                                <!--    </a>-->
                                                <!--</li>-->
                                                <li>
                                                    <a class="dropdown-item edit-item-btn" href="<?=base_url('admin/cohorts/cohort_edit/'.$list_item['id'])?>">
                                                        <i class="<?php echo is_admin() ? 'ri-pencil-line' : 'ri-eye-line'; ?> align-bottom me-2 text-muted"></i> <?php if(is_admin()){ echo 'Edit';}elseif(is_instructor()){ echo 'View';} ?>
                                                    </a>
                                                </li>
                                                <li>
                                                    <a href="javascript::void()" class="dropdown-item remove-item-btn" onclick="delete_modal('<?=base_url('admin/cohorts/delete/'.$list_item['id'])?>')">
                                                        <i class="ri-delete-bin-fill align-bottom me-2 text-muted"></i> Delete
                                                    </a>
                                                </li>
                                            </ul>
                                        </div>
                                    </td>
                                    <td>
                                        <?php if($list_item['start_date'] <= date('Y-m-d') && $list_item['end_date'] >= date('Y-m-d')): ?>
                                            <button type="button" class="btn btn-sm btn-warning">Active</button>
                                        <?php elseif ($list_item['start_date'] > date('Y-m-d')): ?>
                                            <button type="button" class="btn btn-sm btn-warning">Upcoming</button>
                                        <?php else:  ?>
                                            <button type="button" class="btn btn-sm btn-success">Completed</button>
                                        <?php endif; ?>
                                    </td>
                                    <td>
                                        <?= esc($list_item['centre_name'] ?? '') ?>
                                    </td>
                                    <td><?php if (is_instructor()): ?>
                                        <!-- <a href="<?= base_url('admin/cohorts/cohort_edit/' . $list_item['id']) ?>"> -->
                                            <?= esc($list_item['cohort_id']) ?>
                                        <!-- </a> -->
                                    <?php else: ?>
                                        <?= esc($list_item['cohort_id']) ?>
                                    <?php endif; ?>
                                    </td>
                                    <td>
                                        <?= date('M Y',strtotime($list_item['start_date']))?>
                                    </td>
                                    <td><?php if (is_instructor()): ?>
                                        <!-- <a href="<?= base_url('admin/cohorts/cohort_edit/' . $list_item['id']) ?>"> -->
                                            <?= esc($list_item['title'] ?? '') ?>
                                        <!-- </a> -->
                                    <?php else: ?>
                                        <?= esc($list_item['title']) ?>
                                    <?php endif; ?>
                                    </td>
                                    <td>
                                                <?= esc($list_item['course_name'] ?? '') ?>
                                    </td>
                                    <td>
                                                <?= esc($list_item['subject_name'] ?? '') ?>
                                    </td>
                                    
                                    <td>
                                                <?= esc($list_item['language_name'] ?? '') ?>
                                    </td>
                                    <td>
                                                <?= esc($list_item['instructor_name'] ?? '') ?>
                                    </td>
                                    <td class="text-center">
                                        <button type="button" class="btn btn-sm btn-secondary"><?= esc($list_item['students_count'] ?? '') ?></button>
                                    </td>
                                    <td class="text-center">
                                         <button type="button" class="btn btn-sm btn-secondary"><?= esc($list_item['lives_classes_count'] ?? '') ?></button>
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
</div><!--end row-->


