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
<!-- end page title -->

<div class="row g-4 mb-4">
    <div class="col-sm-auto d-none">
        <div>
             <button class="btn btn-md btn-primary float-end"
                                onclick="show_small_modal('<?=base_url('admin/subject/ajax_add/'.$course_id)?>', 'Add Subject')">
                            <i class="mdi mdi-plus"></i>
                            Add Subject
                        </button>
        </div>
    </div>
    
    <div class="col-sm-auto d-none">
        <div>
             <button class="btn btn-md btn-primary float-end"
                                onclick="show_small_modal('<?=base_url('admin/subject/ajax_sort/'.$course_id)?>', 'Sort Subject')">
                            <i class="mdi mdi-swap-horizontal"></i>
                            Sort Subject
                        </button>
        </div>
    </div>
    
    
    <div class="col-sm-auto">
        <div>
             <button class="btn btn-md btn-primary float-end"
                                onclick="show_small_modal('<?=base_url('admin/lesson/ajax_add/'.$course_id)?>', 'Add Lesson')">
                            <i class="mdi mdi-plus"></i>
                            Add Lesson
                        </button>
        </div>
    </div>
    <div class="col-sm d-none">
        <div class="d-md-flex justify-content-sm-end gap-2">
            <div class="search-box ms-md-2 flex-shrink-0 mb-3 mb-md-0">
                <input type="text" class="form-control" id="searchJob" autocomplete="off" placeholder="Search for candidate name or designation...">
                <i class="ri-search-line search-icon"></i>
            </div>

            <select class="form-control w-md" data-choices data-choices-search-false>
                <option value="All">All</option>
                <option value="Today">Today</option>
                <option value="Yesterday" selected>Yesterday</option>
                <option value="Last 7 Days">Last 7 Days</option>
                <option value="Last 30 Days">Last 30 Days</option>
                <option value="This Month">This Month</option>
                <option value="Last Year">Last Year</option>
            </select>
        </div>
    </div>
</div>

<div class="row gy-2 mb-2 rounded-5" id="candidate-list">
    
