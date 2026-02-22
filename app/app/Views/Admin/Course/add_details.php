

    <!-- Layout config Js -->
    <script src="https://trogon.info/codeace/html/src/assets/js/layout.js"></script>
    <!-- Bootstrap Css -->
    <link href="https://trogon.info/codeace/html/src/assets/css/bootstrap.min.css" rel="stylesheet" type="text/css" />
    <!-- Icons Css -->
    <link href="https://trogon.info/codeace/html/src/assets/css/icons.min.css" rel="stylesheet" type="text/css" />
    <!-- App Css-->
    <link href="https://trogon.info/codeace/html/src/assets/css/app.min.css" rel="stylesheet" type="text/css" />
    <!-- custom Css-->
    <link href="https://trogon.info/codeace/html/src/assets/css/custom.min.css" rel="stylesheet" type="text/css" />


<style>
    .custom-nav .progress-label {
    font-size: 14px; /* Adjust font size */
    color: #6c757d; /* Optional: Customize label color */
    font-weight: 500; /* Optional: Add some weight to the labels */
}


</style>
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
                    <!-- start page title -->
                    <div class="row">
                        <div class="col-12">
                            <div class="page-title-box d-sm-flex align-items-center justify-content-between">
                                <h4 class="mb-sm-0"><?=$page_title ?? ''?></h4>

                                <div class="page-title-right">
                                    <ol class="breadcrumb m-0">
                                        <li class="breadcrumb-item"><a href="javascript: void(0);">Course</a></li>
                                        <li class="breadcrumb-item active"><?=$page_title ?? ''?></li>
                                    </ol>
                                </div>

                            </div>
                        </div>
                    </div>
                    <!-- end page title -->

                    <div class="row">
                        <div class="col-xl-12">
                            <div class="card">
                                <div class="card-header d-none">
                                    <h4 class="card-title mb-0">Progress Nav Steps</h4>
                                </div><!-- end card header -->
                                <div class="card-body">
                                        <!--<div id="custom-progress-bar" class="progress-nav mb-4">-->
                                        <!--    <div class="progress" style="height: 1px;">-->
                                        <!--        <div class="progress-bar" role="progressbar" style="width: 0%;" aria-valuenow="0" aria-valuemin="0" aria-valuemax="100"></div>-->
                                        <!--    </div>-->

                                        <!--    <ul class="nav nav-pills progress-bar-tab custom-nav d-flex justify-content-between align-items-center" role="tablist">-->
                                        <!--        <li class="nav-item d-flex align-items-center" role="presentation">-->
                                        <!--            <button class="nav-link rounded-pill active" data-progressbar="custom-progress-bar" id="pills-gen-info-tab" data-bs-toggle="pill" data-bs-target="#pills-gen-info" type="button" role="tab" aria-controls="pills-gen-info" aria-selected="true">1</button>-->
                                        <!--            <span class="progress-label ms-2">Basics</span>-->
                                        <!--        </li>-->
                                        <!--        <li class="nav-item d-flex align-items-center" role="presentation">-->
                                        <!--            <button class="nav-link rounded-pill active" data-progressbar="custom-progress-bar" id="pills-info-desc-tab" data-bs-toggle="pill" data-bs-target="#pills-info-desc" type="button" role="tab" aria-controls="pills-info-desc" aria-selected="false">2</button>-->
                                        <!--            <span class="progress-label ms-2">Curriculum</span>-->
                                        <!--        </li>-->
                                        <!--    </ul>-->


                                        <!--</div>-->

                                        <div class="tab-content">
                                            <div class="tab-pane fade" id="pills-gen-info" role="tabpanel" aria-labelledby="pills-gen-info-tab">
                                               

                                            </div>
                                            <!-- end tab pane -->
                                            <h3 class="text-left mb-3">Course : <?= $course_title ?> </h3>
                                            <div class="tab-pane fade show active" id="pills-info-desc" role="tabpanel" aria-labelledby="pills-info-desc-tab">
                                                <div>
                                                   <?php if (!empty($subjects)) { ?>
                                                    <div class="accordion accordion-icon-none" id="subjectsAccordion">
                                                        <?php foreach ($subjects as $index => $sub) {
                                                            $subjectId = "subject" . $index;
                                                            $collapseId = "collapse" . $index; ?>
                                                            
                                                            <div class="accordion-item">
                                                                <h2 class="accordion-header" id="heading<?= $subjectId ?>">
                                                                    <button class="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#<?= $collapseId ?>" aria-expanded="false" aria-controls="<?= $collapseId ?>">
                                                                        <div class="d-lg-flex align-items-center w-100">
                                                                            <div class="flex-shrink-0">
                                                                                <div class="avatar-sm">
                                                                                    <img src="<?= base_url(!empty($sub['thumbnail']) ? get_file($sub['thumbnail']) : 'uploads/dummy.webp') ?>" alt="" class="member-img img-fluid d-block rounded">
                                                                                </div>
                                                                            </div>
                                                                            <div class="ms-lg-3 my-3 my-lg-0">
                                                                                <h5 class="fs-16 mb-2"><?= $sub['title'] ?></h5>
                                                                                <p class="text-muted mb-0 d-none"><?= ($sub['free'] == 'on') ? 'Free' : 'Premium' ?></p>
                                                                            </div>
                                                                            <span class="accordion-icon d-flex align-items-center justify-content-center py-1 px-3 bg-info-subtle rounded-pill">
                                                                                <i class="mdi mdi-chevron-down"></i>
                                                                            </span>
                                                                        </div>
                                                                    </button>
                                                                </h2>
                                                
                                                                <div id="<?= $collapseId ?>" class="accordion-collapse collapse" aria-labelledby="heading<?= $subjectId ?>" data-bs-parent="#subjectsAccordion">
                                                                    <div class="accordion-body">
                                                                        <div class="d-flex flex-wrap gap-2 align-items-center">
                                                                            <!--<button class="btn btn-info btn-sm ml-1" onclick="show_small_modal('<?=base_url('admin/lesson/ajax_add/'.$course_id.'/'.$sub['id'])?>', 'Add Lesson')">-->
                                                                            <!--    <i class="mdi mdi-plus"></i> Add Lesson-->
                                                                            <!--</button>-->
                                                                            <a href="<?= base_url('admin/course_new/index/' . $sub['id']) ?>" class="btn btn-success btn-sm ml-1">Add lessons</a>
                                                                            <button class="btn btn-info btn-sm ml-1" onclick="show_small_modal('<?= base_url('admin/lesson/ajax_sort/' . $sub['id']) ?>', 'Sort Lessons')">
                                                                                <i class="mdi mdi-swap-horizontal"></i> Sort Lessons
                                                                            </button>
                                                
                                                                            <button onclick="show_small_modal('<?= base_url('admin/subject/ajax_edit/' . $sub['id']) ?>', 'Update Subject')" class="btn btn-primary btn-sm ml-1">
                                                                                <i class="mdi mdi-pencil-outline"></i> Edit
                                                                            </button>
                                                                            <button onclick="delete_modal('<?= base_url('admin/subject/delete/' . $sub['id']) ?>')" class="btn btn-outline-danger btn-sm ml-1">
                                                                                <i class="mdi mdi-window-close"></i> Delete
                                                                            </button>
                                                                        </div>
                                                
                                                                        <br>
                                                                        <div class="row gy-3 gx-3 m-2 bg-light rounded-4 p-3" id="lesson-lists">
                                                                            <?php $count = 0;
                                                                            foreach ($sub['lessons'] as $les) {
                                                                                    $count++; ?>
                                                                                    <div class="col-12">
                                                                                        <div class="card h-100 shadow-sm border-0 rounded-4 lesson-card">
                                                                                            <div class="card-body d-flex justify-content-between align-items-center p-3">
                                                                                            
                                                                                            <!-- Lesson title -->
                                                                                            <h6 class="lesson-title text-truncate mb-0" 
                                                                                                data-bs-toggle="collapse" 
                                                                                                data-bs-target="#lessonCollapse<?= $les['id'] ?>" 
                                                                                                aria-expanded="false">
                                                                                                <?= $les['title'] ?>
                                                                                            </h6>

                                                                                            <!-- Actions -->
                                                                                            <ul class="list-inline mb-0 d-flex align-items-center gap-2">
                                                                                                <li class="list-inline-item edit" 
                                                                                                    data-bs-toggle="tooltip" 
                                                                                                    data-bs-trigger="hover" 
                                                                                                    data-bs-placement="top" 
                                                                                                    title="Edit">
                                                                                                <a onclick="show_small_modal('<?= base_url('admin/lesson/ajax_edit/' . $les['id']) ?>', 'Update Lesson')" 
                                                                                                    class="link-success fs-15">
                                                                                                    <i class="ri-edit-2-line"></i>
                                                                                                </a>
                                                                                                </li>
                                                                                                <li class="list-inline-item" 
                                                                                                    data-bs-toggle="tooltip" 
                                                                                                    data-bs-trigger="hover" 
                                                                                                    data-bs-placement="top" 
                                                                                                    title="Remove">
                                                                                                <a href="javascript:void(0)" 
                                                                                                    onclick="delete_modal('<?= base_url('admin/lesson/delete/' . $les['id']) ?>')" 
                                                                                                    class="link-danger fs-15">
                                                                                                    <i class="ri-delete-bin-line"></i>
                                                                                                </a>
                                                                                                </li>
                                                                                            </ul>

                                                                                            </div>
                                                                                        </div>
                                                                                        </div>

                                                                                        
                                                                                    
                                                                                
                                                                            <?php } 
                                                                            if ($count == 0) { ?>
                                                                                <div class="col-12">
                                                                                    <div class="alert alert-warning text-center m-0">
                                                                                        <span>No Lessons found!</span>
                                                                                    </div>
                                                                                </div>
                                                                            <?php } ?>
                                                                        </div>

                                                                    </div>
                                                                </div>
                                                            </div>
                                                        <?php } ?>
                                                    </div>
                                                
                                                    <br>
                                                    <button class="btn btn-md btn-primary" onclick="show_small_modal('<?= base_url('admin/subject/ajax_add/'.$course_id) ?>', 'Add Subject')">
                                                        <i class="mdi mdi-plus"></i> Add Subject
                                                    </button>
                                                    <button class="btn btn-md btn-secondary" onclick="show_small_modal('<?= base_url('admin/subject/ajax_duplicate_select/'.$course_id) ?>', 'Select Subject')">
                                                        <i class="mdi mdi-view-list"></i> Select Subject from DB
                                                    </button>
                                                <?php }

                                                     else { ?>
                                                        <div class="text-center mt-5">
                                                            <!-- Image -->
                                                            <img src="<?= base_url('uploads/nodata.avif') ?>" alt="No Subjects" class="img-fluid" style="max-width: 300px;">
                                                            
                                                            <!-- Message -->
                                                            <p class="mt-3">Sorry, no subjects have been added yet.</p>
                                            
                                                            <!-- Add Subject Button -->
                                                            <button class="btn btn-md btn-primary"
                                                                    onclick="show_small_modal('<?= base_url('admin/subject/ajax_add/'.$course_id) ?>', 'Add Subject')">
                                                                <i class="mdi mdi-plus"></i> Add Subject
                                                            </button>
                                                             <button class="btn btn-md btn-secondary" onclick="show_small_modal('<?= base_url('admin/subject/ajax_duplicate_select/'.$course_id) ?>', 'Select Subject')">
                                                                <i class="mdi mdi-view-list"></i> Select Subject from DB
                                                            </button>
                                                        </div>
                                                    <?php } ?>
                                                </div>
                                                <div class="d-flex align-items-start gap-3 mt-4">
                                                    <a href="<?=base_url('admin/course/index/')?>" class="btn btn-link text-decoration-none btn-label previestab" data-previous="pills-gen-info-tab">
                                                        <i class="ri-arrow-left-line label-icon align-middle fs-16 me-2"></i> Back to General
                                                    </a>
                                                    
                                                        <a href="<?=base_url('admin/course/index')?>" class="right ms-auto">
                                                            <button class="btn btn-success btn-label right ms-auto nexttab nexttab" data-nexttab="pills-success-tab">
                                                                <i class="ri-verified-badge-line label-icon align-middle fs-16 ms-2"></i>Submit
                                                            </button>
                                                        </a>
                                                    
                                                </div>
                                                
                                                
                                                
                                            </div>
                                            <!-- end tab pane -->

                                        </div>
                                        <!-- end tab content -->
                                    </form>
                                </div>
                                <!-- end card body -->
                            </div>
                            <!-- end card -->
                        </div>
                        <!-- end col -->
                        
                    </div><!-- end row -->

            

    <!-- JAVASCRIPT -->
