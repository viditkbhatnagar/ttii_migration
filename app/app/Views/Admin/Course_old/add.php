

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
                                                    <button class="nav-link rounded-pill" data-progressbar="custom-progress-bar" id="pills-info-desc-tab" data-bs-toggle="pill" data-bs-target="#pills-info-desc" type="button" role="tab" aria-controls="pills-info-desc" aria-selected="false">2</button>
                                                    <span class="progress-label ms-2">Curriculum</span>
                                                </li>
                                                <li class="nav-item d-flex align-items-center" role="presentation">
                                                    <button class="nav-link rounded-pill" data-progressbar="custom-progress-bar" id="pills-success-tab" data-bs-toggle="pill" data-bs-target="#pills-success" type="button" role="tab" aria-controls="pills-success" aria-selected="false">3</button>
                                                    <span class="progress-label ms-2">Additional</span>
                                                </li>
                                            </ul>


                                        </div>

                                        <div class="tab-content">
                                            <div class="tab-pane fade show active" id="pills-gen-info" role="tabpanel" aria-labelledby="pills-gen-info-tab">
                                                <form action="<?=base_url('admin/course/add')?>" class="form-steps" autocomplete="off" enctype="multipart/form-data" method="post">

                                                <div>
                                                    
                                                     <?php if (isset($form_submitted) && $form_submitted === true): ?>
                                                        <h5>Course Added Successfully</h5>
                                                    <?php endif; ?>

                                                    <div class="mb-4 d-none">
                                                        <div>
                                                            <h5 class="mb-1">General Information</h5>
                                                            <p class="text-muted">Fill all Information as below</p>
                                                        </div>
                                                    </div>
                                                    <div class="row">
                                                        <div class="col-12 col-md-8">
                                                            <div class="row">
                                                                <div class="col-12">
                                                                    <div class="mb-3">
                                                                        <label for="title" class="form-label">Course Title</label>
                                                                        <input type="text" class="form-control" id="title" name="title" 
                                                                            value="<?= isset($edit_data['title']) ? esc($edit_data['title']) : '' ?>" required>
                                                                    </div>
                                                                </div>
                                                                <div class="col-12">
                                                                    <div class="mb-3">
                                                                        <label for="description" class="form-label">Course Description</label>
                                                                        <textarea class="form-control"  name="description" rows="3" required id="editor">
                                                                            <?= isset($edit_data['description']) ? esc($edit_data['description']) : '' ?>
                                                                        </textarea>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <div class="col-12 col-md-4">
                                                            <div class="row">
                                                                <div class="col-12">
                                                                     <div class="mb-3">
                                                                        <label for="thumbnail" class="form-label">Course Thumbnail</label>
                                                                        <input type="file" class="form-control" id="thumbnail" name="thumbnail">
                                                                        <?php if (isset($edit_data['thumbnail']) && $edit_data['thumbnail']): ?>
                                                                            <p>Current Thumbnail: <img src="<?= esc($edit_data['thumbnail']) ?>" alt="Thumbnail" width="100"></p>
                                                                        <?php endif; ?>
                                                                    </div>
                                                                </div>
                                                                <div class="col-12">
                                                                    <div class="mb-3">
                                                                        <label class="form-label" for="gen-info-username-input">Pricing</label>
                                                                        <br>
                                                                        <!-- Inline Radios -->
                                                                        <div class="form-check form-check-inline">
                                                                            <input class="form-check-input" type="radio" name="is_free_course" id="is_free_course" value="1"
                                                                                <?= (isset($edit_data['is_free_course']) && $edit_data['is_free_course'] == 1) ? 'checked' : '' ?>>
                                                                            <label class="form-check-label" for="is_free_course">Free Course</label>
                                                                        </div>
                                                                        <div class="form-check form-check-inline">
                                                                            <input class="form-check-input" type="radio" name="is_free_course" id="is_paid_course" value="0"
                                                                                <?= (isset($edit_data['is_free_course']) && $edit_data['is_free_course'] == 0) ? 'checked' : '' ?>>
                                                                            <label class="form-check-label" for="is_paid_course">Paid Course</label>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                                <div class="col-12 pricing d-none">
                                                                    <div class="mb-3">
                                                                        <div class="row">
                                                                            <div class="col-6">
                                                                                    <label for="price" class="form-label">Price</label>
                                                                                    <input type="number" class="form-control" id="price" name="price" 
                                                                                        value="<?= isset($edit_data['price']) ? esc($edit_data['price']) : '' ?>" placeholder="0.00">
                                                                            </div>
                                                                            <div class="col-6">
                                                                                    <label for="sale_price" class="form-label">Sale Price</label>
                                                                                    <input type="number" class="form-control" id="sale_price" name="sale_price" 
                                                                                        value="<?= isset($edit_data['sale_price']) ? esc($edit_data['sale_price']) : '' ?>" placeholder="0.00">
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                            
                                                        </div>
                                                    </div>
                                                    
                                                    
                                                </div>
                                                <div class="d-flex align-items-start gap-3 mt-4">
                                                    <button type="submit" class="btn btn-success btn-label right ms-auto nexttab nexttab" data-nexttab="pills-info-desc-tab"><i class="ri-arrow-right-line label-icon align-middle fs-16 ms-2"></i>Go to more info</button>
                                                </div>
                                                
                                                </form>  

                                            </div>
                                            <!-- end tab pane -->

                                            <div class="tab-pane fade" id="pills-info-desc" role="tabpanel" aria-labelledby="pills-info-desc-tab">
                                                <div>
                                                    <?php if (!empty($subjects)) { ?>
                                                        <div class="col-sm-auto">
                                                            <div>
                                                                <button onclick="show_ajax_modal('<?= base_url('admin/subject/ajax_subject_import/' . $course_id) ?>', 'Transfer Course Datas')" class="btn btn-md btn-primary float-end">
                                                                    <i class="mdi mdi-import"></i> Import
                                                                </button>
                                                            </div>
                                                        </div>
                                                    <?php } else { ?>
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
                                                    <button type="button" class="btn btn-link text-decoration-none btn-label previestab" data-previous="pills-gen-info-tab">
                                                        <i class="ri-arrow-left-line label-icon align-middle fs-16 me-2"></i> Back to General
                                                    </button>
                                                    <button type="button" class="btn btn-success btn-label right ms-auto nexttab nexttab" data-nexttab="pills-success-tab">
                                                        <i class="ri-arrow-right-line label-icon align-middle fs-16 ms-2"></i>Submit
                                                    </button>
                                                </div>
                                            </div>
                                            <!-- end tab pane -->

                                            <div class="tab-pane fade" id="pills-success" role="tabpanel" aria-labelledby="pills-success-tab">
                                                <div>
                                                    <div class="text-center">

                                                        <div class="mb-4">
                                                            <lord-icon src="https://cdn.lordicon.com/lupuorrc.json" trigger="loop" colors="primary:#0ab39c,secondary:#405189" style="width:120px;height:120px"></lord-icon>
                                                        </div>
                                                        <h5>Well Done !</h5>
                                                        <p class="text-muted">You have Successfully Signed Up</p>
                                                    </div>
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
        // Get references to elements
        const priceRadios = document.querySelectorAll('input[name="is_free_course"]');
        const pricingDiv = document.querySelector('.pricing'); // Pricing div
        const priceInput = document.getElementById('price');
        const salePriceInput = document.getElementById('sale_price');
    
        // Function to toggle required attributes
        const toggleRequiredAttributes = (isPaid) => {
            if (isPaid) {
                pricingDiv.classList.remove('d-none'); // Show pricing div
                priceInput.setAttribute('required', 'required');
                salePriceInput.setAttribute('required', 'required');
            } else {
                pricingDiv.classList.add('d-none'); // Hide pricing div
                priceInput.removeAttribute('required');
                salePriceInput.removeAttribute('required');
            }
        };
    
        // Add event listener to each radio button
        priceRadios.forEach((radio) => {
            radio.addEventListener('change', function () {
                const isPaid = this.value === '0'; // Check if the value is 0 (Paid Course)
                toggleRequiredAttributes(isPaid);
            });
        });
    
        // Initialize on page load
        const selectedRadio = document.querySelector('input[name="is_free_course"]:checked');
        if (selectedRadio) {
            toggleRequiredAttributes(selectedRadio.value === '0');
        }
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