<?php
if (!empty($subjects)) {
    echo '<div class="accordion accordion-icon-none" id="subjectsAccordion">';
    foreach ($subjects as $index => $sub) {
        $subjectId = "subject" . $index;
        $collapseId = "collapse" . $index;
        ?>
        <div class="accordion-item">
            <h2 class="accordion-header" id="heading<?//= $subjectId ?>">
                <button class="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#<?//= $collapseId ?>" aria-expanded="false" aria-controls="<?//= $collapseId ?>">
                    <div class="d-lg-flex align-items-center w-100">
                        <div class="flex-shrink-0 ">
                            <div class="avatar-sm">
                                <?php
                                if (!empty($sub['thumbnail'])) { ?>
                                    <img src="<?= base_url(get_file($sub['thumbnail'])) ?>" alt="" class="member-img img-fluid d-block rounded">
                                <?php } else { ?>
                                    <img src="<?= base_url('uploads/dummy.webp') ?>" alt="" class="member-img img-fluid d-block rounded">
                                <?php } ?>
                            </div>
                        </div>
                        <div class="ms-lg-3 my-3 my-lg-0">
                            <h5 class="fs-16 mb-2"><?= $sub['title'] ?></h5>
                            <?php
                            if ($sub['free'] == 'on') {
                                echo '<p class="text-muted mb-0">Free</p>';
                            } else {
                                echo '<p class="text-muted mb-0">Premium</p>';
                            }
                            ?>
                        </div>
                        <span class="accordion-icon d-flex align-items-center justify-content-center py-1 px-3 bg-info-subtle rounded-pill">
                           <span class="fs-5">View Lessons</span> <i class=" mdi mdi-chevron-down"></i> <!-- Add icon here -->
                        </span>
                    </div>
                </button>
            </h2>
            <div id="<?= $collapseId ?>" class="accordion-collapse collapse" aria-labelledby="heading<?= $subjectId ?>" data-bs-parent="#subjectsAccordion">
                <div class="accordion-body">
                    <div class="d-flex flex-wrap gap-2 align-items-center">
                        <button class="btn btn-info btn-sm ml-1" onclick="show_small_modal('<?= base_url('admin/lesson/ajax_sort/' . $sub['id']) ?>', 'Sort Lesson')">
                            <i class="mdi mdi-swap-horizontal"></i> Sort Lesson
                        </button>
                        <button onclick="show_small_modal('<?= base_url('admin/subject/ajax_edit/' . $sub['id']) ?>', 'Update Subject')" class="btn btn-primary btn-sm ml-1">
                            <i class="mdi mdi-pencil-outline"></i> Edit
                        </button>
                        <button onclick="delete_modal('<?= base_url('admin/subject/delete/' . $sub['id']) ?>')" class="btn btn-outline-danger btn-sm ml-1">
                            <i class="mdi mdi-window-close"></i> Delete
                        </button>
                    </div>
                    <br>
                    <div class="row gy-2 m-2 bg-light rounded-4" id="candidate-list">
                        <div class="p-3 pb-0">
                            <?php
                            $count = 0;
                            foreach ($lessons as $les) {
                                if ($les['subject_id'] == $sub['id']) {
                                    $count++;
                                    ?>
                                    <div class="col-md-12 col-lg-12">
                                        <div class="card mb-0 rounded-4">
                                            <div class="card-body">
                                                <div class="d-lg-flex align-items-center row">
                                                    <div class="ms-lg-3 my-3 my-lg-0 col-sm-3">
                                                        <h5 class="fs-16 mb-2"><?= $les['title'] ?></h5>
                                                        <?php
                                                        if ($les['free'] == 'on') {
                                                            echo '<p class="text-muted mb-0">Free</p>';
                                                        } else {
                                                            echo '<p class="text-muted mb-0">Premium</p>';
                                                        }
                                                        ?>
                                                    </div>
                                                    <div class="d-flex gap-4 mt-0 text-muted mx-auto d-none">
                                                        <div><i class="ri-map-pin-2-line text-primary me-1 align-bottom"></i> Cullera, Spain</div>
                                                        <div><i class="ri-time-line text-primary me-1 align-bottom"></i> <span class="badge bg-danger-subtle text-danger">Part Time</span></div>
                                                    </div>
                                                    <div class="d-flex gap-1 justify-content-center mx-auto my-3 col-sm-5 my-lg-0">
                                                        <a href="<?= base_url('admin/lesson_files/index/' . $les['id']) ?>" class="btn btn-info btn-sm ml-1">
                                                            <i class="mdi mdi-view-headline"></i> Lesson files
                                                        </a>
                                                        <a href="javascript::" class="btn btn-outline-info btn-sm ml-1" onclick="show_small_modal('<?= base_url('admin/lesson_files/ajax_add/' . $les['id']) ?>', 'Add Lesson files')">
                                                            <i class="mdi mdi-plus"></i> Add lesson file
                                                        </a>
                                                    </div>
                                                    <div class="col-sm-3 d-flex justify-content-end">
                                                        <button onclick="show_small_modal('<?= base_url('admin/lesson/ajax_edit/' . $les['id']) ?>', 'Update Lesson')" class="btn btn-primary btn-sm ml-1 me-1">
                                                            <i class="mdi mdi-pencil-outline"></i> Edit
                                                        </button>
                                                        <button onclick="delete_modal('<?= base_url('admin/lesson/delete/' . $les['id']) ?>')" class="btn btn-outline-danger btn-sm ml-1">
                                                            <i class="mdi mdi-window-close"></i> Delete
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                        <br>
                                    </div>
                                    <?php
                                }
                            }
                            if ($count == 0) { ?>
                                <div class="alert alert-warning">
                                    <span>No Lessons found!</span>
                                </div>
                                <?php
                            }
                            ?>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        <?php
    }
    echo '</div>';
}
?>        
</div>

<style>
    button.btn{
        min-width: 80px;
    }
/* Custom CSS to prevent color change on accordion header */
.accordion-button {
    background-color: #fff; /* Set the background color */
    color: #000; /* Set the text color */
}
.accordion-button:not(.collapsed) {
    background-color: #fff; /* Keep the background color when expanded */
    color: #000; /* Keep the text color when expanded */
}
.accordion-button:focus {
    box-shadow: none; /* Remove the focus shadow */
}
.accordion-button:hover {
    background-color: #fff; /* Keep the background color on hover */
    color: #000; /* Keep the text color on hover */
}
/* Custom CSS for the accordion icon */
.accordion-button .accordion-icon {
    margin-left: auto; /* Align the icon to the right */
    font-size: 1.5rem; /* Increase the icon size */
    color: #007bff; /* Highlight the icon color */
}


.accordion-button:not(.collapsed) .accordion-icon i {
    transform: rotate(180deg); /* Rotate the icon when expanded */
}
</style>