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

    /* Container background (track) */
    .progress-bar-tab {
        position: relative;
        background: #e9ecef;
        border-radius: 50px;
        padding: 8px;
    }

    /* Each step */
    .progress-bar-tab .nav-item {
        flex: 1;
        justify-content: center;
        position: relative;
        z-index: 2;
    }

    /* Buttons default */
    .progress-bar-tab .nav-link {
        width: 42px;
        height: 42px;
        border-radius: 50% !important;
        border: none;
        background: transparent;
        color: #666;
        font-weight: 600;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: 0.3s ease;
    }

    /* Label default */
    .progress-label {
        font-size: 13px;
        color: #666;
        transition: 0.3s ease;
        font-weight: 500;
        z-index: 20;
    }

    /* Active state */
    .progress-bar-tab .nav-link.active {
        background: #0d6efd;
        color: #fff;
        box-shadow: 0 5px 15px rgba(13,110,253,.4);
    }

    /* Active label */
    .progress-bar-tab .nav-link.active + .progress-label {
        color: #0d6efd;
        font-weight: 600;
    }

    /* Sliding indicator */
    .progress-bar-tab::before {
        content: "";
        position: absolute;
        top: 50%;
        height: 3px;
        background: #0d6efd33;
        left: 15px;
        right: 15px;
        transform: translateY(-50%);
        z-index: 1;
    }

    /* Smooth hover */
    .progress-bar-tab .nav-link:hover {
        transform: scale(1.05);
    }


</style>

<script>
    $(document).ready(function () {
    
        $('.select2').select2({
        
        });
    });

    document.querySelectorAll('.progress-bar-tab .nav-link').forEach(btn => {
        btn.addEventListener('shown.bs.tab', function () {
            document.querySelectorAll('.progress-bar-tab .nav-link')
                .forEach(el => el.classList.remove('active'));
            this.classList.add('active');
        });
    });

</script>