<script>
$(document).ready(function() {
    
    
    // Initialize the first editor
    ClassicEditor
        .create(document.querySelector('#editor'))
        .then(editor => {
            console.log(editor);
        })
        .catch(error => {
            console.error(error);
        });


});
</script>
<script>
    document.addEventListener("DOMContentLoaded", function () {
        // Get all radio buttons with name 'priceRadio'
        const priceRadios = document.querySelectorAll('input[name="is_free_course"]');
        const pricingDiv = document.querySelector('.pricing'); // Pricing div

        // Add event listener to each radio button
        priceRadios.forEach(radio => {
            radio.addEventListener('change', function () {
                if (this.value === "paid") {
                    pricingDiv.classList.remove('d-none'); // Show pricing div
                } else {
                    pricingDiv.classList.add('d-none'); // Hide pricing div
                }
            });
        });
    });
</script>
<script>
    document.addEventListener('DOMContentLoaded', function() {
        <?php if (isset($form_submitted) && $form_submitted === true): ?>
            // Switch to the second tab if the form is submitted
            document.getElementById('pills-info-desc-tab').click();
        <?php endif; ?>
    });
</script>



    <script src="https://trogon.info/codeace/html/src/assets/libs/bootstrap/js/bootstrap.bundle.min.js"></script>
    <script src="https://trogon.info/codeace/html/src/assets/libs/simplebar/simplebar.min.js"></script>
    <script src="https://trogon.info/codeace/html/src/assets/libs/node-waves/waves.min.js"></script>
    <script src="https://trogon.info/codeace/html/src/assets/libs/feather-icons/feather.min.js"></script>
    <script src="https://trogon.info/codeace/html/src/assets/js/pages/plugins/lord-icon-2.1.0.js"></script>
    <script src="https://trogon.info/codeace/html/src/assets/js/plugins.js"></script>

    <!-- form wizard init -->
    <script src="https://trogon.info/codeace/html/src/assets/js/pages/form-wizard.init.js"></script>

    <!-- App js -->
    <script src="https://trogon.info/codeace/html/src/assets/js/app.js"></script>

<script src="https://cdn.jsdelivr.net/npm/sortablejs@1.15.2/Sortable.min.js"></script>

