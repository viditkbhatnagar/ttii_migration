

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
                                        <div id="custom-progress-bar" class="progress-nav mb-4">
                                            <div class="progress" style="height: 1px;">
                                                <div class="progress-bar" role="progressbar" style="width: 0%;" aria-valuenow="0" aria-valuemin="0" aria-valuemax="100"></div>
                                            </div>

                                            <ul class="nav nav-pills progress-bar-tab custom-nav d-flex justify-content-between align-items-center" role="tablist">
                                                <li class="nav-item d-flex align-items-center" role="presentation">
                                                    <button class="nav-link rounded-pill active" data-progressbar="custom-progress-bar" id="pills-gen-info-tab" data-bs-toggle="pill" data-bs-target="#pills-gen-info" type="button" role="tab" aria-controls="pills-gen-info" aria-selected="true">1</button>
                                                    <span class="progress-label ms-2">Basics</span>
                                                </li>
                                                <li class="nav-item d-flex align-items-center" role="presentation">
                                                    <button class="nav-link rounded-pill active" data-progressbar="custom-progress-bar" id="pills-info-desc-tab" data-bs-toggle="pill" data-bs-target="#pills-info-desc" type="button" role="tab" aria-controls="pills-info-desc" aria-selected="false">2</button>
                                                    <span class="progress-label ms-2">Curriculum</span>
                                                </li>
                                            </ul>


                                        </div>

                                        <div class="tab-content">
                                            <div class="tab-pane fade" id="pills-gen-info" role="tabpanel" aria-labelledby="pills-gen-info-tab">
                                               

                                            </div>
                                            <!-- end tab pane -->

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
                                                                                <p class="text-muted mb-0"><?= ($sub['free'] == 'on') ? 'Free' : 'Premium' ?></p>
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
                                                                            <button class="btn btn-info btn-sm ml-1" onclick="show_small_modal('<?=base_url('admin/lesson/ajax_add/'.$course_id.'/'.$sub['id'])?>', 'Add Lesson')">
                                                                                <i class="mdi mdi-plus"></i> Add Lesson
                                                                            </button>
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
                                                                        <div class="row gy-2 m-2 bg-light rounded-4" id="lesson-list">
                                                                            <div class="p-3 pb-0">
                                                                                <?php $count = 0;
                                                                                foreach ($lessons as $les) {
                                                                                    if ($les['subject_id'] == $sub['id']) {
                                                                                        $count++; ?>
                                                                                        <div class="col-md-12 col-lg-12">
                                                                                            <div class="card mb-0 rounded-4">
                                                                                                <div class="card-body">
                                                                                                    <div class="d-lg-flex align-items-center row">
                                                                                                        <div class="ms-lg-3 my-3 my-lg-0 col-lg-3">
                                                                                                            <h5 class="fs-16 mb-2 lesson-title" data-bs-toggle="collapse" data-bs-target="#lessonCollapse<?= $les['id'] ?>" aria-expanded="false">
                                                                                                                <?= $les['title'] ?>
                                                                                                            </h5>
                                                                                                            <p class="text-muted mb-0"><?= ($les['free'] == 'on') ? 'Free' : 'Premium' ?></p>
                                                                                                        </div>
                                                
                                                                                                        <div class="d-flex gap-1 justify-content-center mx-auto my-3 col-lg-7 my-lg-0">
                                                                                                            <button class="btn btn-info btn-sm ml-1" onclick="show_small_modal('<?=base_url('admin/topic/ajax_add/'.$course_id.'/'.$sub['id'].'/'.$les['id'])?>', 'Add Topic')">
                                                                                                                <i class="mdi mdi-plus"></i> Add Topic
                                                                                                            </button>
                                                                                                            <a href="<?= base_url('admin/lesson_files/index/' . $les['id']) ?>" class="btn btn-info btn-sm ml-1">
                                                                                                                <i class="mdi mdi-view-headline"></i> Lesson files
                                                                                                            </a>
                                                                                                            
                                                                                                            
                                                                                                            <a href="javascript::" class="btn btn-outline-primary btn-sm ml-1" onclick="show_small_modal('<?= base_url('admin/lesson_files/ajax_add_video/' . $les['id']) ?>', 'Add Videos')">
                                                                                                                <i class="mdi mdi-plus"></i> Videos
                                                                                                            </a>
                                                                                                            <a href="javascript::" class="btn btn-outline-warning btn-sm ml-1" onclick="show_small_modal('<?= base_url('admin/lesson_files/ajax_add_audio/' . $les['id']) ?>', 'Add Audio')">
                                                                                                                <i class="mdi mdi-plus"></i> Audio
                                                                                                            </a>
                                                                                                            <a href="javascript::" class="btn btn-outline-info btn-sm ml-1" onclick="show_small_modal('<?= base_url('admin/lesson_files/ajax_add_article/' . $les['id']) ?>', 'Add Article')">
                                                                                                                <i class="mdi mdi-plus"></i> Article
                                                                                                            </a>
                                                                                                            <a href="javascript::" class="btn btn-outline-info btn-sm ml-1" onclick="show_small_modal('<?= base_url('admin/lesson_files/ajax_add_document/' . $les['id']) ?>', 'Add Document')">
                                                                                                                <i class="mdi mdi-plus"></i> Document
                                                                                                            </a>
                                                                                                            <a href="javascript::" class="btn btn-outline-secondary btn-sm ml-1" onclick="show_small_modal('<?= base_url('admin/lesson_files/ajax_add_quiz/' . $les['id']) ?>', 'Add Quiz')">
                                                                                                                <i class="mdi mdi-plus"></i> Quiz
                                                                                                            </a>
                                                                                                            
                                                                                                        </div>
                                                
                                                                                                        <div class="col-lg-1 d-flex justify-content-end">
                                                                                                            
                                                                                                            <ul class="list-inline hstack gap-2 mb-0">
                                                                                                                <li class="list-inline-item edit" data-bs-toggle="tooltip" data-bs-trigger="hover" data-bs-placement="top" title="Edit">
                                                                                                                    <a onclick="show_small_modal('<?= base_url('admin/lesson/ajax_edit/' . $les['id']) ?>', 'Update Lesson')" class="link-success fs-15"><i class="ri-edit-2-line"></i></a>
                                                                                                                </li>
                                                                                                                <li class="list-inline-item" data-bs-toggle="tooltip" data-bs-trigger="hover" data-bs-placement="top" title="Remove">
                                                                                                                    <a href="javascript::void()" onclick="delete_modal('<?= base_url('admin/lesson/delete/' . $les['id']) ?>')" class="link-danger fs-15"><i class="ri-delete-bin-line"></i></a>
                                                                                                                </li>
                                                                                                            </ul>
                                                                                                            
                                                                                                            
                                                                                                            <button onclick="show_small_modal('<?= base_url('admin/lesson/ajax_edit/' . $les['id']) ?>', 'Update Lesson')" class="btn btn-primary btn-sm ml-1 me-1 d-none">
                                                                                                                <i class="ri-edit-2-line"></i>
                                                                                                            </button>
                                                                                                            <button onclick="delete_modal('<?= base_url('admin/lesson/delete/' . $les['id']) ?>')" class="btn btn-outline-danger btn-sm ml-1 d-none">
                                                                                                                <i class="ri-delete-bin-line"></i> 
                                                                                                            </button>
                                                                                                        </div>
                                                                                                    </div>
                                                
                                                                                                    <div id="lessonCollapse<?= $les['id'] ?>" class="accordion-collapse collapse mt-3">
                                                                                                        <div class="accordion-body">
                                                                                                            <div class="row gy-2 m-2 bg-white rounded-4">
                                                                                                                <div class="p-3 pb-0">
                                                                                                                    <?php
                                                                                                                    $topic_count = 0;
                                                                                                                    foreach ($topics as $topic) {
                                                                                                                        if ($topic['lesson_id'] == $les['id']) {
                                                                                                                            $topic_count++; ?>
                                                                                                                            <div class="col-md-12 col-lg-12">
                                                                                                                                <div class="card border border-3 mb-0 rounded-4">
                                                                                                                                    <div class="card-body ">
                                                                                                                                        <div class="row">
                                                                                                                                            
                                                                                                                                            <div class="col-lg-4">
                                                                                                                                                <h6 class="fs-14"><?= $topic['title'] ?></h6>
                                                                                                                                                
                                                                                                                                            </div>
                                                                                                                                            
                                                                                                                                            
                                                                                                                                            <div  class="col-lg-7">
                                                                                                                                              
                                                                                                                                              
                                                                                                                                                <a href="<?= base_url('admin/lesson_files/topic/' . $topic['id']) ?>" class="btn btn-info btn-sm ml-1">
                                                                                                                                                    <i class="mdi mdi-view-headline"></i> Lesson files
                                                                                                                                                </a>
                                                                                                                                                <a href="javascript::" class="btn btn-outline-primary btn-sm ml-1" onclick="show_small_modal('<?= base_url('admin/lesson_files/ajax_add_video/' . $les['id'].'/'.$topic['id']) ?>', 'Add Videos')">
                                                                                                                                                    <i class="mdi mdi-plus"></i> Videos
                                                                                                                                                </a>
                                                                                                                                                <a href="javascript::" class="btn btn-outline-warning btn-sm ml-1" onclick="show_small_modal('<?= base_url('admin/lesson_files/ajax_add_audio/' . $les['id'].'/'.$topic['id']) ?>', 'Add Audio')">
                                                                                                                                                    <i class="mdi mdi-plus"></i> Audio
                                                                                                                                                </a>
                                                                                                                                                <a href="javascript::" class="btn btn-outline-info btn-sm ml-1" onclick="show_small_modal('<?= base_url('admin/lesson_files/ajax_add_article/' . $les['id'].'/'.$topic['id']) ?>', 'Add Article')">
                                                                                                                                                    <i class="mdi mdi-plus"></i> Article
                                                                                                                                                </a>
                                                                                                                                                <a href="javascript::" class="btn btn-outline-info btn-sm ml-1" onclick="show_small_modal('<?= base_url('admin/lesson_files/ajax_add_document/' . $les['id'].'/'.$topic['id']) ?>', 'Add Document')">
                                                                                                                                                    <i class="mdi mdi-plus"></i> Document
                                                                                                                                                </a>
                                                                                                                                                <a href="javascript::" class="btn btn-outline-secondary btn-sm ml-1" onclick="show_small_modal('<?= base_url('admin/lesson_files/ajax_add_quiz/' . $les['id'].'/'.$topic['id']) ?>', 'Add Quiz')">
                                                                                                                                                    <i class="mdi mdi-plus"></i> Quiz
                                                                                                                                                </a>
                                                                                                                                                
                                                                                                                                                
                                                                                                                                                
                                                                                                                                                
                                                                                                                                                <button onclick="show_small_modal('<?= base_url('admin/topic/ajax_edit/' . $topic['id']) ?>', 'Update Topic')" class="btn btn-primary btn-sm ml-1 me-1 d-none">
                                                                                                                                                    <i class="mdi mdi-pencil-outline"></i> Edit
                                                                                                                                                </button>
                                                                                                                                                <button onclick="delete_modal('<?= base_url('admin/topic/delete/' . $topic['id']) ?>')" class="btn btn-outline-danger btn-sm ml-1 d-none">
                                                                                                                                                    <i class="mdi mdi-window-close"></i> Delete
                                                                                                                                                </button>
                                                                                                                                            </div>
                                                                                                                                            
                                                                                                                                            <div  class="col-lg-1">
                                                                                                                                                <ul class="list-inline hstack gap-2 mb-0" >
                                                                                                                                                    <li class="list-inline-item edit" data-bs-toggle="tooltip" data-bs-trigger="hover" data-bs-placement="top" title="Edit">
                                                                                                                                                        <a onclick="show_small_modal('<?= base_url('admin/topic/ajax_edit/' . $les['id']) ?>', 'Update Topic')" class="link-success fs-15"><i class="ri-edit-2-line"></i></a>
                                                                                                                                                    </li>
                                                                                                                                                    <li class="list-inline-item" data-bs-toggle="tooltip" data-bs-trigger="hover" data-bs-placement="top" title="Remove">
                                                                                                                                                        <a href="javascript::void()" onclick="delete_modal('<?= base_url('admin/topic/delete/' . $les['id']) ?>')" class="link-danger fs-15"><i class="ri-delete-bin-line"></i></a>
                                                                                                                                                    </li>
                                                                                                                                                </ul>
                                                                                                                                                
                                                                                                                                            </div>
                                                                                                                                        </div>
                                                                                                                                    </div>
                                                                                                                                </div>
                                                                                                                            </div>
                                                                                                                            <br>
                                                                                                                        <?php }
                                                                                                                    }
                                                                                                                    if ($topic_count == 0) { ?>
                                                                                                                        <div class="alert alert-warning">
                                                                                                                            <span>No Topics found!</span>
                                                                                                                        </div>
                                                                                                                    <?php } ?>
                                                                                                                </div>
                                                                                                            </div>
                                                                                                        </div>
                                                                                                    </div>
                                                                                                    <!-- ✅ Topics End -->
                                                                                                </div>
                                                                                            </div>
                                                                                            <br>
                                                                                        </div>
                                                                                    <?php }
                                                                                }
                                                                                if ($count == 0) { ?>
                                                                                    <div class="alert alert-warning">
                                                                                        <span>No Lessons found!</span>
                                                                                    </div>
                                                                                <?php } ?>
                                                                            </div>
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
                                                        </div>
                                                    <?php } ?>
                                                </div>
                                                <div class="d-flex align-items-start gap-3 mt-4">
                                                    <a href="<?=base_url('admin/course/add/'.$course_id)?>" class="btn btn-link text-decoration-none btn-label previestab" data-previous="pills-gen-info-tab">
                                                        <i class="ri-arrow-left-line label-icon align-middle fs-16 me-2"></i> Back to General
                                                    </a>
                                                    <button type="button" class="btn btn-success btn-label right ms-auto nexttab nexttab" data-nexttab="pills-success-tab">
                                                        <i class="ri-arrow-right-line label-icon align-middle fs-16 ms-2"></i>Submit
                                                    </button>
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