<!-- Start page title -->
<div class="row mb-3">
    <div class="col-12">
        <div class="page-title-box d-sm-flex align-items-center justify-content-between">
            <h4 class="mb-sm-0"><?=$page_title ?? ''?></h4>

            <div class="page-title-right">
                <ol class="breadcrumb m-0">
                    <li class="breadcrumb-item"><a href="<?=base_url('centre/dashboard/index')?>">Dashboard</a></li>
                    <li class="breadcrumb-item"><a href="<?=base_url('centre/cohorts/index')?>">Cohort</a></li>
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
                
                <ul class="nav nav-pills progress-bar-tab custom-nav d-flex justify-content-between align-items-center mb-3" role="tablist">
                    <li class="nav-item d-flex align-items-center" role="presentation">
                        <button class="nav-link rounded-pill active" data-progressbar="custom-progress-bar" id="pills-basic-info-tab" data-bs-toggle="pill" data-bs-target="#pills-basic-info" type="button" role="tab" aria-controls="pills-basic-info" aria-selected="true">1</button>
                        <span class="progress-label ms-2">Basic Info</span>
                    </li>
                    <li class="nav-item d-flex align-items-center" role="presentation">
                        <button class="nav-link rounded-pill" data-progressbar="custom-progress-bar" id="pills-learners-info-tab" data-bs-toggle="pill" data-bs-target="#pills-learners-info" type="button" role="tab" aria-controls="pills-learners-info" aria-selected="false">2</button>
                        <span class="progress-label ms-2">Learners</span>
                    </li>
                    <li class="nav-item d-flex align-items-center" role="presentation">
                        <button class="nav-link rounded-pill" data-progressbar="custom-progress-bar" id="pills-live-sessions-info-tab" data-bs-toggle="pill" data-bs-target="#pills-live-sessions-info" type="button" role="tab" aria-controls="pills-live-sessions-info" aria-selected="false">3</button>
                        <span class="progress-label ms-2">Live Sessions</span>
                    </li>
                    <li class="nav-item d-flex align-items-center" role="presentation">
                        <button class="nav-link rounded-pill" data-progressbar="custom-progress-bar" id="pills-activities-info-tab" data-bs-toggle="pill" data-bs-target="#pills-activities-info" type="button" role="tab" aria-controls="pills-activities-info" aria-selected="false">4</button>
                        <span class="progress-label ms-2">Activities/Assignments</span>
                    </li>
                    <li class="nav-item d-flex align-items-center" role="presentation">
                        <button class="nav-link rounded-pill" data-progressbar="custom-progress-bar" id="pills-announcements-info-tab" data-bs-toggle="pill" data-bs-target="#pills-announcements-info" type="button" role="tab" aria-controls="pills-announcements-info" aria-selected="false">5</button>
                        <span class="progress-label ms-2">Announcements</span>
                    </li>
                </ul>


                <div class="tab-content">
                   
                    <div class="tab-pane fade show active" id="pills-basic-info" role="tabpanel" aria-labelledby="pills-basic-info-tab">
                       
                        <h4>Basic Info</h4>
                        
                        <?= $this->include('Centre/Cohorts/ajax_add'); ?>
                
                    </div>
                    <!-- end tab pane -->
                     
                    <div class="tab-pane fade" id="pills-learners-info" role="tabpanel" aria-labelledby="pills-learners-info-tab">
                        <form action="<?= base_url('centre/Cohorts/add_cohort_students') ?>" id="addCohortLearnersForm"  method="post" enctype="multipart/form-data">
                            
                            <input type="hidden" id="cohort_id" name="cohort_id">

                            <div class="col-lg-8">
                                <div class="mb-3">
                                    <label class="form-label" for="student_ids">Choose Learners<span class="required text-danger">*</span></label>
                                    <select class="form-select select2 shadow-none" multiple   name="student_id[]" id="student_ids" required>
                                        <option value="">Select Learners</option>
                                        <?php foreach ($students as $student): ?>
                                            <option value="<?=$student['id']?>"><?=$student['name']?></option>
                                        <?php endforeach; ?>
                                    </select>
                                </div>
                            </div>
                            <div class="d-flex align-items-start gap-3 mt-4">
                                <button type="button" id="learnersSubmitBtn" class="btn btn-success btn-label right ms-auto nexttab"><i class="ri-arrow-right-line label-icon align-middle fs-16 ms-2"></i>Save & Next</button>
                            </div>
                        </form>

                        


                    </div>
                     <!-- end tab pane -->
                     
                    <div class="tab-pane fade " id="pills-live-sessions-info" role="tabpanel" aria-labelledby="pills-live-sessions-info-tab">
                       
                        <h4>Live Sessions</h4>
                        
                        <?= $this->include('Centre/Cohorts/add_live_class'); ?>
                        
                    </div>
                    <!-- end tab pane -->

                    <div class="tab-pane fade" id="pills-activities-info" role="tabpanel" aria-labelledby="pills-activities-info-tab">
                        
                        <h4>Activities</h4>
                        
                        <?= $this->include('Centre/Cohorts/add_assignments'); ?>

                    </div>
                    <!-- end tab pane -->
                    
                    <div class="tab-pane fade" id="pills-announcements-info" role="tabpanel" aria-labelledby="pills-announcements-info-tab">
                        
                        <h4>Announcements</h4>
                        
                        <?= $this->include('Centre/Cohorts/add_announcements'); ?>

                    </div>
                    <!-- end tab pane -->
                </div>
                <!-- end tab content -->
            </div>
            <!-- end card body -->
        </div>
        <!-- end card -->
    </div>
    <!-- end col -->
</div>
<!-- end row -->


