<!-- start page title -->
<div class="row">
    <div class="col-12">
        <div class="page-title-box d-sm-flex align-items-center justify-content-between">
            <h4 class="mb-sm-0"><?=$page_title ?? ''?></h4>

            <div class="page-title-right">
                <ol class="breadcrumb m-0">
                    <li class="breadcrumb-item"><a href="<?=base_url('centre/dashboard/index')?>">Dashboard</a></li>
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
                    <div class="col-4">
                        <a class="btn btn-md btn-primary float-end" href="<?=base_url('centre/cohorts/cohort_add/')?>">
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
                                <a href="<?= base_url('centre/cohorts/index') ?>" class="btn btn-danger w-100 mt-md-4 py-md-2">
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
                            href="<?= base_url('centre/cohorts/index') ?>" role="tab" aria-selected="true">
                            All
                        </a>
                    </li>

                    <li class="nav-item">
                        <a class="nav-link py-3 Active <?= (isset($_GET['list_by']) && $_GET['list_by'] == 'active') ? 'active' : '' ?>"
                            id="Active" href="<?= base_url('centre/cohorts/index?list_by=active') ?>">
                            Active
                        </a>
                    </li>

                    <li class="nav-item">
                        <a class="nav-link py-3 Inactive <?= (isset($_GET['list_by']) && $_GET['list_by'] == 'completed') ? 'active' : '' ?>"
                            id="Incative" href="<?= base_url('centre/cohorts/index?list_by=completed') ?>">
                            Completed
                        </a>
                    </li>
                </ul>


                <div class="row g-4">

                <?php if (isset($list_items)) : ?>
                <?php foreach ($list_items as $key => $list_item) : ?>

                    <div class="col-xl-4 col-md-6">
                        <div class="card shadow-sm h-100 border-0">

                            <div class="card-body">

                                <!-- Top Section -->
                                <div class="d-flex justify-content-between align-items-start mb-3">
                                    <div class="bg-light p-2 rounded">
                                        <i class="ri-graduation-cap-line fs-4 text-primary"></i>
                                    </div>

                                    <div>
                                        <?php if($list_item['start_date'] <= date('Y-m-d') && $list_item['end_date'] >= date('Y-m-d')): ?>
                                            <span class="badge bg-success">Active</span>
                                        <?php elseif ($list_item['start_date'] > date('Y-m-d')): ?>
                                            <span class="badge bg-warning">Upcoming</span>
                                        <?php else: ?>
                                            <span class="badge bg-secondary">Completed</span>
                                        <?php endif; ?>
                                    </div>
                                </div>

                                <!-- Cohort Name -->
                                <h5 class="fw-bold mb-2 text-truncate">
                                    <?= esc($list_item['title']) ?>
                                </h5>

                                <!-- Cohort ID -->
                                <p class="text-muted small mb-3">ID: <?= esc($list_item['cohort_id']) ?></p>

                                <ul class="list-unstyled l mb-3">
                                    <li class="mb-1"><strong>Course:</strong> <?= esc($list_item['course_name'] ?? '') ?></li>
                                    <li class="mb-1"><strong>Subject:</strong> <?= esc($list_item['subject_name'] ?? '') ?></li>
                                    <li class="mb-1"><strong>Language:</strong> <?= esc($list_item['language_name'] ?? '') ?></li>
                                    <li class="mb-1"><strong>Instructor:</strong> <?= esc($list_item['instructor_name'] ?? '') ?></li>
                                    <li class="mb-1"><strong>Cohort Date:</strong> <?= date('M Y', strtotime($list_item['start_date'])) ?></li>
                                </ul>

                                <!-- Student & Class Count -->
                                <div class="d-flex justify-content-between mb-3">
                                    <div>
                                        <small class="text-muted">Students</small>
                                        <h5 class="mb-0"><?= esc($list_item['students_count'] ?? 0) ?></h5>
                                    </div>

                                    <div>
                                        <small class="text-muted">Live Classes</small>
                                        <h5 class="mb-0"><?= esc($list_item['lives_classes_count'] ?? 0) ?></h5>
                                    </div>
                                </div>

                                <!-- Action Buttons -->
                                <div class="d-flex justify-content-between flex-wrap gap-1">

                                    <?php if(true) : ?>
                                        <a href="<?=base_url('centre/cohorts/cohort_edit/'.$list_item['id'])?>" 
                                        class="btn btn-soft-primary btn-sm w-100 mb-1">
                                            <i class="ri-pencil-line me-1"></i> Edit
                                        </a>
                                    <?php endif; ?>

                                    <a href="<?=base_url('centre/cohorts/view/'.$list_item['id'])?>" 
                                    class="btn btn-soft-secondary btn-sm flex-grow-1">
                                        <i class="ri-eye-line me-1"></i> View
                                    </a>

                                    <button type="button" 
                                            class="btn btn-soft-danger btn-sm flex-grow-1"
                                            onclick="delete_modal('<?=base_url('centre/cohorts/delete/'.$list_item['id'])?>')">
                                        <i class="ri-delete-bin-line me-1"></i> Delete
                                    </button>
                                </div>

                            </div>
                        </div>
                    </div>

                <?php endforeach; ?>
                <?php endif; ?>

                </div>

            </div>
        </div>
    </div>
</div><!--end row-->