<script>
   
    $(document).ready(function () {

        // // basic add
        // $("#basicSubmitBtn").on("click", function (e) {
        //     e.preventDefault();
            
        //     var form = document.getElementById("addCohortBasicForm");
        //     var isValid = true;
        
        //     $(form).find("input, select, textarea").each(function () {
        //         if ($(this).prop("readonly")) return;
        //         if (!$(this).val().trim()) {
        //             $(this).attr("required", "required");
        //             isValid = false;
        //         } else {
        //             $(this).removeAttr("required");
        //         }
        //     });
        
        //     if (!isValid) {
        //         Swal.fire({
        //             icon: "warning",
        //             title: "Validation Error",
        //             text: "Please fill all required fields.",
        //         });
        //         return;
        //     }
    
        //     var routeUrl = $(form).attr("action");
            
            
        //     ajax(form,routeUrl,$("#pills-learners-info-tab"));
            
        // });
        

        //modified basic add
        $("#basicSubmitBtn").on("click", function (e) {
            e.preventDefault();

            var form = document.getElementById("addCohortBasicForm");
            var isValid = true;

            $(form).find("input, select, textarea").each(function () {
                if ($(this).prop("readonly")) return;
                if (!$(this).val().trim()) {
                    $(this).attr("required", "required");
                    isValid = false;
                } else {
                    $(this).removeAttr("required");
                }
            });

            if (!isValid) {
                Swal.fire({
                    icon: "warning",
                    title: "Validation Error",
                    text: "Please fill all required fields.",
                });
                return;
            }

            var routeUrl = $(form).attr("action");

            // Submit form via AJAX first
            $.ajax({
                url: routeUrl,
                type: "POST",
                data: $(form).serialize(),
                success: function (res) {
                        if (res.success) {
                            // Set the hidden cohort_id for the next form
                            //$("#cohort_id").val(res.data.cohort_id);
                            if (res.success && res.data && res.data.cohort_id) {
                                const cohortId = res.data.cohort_id;
                                $('#addCohortLearnersForm input[name="cohort_id"]').val(cohortId);
                                $('#announcementsAddForm input[name="cohort_id"]').val(cohortId);
                                $('#addCohortLiveClassForm input[name="cohort_id"]').val(cohortId);
                                $('#assignmentForm input[name="cohort_id"]').val(cohortId);
                            }

                            // After saving the cohort, fetch new student list
                            $.get("<?= base_url('centre/cohorts/get_students_not_in_subject') ?>", 
                                { cohort_id: res.data.cohort_id }, 
                                function (data) {
                                    let $select = $("#student_ids");
                                    $select.empty(); // clear old options
                                    $select.append('<option value="">Select Learners</option>');
                                    
                                    if (data.length > 0) {
                                        data.forEach(function (student) {
                                            $select.append(`<option value="${student.user_id}">${student.name}</option>`);
                                        });
                                    } else {
                                        $select.append('<option disabled>No students available</option>');
                                    }

                                    $select.trigger("change"); // refresh select2 UI
                                }, 
                                "json"
                            );

                            // Move to learners tab
                            $('#pills-learners-info-tab').tab('show');

                        } else {
                            Swal.fire({
                                icon: "error",
                                title: "Error",
                                text: res.message
                            });
                        }
                    }

            });
        });


        // learners add
        $("#learnersSubmitBtn").on("click", function (e) {
            e.preventDefault();
           
            var form = document.getElementById("addCohortLearnersForm");
            
            var routeUrl = "<?=base_url('centre/Cohorts/add_cohort_students')?>";
            
            ajax(form,routeUrl,$("#pills-live-sessions-info-tab"));
            
        });
        
        // live class add
        $("#liveClassSubmitBtn").on("click", function (e) {
            e.preventDefault();
            
            var form = document.getElementById("addCohortLiveClassForm");
            
            var routeUrl = "<?=base_url('centre/Live_class/add')?>";
            
            ajax(form,routeUrl,$("#pills-activities-info-tab"));
            
        });
        
        // activities add
        $("#activitiesSubmitBtn").on("click", function (e) {
            e.preventDefault();
            
            var form = document.getElementById("assignmentForm");
            
            var routeUrl = "<?=base_url('centre/Assignment/add')?>";
            
            ajax(form,routeUrl,$("#pills-announcements-info-tab"));
            
        });
        
        // announcements add
        $("#announcementsSubmitBtn").on("click", function (e) {
            e.preventDefault();
            
            var form = document.getElementById("announcementsAddForm");
            
            var routeUrl = "<?=base_url('centre/Cohorts/add_cohort_announcements')?>";
            
            var navigate = "<?=base_url('centre/Cohorts/index')?>";
            
            ajax(form,routeUrl,navigate);
            
        });
        
        function ajax(form,routeUrl,triggerId) {
            var formData = new FormData(form);
            $.ajax({
                url: routeUrl, 
                type: "POST",
                data: formData,
                processData: false,
                contentType: false,
                dataType: "json",
                success: function (response) {
                    if (response.success) { 
                        Swal.fire({
                            icon: "success",
                            title: "Success!",
                            text: response.message,
                            timer: 2000,
                            showConfirmButton: false
                        }).then(() => {
                            form.reset(); 
                            $(form).find("select").val(null).trigger("change");
                            
                            if (response.data && response.data['cohort_id']) {
                                const cohortId = response.data['cohort_id'];    
                                $('#addCohortLearnersForm input[name="cohort_id"]').val(cohortId);
                                $('#announcementsAddForm input[name="cohort_id"]').val(cohortId);;
                                $('#addCohortLiveClassForm input[name="cohort_id"]').val(cohortId);
                                $('#assignmentForm input[name="cohort_id"]').val(cohortId);
                            }
                            
                            triggerId.trigger("click"); 
                        });
                    } else {
                        Swal.fire({
                            icon: "error",
                            title: "Error!",
                            text: response.message || "Something went wrong!",
                        });
                    }
                },
                error: function () {
                    Swal.fire({
                        icon: "error",
                        title: "Error!",
                        text: "Failed to submit data. Please try again.",
                    });
                }
            });  
        }
        
        function resetForm() {
            $("#addCohortLearnersForm")[0].reset();
            $("#student_ids").val(null).trigger("change"); 
        }
    
    });
    
</script>




